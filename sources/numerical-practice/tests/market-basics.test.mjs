import test from 'node:test';
import assert from 'node:assert/strict';
import {teachingTrade,teachingPnl} from '../shared/market-basics.mjs';
test('beginner trade ledger uses signed cash and inventory for buys and shorts',()=>{
 assert.deepEqual(teachingTrade('buy',99),{inventory:1,cash:-99});
 assert.deepEqual(teachingTrade('sell',101),{inventory:-1,cash:101});
 assert.deepEqual(teachingTrade('sell',100,3),{inventory:-3,cash:300});
});
test('teaching P&L matches long/short settlement and total charges',()=>{
 const long=teachingPnl('buy',100,2,108,1);assert.equal(long.gross,16);assert.equal(long.net,15);
 const short=teachingPnl('sell',100,2,108,1);assert.equal(short.gross,-16);assert.equal(short.net,-17);
 assert.equal(teachingPnl('sell',100,3,80,5).net,55);
 for(const side of ['buy','sell'])assert.equal(teachingPnl(side,100,1,100,2).net,-2);
});
test('offsetting trades remove payout risk before charges',()=>{
 for(const payout of [0,80,100,120]){
  const long=teachingPnl('buy',99,1,payout),short=teachingPnl('sell',101,1,payout);
  assert.equal(long.net+short.net,2);
 }
 assert.throws(()=>teachingTrade('buy',-1));assert.throws(()=>teachingPnl('buy',100,0,100));
});
