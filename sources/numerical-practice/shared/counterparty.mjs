/**
 * Generic simulated counterparty. Prices/values/noise share the caller's units.
 * action is from the COUNTERPARTY's perspective: buy means the maker sells.
 * No inventory, settlement, dice, cards or event-specific logic lives here.
 * Inject random() in [0,1) to replay/test a scenario.
 */
export function decideTrade({bid,ask,trueValue,aggressiveness=0.7,noise=0,noiseTradeProbability=0,edgeScale=1,minEdge=0,quantity=1},random=Math.random){
  if(![bid,ask,trueValue,aggressiveness,noise,noiseTradeProbability,edgeScale,minEdge,quantity].every(Number.isFinite)
    ||bid>=ask||aggressiveness<0||aggressiveness>1||noise<0||noiseTradeProbability<0||noiseTradeProbability>1
    ||edgeScale<=0||minEdge<0||!Number.isInteger(quantity)||quantity<1)throw Error('Invalid quote or counterparty settings.');
  const perceivedValue=trueValue+(random()*2-1)*noise;
  const pass={action:'pass',price:null,quantity:0,edge:0,perceivedValue,reason:'No trade'};
  if(random()<noiseTradeProbability){
    const action=random()<0.5?'buy':'sell';const price=action==='buy'?ask:bid;
    return {action,price,quantity,perceivedValue,edge:action==='buy'?perceivedValue-price:price-perceivedValue,reason:'Noise trade'};
  }
  const action=perceivedValue>ask+minEdge?'buy':perceivedValue<bid-minEdge?'sell':'pass';
  if(action==='pass')return pass;
  const price=action==='buy'?ask:bid;
  const edge=action==='buy'?perceivedValue-price:price-perceivedValue;
  const probability=aggressiveness*(1-Math.exp(-(edge-minEdge)/edgeScale));
  return random()<probability?{action,price,quantity,edge,perceivedValue,reason:'Value-driven trade'}:pass;
}

/** Convert a fill into the maker's cash and inventory changes. */
export function makerFill(trade){
  if(trade.action==='pass')return {cashDelta:0,inventoryDelta:0};
  if(!['buy','sell'].includes(trade.action)||!Number.isFinite(trade.price)||!Number.isInteger(trade.quantity)||trade.quantity<=0)throw Error('Invalid fill.');
  const inventoryDelta=trade.action==='buy'?-trade.quantity:trade.quantity;
  return {inventoryDelta,cashDelta:-inventoryDelta*trade.price};
}

/** Execute a taker's choice against a firm, one-unit or multi-unit book.
 * Reuses the same fill accounting; the taker receives the opposite of the maker.
 * No randomness: a displayed firm quote commits its dealer to execution.
 */
export function takeQuote({bid,ask,action,quantity=1}){
  if(![bid,ask,quantity].every(Number.isFinite)||bid>=ask||!['buy','sell','pass'].includes(action)||!Number.isInteger(quantity)||quantity<1)throw Error('Invalid firm quote or taker action.');
  if(action==='pass')return {action,price:null,quantity:0,inventoryDelta:0,cashDelta:0};
  const price=action==='buy'?ask:bid;
  const maker=makerFill({action,price,quantity});
  return {action,price,quantity,inventoryDelta:-maker.inventoryDelta,cashDelta:-maker.cashDelta};
}
