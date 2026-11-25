const MAX=1e12;
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const safe=(condition)=>{if(!condition)throw new RangeError('Проверьте числа и допустимые диапазоны.');};
export function realReturn(capital,nominal,inflation){
 safe(finite(capital,0,MAX)&&finite(nominal,-100,100000)&&finite(inflation,-99.99,100000));
 const nominalValue=capital*(1+nominal/100), realValue=nominalValue/(1+inflation/100),rate=((1+nominal/100)/(1+inflation/100)-1)*100;
 return {nominalValue,realValue,rate,delta:realValue-capital};
}
export function reserveCalc(income,expenses,reserve,shock){
 safe(finite(income,0,MAX)&&finite(expenses,0.01,MAX)&&finite(reserve,0,MAX)&&finite(shock,0,MAX));
 const remaining=Math.max(0,reserve-shock),gap=Math.max(0,shock-reserve),surplus=income-expenses;
 return {before:reserve/expenses,months:remaining/expenses,remaining,gap,surplus,recovery:shock===0?0:surplus>0?shock/surplus:null};
}
