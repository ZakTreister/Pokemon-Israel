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
const scoredRound = round=>({
  ...round,
  matches:round.matches.map(match=>({
    ...match,result:{winner:'draw',score1:1,score2:1,drawnGames:0},
  })),
});

test('never repeat a bench turn while any eligible teammate has never sat', () => {
  // Five vs three means two bench seats per round. After two rounds, only
  // one child has never sat, so the third automatic round must be refused.
  const one=planInterTeamRound({participants:people,rounds:[],teamIds:['a','b']});
  const two=planInterTeamRound({participants:people,rounds:[scoredRound(one)],teamIds:['a','b']});
  assert.ok(two.benchPlayerIds.every(player=>!one.benchPlayerIds.includes(player)));
  const unbenched=people.filter(p=>p.team==='a'&&!new Set([...one.benchPlayerIds,...two.benchPlayerIds]).has(p.player));
  assert.equal(unbenched.length,1);
  assert.throws(
    ()=>planInterTeamRound({participants:people,rounds:[scoredRound(one),scoredRound(two)],teamIds:['a','b']}),
    /אין מספיק מהם למלא את הספסל/,
  );
});

test('automatic bench may repeat after every eligible teammate has sat once', () => {
  const balanced=[
    ...Array.from({length:4},(_,i)=>player(i+1,'a')),
    ...Array.from({length:3},(_,i)=>player(i+5,'b')),
  ];
  const rounds=[];
  const benchHistory=new Set();
  for(let i=0;i<4;i++){
    const next=planInterTeamRound({participants:balanced,rounds,teamIds:['a','b']});
    assert.equal(next.benchPlayerIds.length,1);
    assert.ok(!benchHistory.has(next.benchPlayerIds[0]),'do not repeat before all four children sat');
    benchHistory.add(next.benchPlayerIds[0]);
    rounds.push(scoredRound(next));
  }
  assert.equal(benchHistory.size,4);
  const fifth=planInterTeamRound({participants:balanced,rounds,teamIds:['a','b']});
  assert.equal(fifth.benchPlayerIds.length,1);
  assert.ok(benchHistory.has(fifth.benchPlayerIds[0]),'repetition after a complete cycle is allowed');
  assert.ok(!rounds.at(-1).benchPlayerIds.includes(fifth.benchPlayerIds[0]),'never consecutive');
});

test('never move to a higher bench count tier before the current tier can fill the bench', () => {
  const uneven=[
    ...Array.from({length:8},(_,index)=>player(index+1,'a')),
    ...Array.from({length:3},(_,index)=>player(index+9,'b')),
  ];
  const first=planInterTeamRound({participants:uneven,rounds:[],teamIds:['a','b']});
  assert.equal(first.benchPlayerIds.length,5);
  assert.throws(
    ()=>planInterTeamRound({participants:uneven,rounds:[scoredRound(first)],teamIds:['a','b']}),
    /אין מספיק מהם למלא את הספסל/,
  );
});

test('invalid same-team manual pairings are rejected', () => {
  assert.throws(()=>validateInterTeamPairings([{player1:'1',player2:'2'}],people,['a','b']),/כל צימוד/);
});
test('round two requires all results from round one', () => {
  const one = planInterTeamRound({participants:people,rounds:[],teamIds:['a','b']});
  assert.throws(()=>planInterTeamRound({participants:people,rounds:[one],teamIds:['a','b']}),/תוצאות/);
});
