import unittest
from unittest.mock import patch
import repository_maintenance as m

class MaintenanceTests(unittest.TestCase):
    def setUp(self):
        self.sha="a"*40
        self.base="b"*40
        self.merge="c"*40
        self.branch={"name":"design/test","commit":{"sha":self.sha},"protected":False}
        self.pr={"number":9,"state":"closed","merged_at":None,
                 "head":{"ref":"design/test","sha":self.sha,"repo":{"full_name":m.REPO}},
                 "base":{"ref":"main","repo":{"full_name":m.REPO}}}
        self.trees={self.merge:("tree",self.base)}
    def decide(self, opened=None):
        return m.eligible_branch(self.branch,self.pr,opened or set(),self.trees,
                                 lambda _: "tree",lambda _:self.base)
    def test_identical_squash_tree(self):
        self.assertIn("identical tree",self.decide())
    def test_merged_pr(self):
        self.pr.update(merged_at="time",merge_commit_sha=self.merge)
        self.assertIn("merged PR",self.decide())
    def test_open_pr(self):
        self.assertIsNone(self.decide({"design/test"}))
    def test_protected(self):
        self.branch["protected"]=True
        self.assertIsNone(self.decide())
    def test_main(self):
        self.branch["name"]="main"
        self.pr["head"]["ref"]="main"
        self.assertIsNone(self.decide())
    def test_unknown_prefix(self):
        self.branch["name"]="work"
        self.pr["head"]["ref"]="work"
        self.assertIsNone(self.decide())
    def test_head_changed(self):
        self.branch["commit"]["sha"]="d"*40
        self.assertIsNone(self.decide())
    def test_unmerged_different_tree(self):
        self.trees[self.merge]=("different",self.base)
        self.assertIsNone(self.decide())
    def test_wrong_parent(self):
        self.trees[self.merge]=("tree","e"*40)
        self.assertIsNone(self.decide())
    def test_fork(self):
        self.pr["head"]["repo"]["full_name"]="other/repo"
        self.assertIsNone(self.decide())
    def test_explicit_superseded_branch(self):
        successor={"number":18,"state":"closed","merged_at":"time","merge_commit_sha":self.merge,
                   "head":{"ref":"feature/new","sha":"d"*40,"repo":{"full_name":m.REPO}},
                   "base":{"ref":"main","repo":{"full_name":m.REPO}}}
        with patch.object(m,"SUPERSEDED",{9:("design/test",self.sha,18)}):
            def decide(opened=set(),quality=True,tree="tree"):
                return m.superseded_branch(self.branch,self.pr,opened,self.trees,[successor],
                                           lambda _:tree,lambda _:quality)
            self.assertIn("verified PR #18",decide())
            self.assertIsNone(decide({"design/test"}))
            self.assertIsNone(decide(quality=False))
            self.assertIsNone(decide(tree="different"))
            successor["merged_at"]=None
            self.assertIsNone(decide())
            successor["merged_at"]="time"
            self.branch["commit"]["sha"]="e"*40
            self.assertIsNone(decide())
    def test_verified_commit_tree(self):
        tree_sha="f"*40
        with patch.object(m,"api",return_value={"sha":self.sha,"tree":{"sha":tree_sha}}) as get:
            self.assertEqual(m.verified_commit_tree(self.sha),tree_sha)
            get.assert_called_once_with("git/commits/"+self.sha)
        with patch.object(m,"api",return_value={"sha":self.base,"tree":{"sha":tree_sha}}):
            with self.assertRaises(RuntimeError):
                m.verified_commit_tree(self.sha)
        with patch.object(m,"api",return_value={"sha":self.sha,"tree":{"sha":"bad"}}):
            with self.assertRaises(RuntimeError):
                m.verified_commit_tree(self.sha)
        with self.assertRaises(RuntimeError):
            m.verified_commit_tree("main")
    def test_tag_states(self):
        ref="refs/tags/v0.0.12"
        self.assertEqual(m.tag_status({}, "0.0.12",self.sha),"missing")
        self.assertEqual(m.tag_status({ref:self.sha}, "0.0.12",self.sha),"ok")
        self.assertEqual(m.tag_status({ref:self.merge,ref+"^{}":self.sha}, "0.0.12",self.sha),"ok")
        self.assertEqual(m.tag_status({ref:self.merge}, "0.0.12",self.sha),"conflict")
    def test_version_plan(self):
        chain=[self.sha,*reversed(list(m.HISTORICAL.values()))]
        versions={sha:v for v,sha in m.HISTORICAL.items()}
        versions[self.sha]="0.0.13"
        root=m.HISTORICAL["0.0.0"]
        del versions[root]
        subject=lambda c: "v0.0.0 — Initial" if c==root else "v0.0.13 — Maintenance"
        self.assertEqual(m.tag_plan(chain,versions.__getitem__,subject)["0.0.13"],self.sha)
        with self.assertRaises(RuntimeError):
            m.tag_plan(chain,versions.__getitem__,lambda _: "wrong subject")
    def test_root_must_be_exact_initial_commit(self):
        chain=list(reversed(list(m.HISTORICAL.values())))
        versions={sha:v for v,sha in m.HISTORICAL.items() if v!="0.0.0"}
        with self.assertRaises(RuntimeError):
            m.tag_plan(chain+["f"*40],versions.__getitem__,lambda _: "v0.0.0 — Initial")
    def test_later_historical_version_must_match(self):
        chain=list(reversed(list(m.HISTORICAL.values())))
        versions={sha:v for v,sha in m.HISTORICAL.items() if v!="0.0.0"}
        versions[m.HISTORICAL["0.0.1"]]="0.0.99"
        with self.assertRaises(RuntimeError):
            m.tag_plan(chain,versions.__getitem__,lambda _: "v0.0.0 — Initial")
    def test_real_history(self):
        # CI checks real, immutable historical commits too (not only fixtures).
        chain=m.first_parent_chain(m.ANCHOR)
        actual=m.tag_plan(chain,m.ver,lambda c:m.git("show","-s","--format=%s",c))
        self.assertEqual(actual,m.HISTORICAL)
    def test_historical_map_must_match(self):
        with self.assertRaises(RuntimeError):
            m.tag_plan([m.ANCHOR],lambda _: "0.0.12",lambda _: "")

if __name__=="__main__":
    unittest.main()
