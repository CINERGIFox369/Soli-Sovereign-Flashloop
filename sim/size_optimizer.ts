/**
 * Simple grid search for optimal flash-loan size given quoted pool prices and fees.
 * Replace `quote` with real on-chain/cached quotes in your environment.
 */
import Big from "bignumber.js";

export interface FeeModel { aaveBps:number; v3Fee:number; v2Fee:number; extraBps:number }

export function optimalSize(candidates: string[], quote:(amt:Big)=>Big, fees:FeeModel){
  let best = {amt:new Big(0), profit:new Big(0)};
  for(const raw of candidates){
    const amt = new Big(raw);
    const out = quote(amt);
    const gross = out.minus(amt);
    const costs = amt.times(fees.aaveBps).div(1e4)
                 .plus(amt.times(fees.v3Fee).div(1e4))
                 .plus(amt.times(fees.v2Fee).div(1e4))
                 .plus(amt.times(fees.extraBps).div(1e4));
    const net = gross.minus(costs);
    if(net.gt(best.profit)) best = {amt, profit: net};
  }
  return best;
}
