import type {Config,Operation} from '../lib/types';
const operations:Operation[]=['add','subtract','multiply','divide'];
const labels:Record<Operation,string>={add:'Addition',subtract:'Subtraction',multiply:'Multiplication',divide:'Division'};
export default function ArithmeticRanges({config,onChange}:{config:Config;onChange:(config:Config)=>void}){
  function rangeInputs(op:Operation,second:boolean,label:string){
    const base=config.operations[op];
    const value=second?config.secondRanges?.[op as 'multiply'|'divide']||base||[2,12]:base||[2,12];
    return <div className="range"><span>{label}</span>{[0,1].map(i=><input key={i} type="number" min="1" max="10000" disabled={!base} aria-label={`${labels[op]} ${label} ${i?'maximum':'minimum'}`} value={value[i]} onChange={event=>{
      const next:[number,number]=[...value];next[i]=Number(event.target.value);
      onChange(second?{...config,secondRanges:{...config.secondRanges,[op]:next}}:{...config,operations:{...config.operations,[op]:next}});
    }}/>)}</div>;
  }
  return <div className="operation-groups">{operations.map(op=><fieldset className="operation-group" key={op}>
    <legend><label><input type="checkbox" checked={!!config.operations[op]} onChange={event=>{
      const next={...config.operations};if(event.target.checked)next[op]=[2,12];else delete next[op];onChange({...config,operations:next});
    }}/>{labels[op]}</label></legend>
    <div className="rangeshead"><span>Range</span><span>Min</span><span>Max</span></div>
    {op==='multiply'?<>{rangeInputs(op,false,'First factor')}{rangeInputs(op,true,'Second factor')}</>:
      op==='divide'?<>{rangeInputs(op,true,config.divisionRangeMode==='quotient'?'Answer (legacy)':'Dividend')}{rangeInputs(op,false,'Divisor')}</>:rangeInputs(op,false,'Both values')}
    {op==='divide'&&config.divisionRangeMode==='quotient'&&<p className="hint">This older preset uses an answer range. <button type="button" onClick={()=>onChange({...config,divisionRangeMode:'dividend',secondRanges:{...config.secondRanges,divide:[2,100]}})}>Use dividend range</button></p>}
  </fieldset>)}</div>;
}
