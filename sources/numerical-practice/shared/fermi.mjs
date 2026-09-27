/** @type {Record<'Easy'|'Medium'|'Hard', import('../src/lib/types').FermiConfig>} */
export const fermiDefaults={
 Easy:{rounds:5,roundSeconds:60,questionLevel:1,questionSet:'mixed',precisionWeight:0.75,speedWeight:0.2},
 Medium:{rounds:8,roundSeconds:45,questionLevel:2,questionSet:'mixed',precisionWeight:1,speedWeight:0.25},
 Hard:{rounds:10,roundSeconds:30,questionLevel:3,questionSet:'mixed',precisionWeight:1.25,speedWeight:0.3}
};
export function validFermiConfig(c){
 return !!c&&Number.isInteger(c.rounds)&&c.rounds>=3&&c.rounds<=20
  &&Number.isInteger(c.roundSeconds)&&c.roundSeconds>=10&&c.roundSeconds<=180
  &&Number.isInteger(c.questionLevel)&&c.questionLevel>=1&&c.questionLevel<=3
  &&['mixed','benchmarks','scenarios'].includes(c.questionSet)
  &&Number.isFinite(c.precisionWeight)&&c.precisionWeight>=0.5&&c.precisionWeight<=2
  &&Number.isFinite(c.speedWeight)&&c.speedWeight>=0&&c.speedWeight<=0.5;
}
const nasaEarth='https://science.nasa.gov/earth/facts/';
const nasaMoon='https://science.nasa.gov/moon/facts/';
const nasaSun='https://science.nasa.gov/sun/facts/';
// Rounded science benchmarks were checked against NASA on 2026-09-25.
// Unit-conversion benchmarks follow the explicit definitions in their prompts.
export const fermiBenchmarks=[
 ['chess-grains',3,'How many grains are on square 20 if square 1 has one grain and each next square doubles it?','grains',524288,'2¹⁹ = 524,288.','Calculated doubling model',''],
 ['handshakes',2,'How many handshakes occur if each of 100 people shakes hands with every other person once?','handshakes',4950,'100 × 99 / 2 = 4,950.','Calculated pair count',''],
 ['kilometre-mm',1,'How many millimetres are in one kilometre?','mm',1000000,'1,000 metres × 1,000 millimetres/metre.','Metric length definition',''],
 ['cubic-cm',1,'How many cubic centimetres are in one cubic metre?','cubic cm',1000000,'100 × 100 × 100 = 1,000,000.','Metric volume definition',''],
 ['binary-address',3,'How many distinct 32-bit binary strings exist?','strings',4294967296,'Two choices in each of 32 positions: 2³².','Calculated binary count',''],
 ['deck-orders-five',3,'How many ordered five-card draws are possible from a 52-card deck without replacement?','draws',311875200,'52 × 51 × 50 × 49 × 48 = 311,875,200.','Calculated ordered sample count',''],
 ['minutes-month',1,'How many minutes are in exactly 30 days?','minutes',43200,'30 × 24 × 60 = 43,200.','Calculated unit conversion',''],
 ['grid-rectangles',2,'How many rectangles can be formed using grid lines on a 10 × 10 square grid?','rectangles',3025,'Choose two of 11 horizontal and two of 11 vertical lines: 55 × 55.','Calculated geometric count',''],
 ['seconds-day',1,'How many seconds are in one 24-hour day?','seconds',86400,'24 × 60 × 60 = 86,400.','Calculated from the stated day length',''],
 ['minutes-week',1,'How many minutes are in one seven-day week?','minutes',10080,'7 × 24 × 60 = 10,080.','Calculated unit conversion',''],
 ['seconds-year',2,'How many seconds are in a 365-day year?','seconds',31536000,'365 × 24 × 60 × 60 = 31,536,000.','Calculated; leap days excluded',''],
 ['hours-decade',1,'How many hours are in ten years, assuming 365 days per year?','hours',87600,'10 × 365 × 24 = 87,600.','Calculated; leap days excluded',''],
 ['litres-cube',1,'How many litres fit in a cube with inside edges of one metre?','litres',1000,'1 cubic metre = 1,000 litres.','Metric volume definition',''],
 ['bits-mib',2,'How many bits are in one mebibyte (MiB)?','bits',8388608,'1 MiB = 2²⁰ bytes; each byte has 8 bits. Total = 8,388,608.','Binary unit definition',''],
 ['squares-board',2,'How many squares of all sizes appear on an 8 × 8 grid?','squares',204,'1² + 2² + … + 8² = 204.','Calculated geometric count',''],
 ['seconds-million',3,'How many days are in one billion seconds, using 24-hour days?','days',1e9/86400,'1,000,000,000 ÷ (24 × 60 × 60) ≈ 11,574.074 days.','Calculated unit conversion',''],
 ['earth-diameter',1,'Estimate Earth’s equatorial diameter.','km',12756,'The reference equatorial diameter is approximately 12,756 km.','NASA Earth facts · rounded benchmark',nasaEarth],
 ['moon-distance',2,'Estimate the mean distance from Earth to the Moon.','km',384400,'The reference mean Earth–Moon distance is approximately 384,400 km.','NASA Moon facts · rounded benchmark',nasaMoon],
 ['sun-diameter',3,'Estimate the Sun’s diameter.','km',1400000,'The reference diameter is approximately 1.4 million km.','NASA Sun facts · rounded benchmark',nasaSun],
 ['moon-radius',2,'Estimate the Moon’s radius.','km',1740,'The reference radius is approximately 1,740 km.','NASA Moon facts · rounded benchmark',nasaMoon],
 ['sun-distance',3,'Estimate the mean Earth–Sun distance.','km',150000000,'The rounded reference distance is approximately 150 million km.','NASA Earth facts · rounded benchmark',nasaEarth],
 ['sunlight-time',2,'Estimate how long sunlight takes to reach Earth.','minutes',8,'The rounded reference travel time is approximately 8 minutes.','NASA Earth facts · rounded benchmark',nasaEarth],
].map(([id,level,prompt,unit,target,explanation,sourceLabel,sourceUrl])=>({id,level,prompt,unit,target,explanation,sourceLabel,sourceUrl,kind:'benchmark'}));

