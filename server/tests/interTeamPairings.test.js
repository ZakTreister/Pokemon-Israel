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
test('automatic bench never repeats the immediately preceding round', () => {
  const one = planInterTeamRound({participants:people,rounds:[],teamIds:['a','b']});
  const score = round=>({
    ...round,
    matches:round.matches.map(match=>({
      ...match,result:{winner:'draw',score1:1,score2:1,drawnGames:0},
    })),
  });
  const two = planInterTeamRound({participants:people,rounds:[score(one)],teamIds:['a','b']});
  assert.ok(two.benchPlayerIds.every(player=>!one.benchPlayerIds.includes(player)));
  const three = planInterTeamRound({participants:people,rounds:[score(one),score(two)],teamIds:['a','b']});
  assert.ok(three.benchPlayerIds.every(player=>!two.benchPlayerIds.includes(player)));
  assert.equal(three.benchPlayerIds.length,2);
});

test('automatic generator refuses consecutive bench turns when mathematically unavoidable', () => {
  const uneven=[
    ...Array.from({length:8},(_,index)=>player(index+1,'a')),
    ...Array.from({length:3},(_,index)=>player(index+9,'b')),
  ];
  const first=planInterTeamRound({participants:uneven,rounds:[],teamIds:['a','b']});
  assert.equal(first.benchPlayerIds.length,5);
  const scored={
    ...first,
    matches:first.matches.map(match=>({...match,result:{winner:'draw',score1:0,score2:0,drawnGames:0}})),
  };
  assert.throws(
    ()=>planInterTeamRound({participants:uneven,rounds:[scored],teamIds:['a','b']}),
    /לא ניתן להגריל סבב בלי להושיב שחקן בספסל שני סבבים ברצף/,
  );
});

test('invalid same-team manual pairings are rejected', () => {
  assert.throws(()=>validateInterTeamPairings([{player1:'1',player2:'2'}],people,['a','b']),/כל צימוד/);
});
test('round two requires all results from round one', () => {
  const one = planInterTeamRound({participants:people,rounds:[],teamIds:['a','b']});
  assert.throws(()=>planInterTeamRound({participants:people,rounds:[one],teamIds:['a','b']}),/תוצאות/);
});
