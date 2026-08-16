import players from '../src/data/goat-players.json' with { type: 'json' };
import { validateResult } from '../functions/api/goat/_shared.js';

let current = players.players.slice(0, 32).map((player) => player.id);
const matches = [];
let final4 = [];
while (current.length > 1) {
  if (current.length === 4) final4 = current.slice();
  const next = [];
  for (let index = 0; index < current.length; index += 2) {
    matches.push({ round: current.length, playerA: current[index], playerB: current[index + 1], winner: current[index] });
    next.push(current[index]);
  }
  current = next;
}
const winner = current[0];
const runnerUp = matches.at(-1).playerB;
const payload = {
  seed: 'test-seed',
  winner,
  runnerUp,
  semifinalists: final4.filter((id) => id !== winner && id !== runnerUp),
  matches,
  anonymousSessionId: '123e4567-e89b-42d3-a456-426614174000',
};

if (validateResult(payload) !== null) throw new Error('Valid bracket was rejected');
payload.matches[0].winner = payload.matches[1].winner;
if (!validateResult(payload)) throw new Error('Tampered bracket was accepted');
console.log('GOAT result validation passed: 31 matches and tamper rejection');