const format=n=>n.toLocaleString('en-US',{maximumFractionDigits:3});
const pick=(items,random)=>items[Math.floor(random()*items.length)];
export const scenarioIds=['coffee','water','transit','requests','storage','seats','pages','energy','payments','packing','hospital','elevators','food','bandwidth','commute','solar','rainwater','warehouse','laundry','charging','emails','paint'];
/** @returns {import('../src/lib/types').FermiQuestion} */
export function scenarioQuestion(id,level,random=Math.random){
 const scale=[1,10,100][level-1];const a=pick([2,3,4,5,8],random),b=pick([12,15,20,25,30],random);
 let prompt,unit,target,explanation,assumptions;
 if(id==='coffee'){
  const residents=a*10000*scale,share=b,days=pick([250,300,365],random);
  prompt='Estimate annual takeaway coffees sold in this modeled town.';unit='coffees';
  assumptions=`${format(residents)} residents; ${share}% buy one coffee on each of ${days} days per year.`;
  target=residents*share/100*days;explanation=`Residents × buyer share × buying days = ${format(residents)} × ${share}/100 × ${days}.`;
 }else if(id==='water'){
  const people=a*5000*scale,litres=b*5;
  prompt='Estimate one day of household water use in this modeled town.';unit='litres';assumptions=`${format(people)} residents, each using ${litres} litres that day.`;
  target=people*litres;explanation=`Residents × litres per resident = ${format(people)} × ${litres}.`;
 }else if(id==='transit'){
  const people=a*20000*scale,share=b;
  prompt='Estimate weekday public-transport journeys in this modeled city.';unit='journeys';assumptions=`${format(people)} residents; ${share}% commute by public transport; two one-way journeys per commuter.`;
  target=people*share/100*2;explanation=`Population × commuter share × two journeys = ${format(people)} × ${share}/100 × 2.`;
 }else if(id==='requests'){
  const rate=a*b*scale;
  prompt='Estimate requests handled by this service in one day.';unit='requests';assumptions=`A constant ${format(rate)} requests per second for 24 hours; no downtime.`;
  target=rate*86400;explanation=`Requests/second × seconds/day = ${format(rate)} × 86,400.`;
 }else if(id==='storage'){
  const count=a*10000*scale,size=b*100;
  prompt='Estimate storage occupied by these records, excluding overhead.';unit='MB';assumptions=`${format(count)} records of ${format(size)} bytes each. Use decimal MB = 1,000,000 bytes.`;
  target=count*size/1e6;explanation=`Records × bytes per record ÷ 1,000,000 = ${format(count)} × ${format(size)} ÷ 1,000,000.`;
 }else if(id==='seats'){
  const venues=a*scale,seats=b*10,shows=3,occupancy=75;
  prompt='Estimate daily ticket sales for this cinema group.';unit='tickets';assumptions=`${venues} cinemas, ${seats} seats each, ${shows} screenings per day, ${occupancy}% occupancy.`;
  target=venues*seats*shows*occupancy/100;explanation=`Cinemas × seats × shows × occupancy = ${venues} × ${seats} × 3 × 0.75.`;
 }else if(id==='pages'){
  const books=a*100*scale,pages=b*10,words=250;
  prompt='Estimate words in this modeled library collection.';unit='words';assumptions=`${format(books)} books, ${pages} pages per book, ${words} words per page.`;
  target=books*pages*words;explanation=`Books × pages × words = ${format(books)} × ${pages} × 250.`;
 }else if(id==='energy'){
  const devices=a*100*scale,watts=b*10,hours=8;
  prompt='Estimate electricity consumed by these devices in one workday.';unit='kWh';assumptions=`${format(devices)} devices, each drawing ${watts} W continuously for ${hours} hours.`;
  target=devices*watts*hours/1000;explanation=`Devices × watts × hours ÷ 1,000 = ${format(devices)} × ${watts} × 8 ÷ 1,000.`;
 }else if(id==='payments'){
  const stores=a*100*scale,transactions=b*10,average=15;
  prompt='Estimate daily payment volume for this modeled store network.';unit='currency units';assumptions=`${format(stores)} stores, ${transactions} purchases per store per day, average purchase ${average} currency units.`;
  target=stores*transactions*average;explanation=`Stores × purchases × value = ${format(stores)} × ${transactions} × 15.`;
 }else if(id==='packing'){
  const length=a*10,width=b,height=10,side=5;
  prompt='Estimate the number of small cubes that fit in this rectangular box.';unit='cubes';assumptions=`Inside dimensions ${length} × ${width} × ${height} cm. Each cube has ${side} cm edges, axis-aligned, with no gaps except leftover edge space.`;
  target=Math.floor(length/side)*Math.floor(width/side)*Math.floor(height/side);explanation=`Whole cubes along each edge: floor(${length}/5) × floor(${width}/5) × floor(${height}/5).`;
 }else if(id==='hospital'){
  const beds=a*100*scale,occupancy=b+60,stay=5;prompt='Estimate annual patient admissions for this modeled hospital network.';unit='admissions';assumptions=`${format(beds)} beds, ${occupancy}% average occupancy, 365 days, average stay ${stay} days. Ignore seasonal variation.`;target=beds*occupancy/100*365/stay;explanation=`Beds × occupancy × days ÷ stay = ${beds} × ${occupancy}/100 × 365 ÷ ${stay}.`;
 }else if(id==='elevators'){
  const lifts=a*scale,people=b,trips=20,hours=10;prompt='Estimate daily passenger capacity of these modeled elevators.';unit='passenger trips';assumptions=`${lifts} elevators, ${people} passengers per trip, ${trips} trips/hour for ${hours} hours; all trips full.`;target=lifts*people*trips*hours;explanation=`Elevators × passengers/trip × trips/hour × hours = ${lifts} × ${people} × 20 × 10.`;
 }else if(id==='food'){
  const meals=a*1000*scale,grams=b*10;prompt='Estimate dry rice required for these meals.';unit='tonnes';assumptions=`${format(meals)} meals, ${grams} grams of dry rice per meal. One tonne = 1,000,000 grams.`;target=meals*grams/1e6;explanation=`Meals × grams per meal ÷ 1,000,000 = ${meals} × ${grams} ÷ 1,000,000.`;
 }else if(id==='bandwidth'){
  const users=a*100*scale,rate=b,minutes=30;prompt='Estimate data transferred by these simultaneous video streams.';unit='GB';assumptions=`${users} streams at ${rate} megabits/second each for ${minutes} minutes. Eight bits/byte; decimal GB; ignore overhead.`;target=users*rate*minutes*60/8/1000;explanation=`Streams × Mbps × seconds ÷ 8 ÷ 1,000 = ${users} × ${rate} × 1,800 ÷ 8,000.`;
 }else if(id==='commute'){
  const workers=a*1000*scale,minutes=b,days=250;prompt='Estimate annual time spent on these modeled commutes.';unit='person-hours';assumptions=`${workers} workers, ${minutes} minutes each way, two journeys/day, ${days} workdays/year.`;target=workers*minutes*2*days/60;explanation=`Workers × minutes × 2 × workdays ÷ 60.`;
 }else if(id==='solar'){
  const panels=a*100*scale,watts=b*20,sunHours=5;prompt='Estimate daily energy from this modeled solar array.';unit='kWh';assumptions=`${panels} panels rated ${watts} W, five equivalent full-power hours/day, 80% net output after losses.`;target=panels*watts*sunHours*0.8/1000;explanation=`Panels × rated watts × hours × 0.8 ÷ 1,000.`;
 }else if(id==='rainwater'){
  const area=a*100*scale,mm=b,efficiency=80;prompt='Estimate rainwater collected from this roof.';unit='litres';assumptions=`${area} square metres of roof, ${mm} mm rainfall, ${efficiency}% collection. One mm over one square metre is one litre.`;target=area*mm*0.8;explanation=`Area × rainfall × collection fraction = ${area} × ${mm} × 0.8.`;
 }else if(id==='warehouse'){
  const volume=a*1000*scale,box=b/100,usable=60;prompt='Estimate boxes held in this modeled storage volume.';unit='boxes';assumptions=`${volume} cubic metres gross volume, ${usable}% usable, each box occupies ${box} cubic metres. Ignore packing geometry.`;target=volume*0.6/box;explanation=`Gross volume × usable fraction ÷ volume per box.`;
 }else if(id==='laundry'){
  const machines=a*10*scale,kg=b,hours=12,cycle=1.5;prompt='Estimate daily laundry throughput.';unit='kg';assumptions=`${machines} machines, ${kg} kg/load, each runs 12 hours with 1.5-hour cycles; no turnaround time.`;target=machines*kg*hours/cycle;explanation=`Machines × kg/load × hours ÷ cycle length.`;
 }else if(id==='charging'){
  const cars=a*100*scale,kwh=b,kw=10;prompt='Estimate total charger-hours needed for these vehicles.';unit='charger-hours';assumptions=`${cars} vehicles each need ${kwh} kWh; each charger supplies a constant ${kw} kW. Ignore losses.`;target=cars*kwh/kw;explanation=`Vehicles × energy per vehicle ÷ charger power.`;
 }else if(id==='emails'){
  const staff=a*1000*scale,emails=b,size=50;prompt='Estimate one year of stored outbound email for this organization.';unit='GB';assumptions=`${staff} staff, ${emails} emails/workday each, 250 workdays, ${size} decimal kB/email. One GB = 1,000,000 kB; exclude attachments and copies.`;target=staff*emails*250*size/1e6;explanation=`Staff × daily emails × days × kB/email ÷ 1,000,000.`;
 }else if(id==='paint'){
  const homes=a*100*scale,area=b*10,coverage=10;prompt='Estimate paint needed for this housing project.';unit='litres';assumptions=`${homes} homes, ${area} square metres painted/home, two coats, coverage ${coverage} square metres/litre per coat. Ignore waste.`;target=homes*area*2/coverage;explanation=`Homes × area × coats ÷ coverage.`;
 }else throw Error('Unknown scenario.');
 return {id,kind:'scenario',prompt,unit,target,explanation,assumptions,sourceLabel:'Modeled benchmark from the stated assumptions',sourceUrl:''};
}
const recentFermiTemplates=new Map();
/** Sample without repeating a template until its eligible pool is exhausted.
 * @param {import('../src/lib/types').FermiConfig} config
 * @returns {import('../src/lib/types').FermiQuestion[]} */
