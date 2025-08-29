import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
dotenv.config();

/**
 * Simple Monte Carlo simulator to estimate successful tx/day given
 * - arrival rate of opportunities (lambda per second)
 * - success probability per attempt
 * - contention multiplier (probability of being outcompeted)
 */

type SimConfig = {
  secondsPerDay: number;
  arrivalRatePerSec: number; // lambda
  successProbBase: number; // base probability of success when attempted
  competitionFactor: number; // multiplier reducing success
  attemptsPerOpportunity: number; // retries allowed
  simRuns: number;
};

const cfg: SimConfig = {
  secondsPerDay: 86400,
  arrivalRatePerSec: Number(process.env.SIM_ARRIVAL_RATE_PER_SEC || 0.001), // default 0.001 ~ 86 events/day
  successProbBase: Number(process.env.SIM_SUCCESS_PROB_BASE || 0.6),
  competitionFactor: Number(process.env.SIM_COMPETITION_FACTOR || 0.5),
  attemptsPerOpportunity: Number(process.env.SIM_ATTEMPTS_PER_OP || 1),
  simRuns: Number(process.env.SIM_RUNS || 1000),
};

function runOne(cfg: SimConfig) {
  const events = Math.floor(cfg.secondsPerDay * cfg.arrivalRatePerSec);
  let successes = 0;
  for (let i = 0; i < events; i++) {
    let opSuccess = false;
    for (let a = 0; a < cfg.attemptsPerOpportunity; a++) {
      const p = cfg.successProbBase * (1 - cfg.competitionFactor);
      if (Math.random() < p) {
        opSuccess = true;
        break;
      }
    }
    if (opSuccess) successes++;
  }
  return { events, successes };
}

function runMany(cfg: SimConfig) {
  let totalEvents = 0;
  let totalSuccesses = 0;
  for (let i = 0; i < cfg.simRuns; i++) {
    const r = runOne(cfg);
    totalEvents += r.events;
    totalSuccesses += r.successes;
  }
  return { avgEvents: totalEvents / cfg.simRuns, avgSuccesses: totalSuccesses / cfg.simRuns };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const r = runMany(cfg);
  console.log('Sim config:', cfg);
  console.log('Avg events/day:', r.avgEvents.toFixed(2));
  console.log('Avg successes/day:', r.avgSuccesses.toFixed(2));
}

export { runMany };
