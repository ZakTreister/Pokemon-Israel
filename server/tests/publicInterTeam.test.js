import test from 'node:test';
import assert from 'node:assert/strict';
import { publicInterTeamMeeting } from '../services/publicInterTeam.js';

test('public inter-team DTO never exposes raw child, team or staff IDs',()=>{
  const doc={
    id:'event-id',title:'A vs B',date:new Date(),phase:'running',status:'upcoming',
    interTeamSides:[{team:'real-team-A',nameSnapshot:'A'},{team:'real-team-B',nameSnapshot:'B'}],
    playerParticipants:[
      {player:'real-child-1',nameSnapshot:'Child 1',team:'real-team-A'},
      {player:'real-child-2',nameSnapshot:'Child 2',team:'real-team-B'},
    ],
    rounds:[{number:1,createdBy:'staff-secret',benchPlayerIds:[],matches:[{
      player1:'real-child-1',player2:'real-child-2',table:1,_id:'private-match-id',
      result:{winner:'player1',score1:2,score2:1,enteredBy:'staff-secret',drawnGames:0},
    }]}],
  };
  const dto=publicInterTeamMeeting(doc);
  const json=JSON.stringify(dto);
  for(const secret of ['real-team-A','real-team-B','real-child-1','real-child-2','staff-secret','private-match-id']){
    assert.ok(!json.includes(secret),`exposed ${secret}`);
  }
  assert.equal(dto.rounds[0].matches[0].player1,'player-1');
  assert.equal(dto.rounds[0].matches[0].player2,'player-2');
  assert.equal(dto.teamScore[0].matchWins,1);
});