export function createFermiQuestions(config,random=Math.random){
 if(!validFermiConfig(config))throw Error('Invalid Fermi settings.');
 const references=fermiBenchmarks.filter(q=>Number(q.level)<=config.questionLevel);
 const templates=[...(config.questionSet==='scenarios'?[]:references.map(q=>({id:q.id,reference:q}))),...(config.questionSet==='benchmarks'?[]:scenarioIds.map(id=>({id,reference:null})))];
 const profile=`${config.questionSet}:${config.questionLevel}`;const previous=recentFermiTemplates.get(profile)||[];
 let bag=[];const questions=[];
 for(let i=0;i<config.rounds;i++){
  if(!bag.length)bag=[...templates];
  const fresh=bag.filter(item=>!previous.includes(item.id));const choices=fresh.length?fresh:bag;
  let index=bag.indexOf(choices[Math.floor(random()*choices.length)]);
  if(bag.length>1&&i>0&&bag[index].id===questions[i-1].id)index=(index+1)%bag.length;
  const chosen=bag.splice(index,1)[0];
  questions.push(chosen.reference?{...chosen.reference,assumptions:'Use the fixed reference benchmark. Approximate science values are rounded.'}:scenarioQuestion(chosen.id,config.questionLevel,random));
 }
 recentFermiTemplates.set(profile,questions.map(q=>q.id));
 return questions;
}
export function parseEstimate(text){
 const value=text.trim().toLowerCase();
 const match=value.match(/^((?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([kmbt])?$/);
 if(!match)return null;
 const number=Number(match[1].replace(/,/g,''))*({k:1e3,m:1e6,b:1e9,t:1e12}[match[2]]||1);
 return Number.isFinite(number)&&number>0&&number<=1e18?number:null;
}
export function intervalError(low,high){return !Number.isFinite(low)||!Number.isFinite(high)||low<=0||high>1e18?'Enter positive bounds up to 1e18.':low>=high?'The lower bound must be below the upper bound.':'';}
/** @returns {import('../src/lib/types').FermiOutcome} */
export function scoreInterval(target,low,high,responseMs,config,timedOut=false){
 if(!Number.isFinite(target)||target<=0||!validFermiConfig(config)||!Number.isFinite(responseMs)||responseMs<0)throw Error('Invalid interval scoring inputs.');
 if(timedOut)return {hit:false,score:0,precision:0,speedFactor:0,relativeWidth:null,timedOut:true};
 const error=intervalError(low,high);if(error)throw Error(error);
 const hit=low<=target&&target<=high;
 const relativeWidth=(high-low)/target;
 const precision=1/Math.pow(1+relativeWidth,config.precisionWeight);
 const fraction=Math.min(1,responseMs/(config.roundSeconds*1000));
 const speedFactor=1-config.speedWeight*fraction;
 return {hit,score:hit?Math.round(100*precision*speedFactor*100)/100:0,precision,speedFactor,relativeWidth,timedOut:false};
}
