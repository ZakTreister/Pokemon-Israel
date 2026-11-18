import test from 'node:test';
import assert from 'node:assert/strict';
import { planInterTeamRound, validateInterTeamPairings } from '../services/interTeamPairings.js';

const player = (n, team) => ({ player: String(n), team, nameSnapshot: String(n) });
const people = [...Array.from({length:5},(_,i)=>player(i+1,'a')), ...Array.from({length:3},(_,i)=>player(i+6,'b'))];
test('inter-team pairings never pair teammates; bench receives no bye', () => {
  const plan = planInterTeamRound({participants:people,rounds:[],teamIds:['a','b']});
  assert.equal(plan.matches.length,3);
  assert.equal(plan.benchPlayerIds.length,2);
  assert.ok(plan.matches.every(m => m.player2 && !('result' in m)));
  assert.equal(validateInterTeamPairings(plan.matches,people,['a','b'],plan.benchPlayerIds),true);
});
test('bench rotates instead of repeating when other players are available', () => {
  const one = planInterTeamRound({participants:people,rounds:[],teamIds:['a','b']});
  const scored = { ...one, matches:one.matches.map(m=>({...m,result:{winner:'draw',score1:0,score2:0,drawnGames:0}})) };
  const two = planInterTeamRound({participants:people,rounds:[scored],teamIds:['a','b']});
  assert.ok(two.benchPlayerIds.every(p => !one.benchPlayerIds.includes(p)));
});
test('invalid same-team manual pairings are rejected', () => {
  assert.throws(()=>validateInterTeamPairings([{player1:'1',player2:'2'}],people,['a','b']),/כל צימוד/);
});
test('round two requires all results from round one', () => {
  const one = planInterTeamRound({participants:people,rounds:[],teamIds:['a','b']});
  assert.throws(()=>planInterTeamRound({participants:people,rounds:[one],teamIds:['a','b']}),/תוצאות/);
});
