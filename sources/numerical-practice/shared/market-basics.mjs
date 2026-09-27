/** Pure, one-trade teaching examples. Prices are toy-game units. */
export function teachingTrade(side,price,quantity=1){
 if(!['buy','sell'].includes(side)||!Number.isFinite(price)||price<0||!Number.isInteger(quantity)||quantity<1)throw Error('Invalid example trade.');
 const inventory=side==='buy'?quantity:-quantity;
 return {inventory,cash:-inventory*price};
}
export function teachingPnl(side,entry,quantity,value,charges=0){
 if(!Number.isFinite(value)||value<0||!Number.isFinite(charges)||charges<0)throw Error('Invalid valuation.');
 const trade=teachingTrade(side,entry,quantity),positionValue=trade.inventory*value,gross=trade.cash+positionValue;
 return {...trade,positionValue,gross,net:gross-charges};
}
