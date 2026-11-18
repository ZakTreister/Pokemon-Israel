import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInterTeamScore } from '../services/interTeamScore.js';

test('score counts match victories, draws and game wins, never bench', () => {
  const tournament = {
    interTeamSides:[{team:'a'},{team:'b'}],
    playerParticipants:[
      {player:'1',team:'a'},{player:'2',team:'b'},{player:'3',team:'a'},
    ],
    rounds:[{
      benchPlayerIds:['3'], matches:[
        {player1:'1',player2:'2',result:{winner:'player1',score1:2,score2:1,drawnGames:0}},
      ],
    },{
      benchPlayerIds:['3'], matches:[
        {player1:'1',player2:'2',result:{winner:'draw',score1:1,score2:1,drawnGames:0}},
      ],
    }],
  };
  const result=calculateInterTeamScore(tournament);
  assert.equal(result[0].matchWins,1);
  assert.equal(result[1].matchWins,0);
  assert.equal(result[0].matchDraws,1);
  assert.equal(result[1].matchDraws,1);
  assert.equal(result[0].gameWins,3);
  assert.equal(result[1].gameWins,2);
  assert.equal(result[0].gamesPlayed,5);
});
test('unscored matches never change the score',()=>{
  assert.deepEqual(calculateInterTeamScore({
    interTeamSides:[{team:'a'},{team:'b'}],
    playerParticipants:[{player:'1',team:'a'},{player:'2',team:'b'}],
    rounds:[{matches:[{player1:'1',player2:'2',result:null}]}],
  }).map(row=>row.matchWins),[0,0]);
});
