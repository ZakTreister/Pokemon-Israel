import test from 'node:test';
import assert from 'node:assert/strict';
import { teamLeagueStandings,leagueYearStart } from '../services/teamLeagueStandings.js';
import { youtubeId } from '../services/assetAttachment.js';
const team=(id,name)=>({_id:id,name,toJSON:()=>({logo:''})});
function meeting(sides,matches){
 const ids=sides.map((team,i)=>({player:'p'+i,team}));
 return {type:'inter_team',status:'completed',phase:'completed',
   interTeamSides:sides.map(team=>({team})),playerParticipants:ids,
   rounds:[{matches:matches.map(([score1,score2])=>({
    player1:'p0',player2:'p1',result:{winner:score1>score2?'player1':score1<score2?'player2':'draw',score1,score2,drawnGames:0}
   }))}]};
}
test('official meeting league scoring 3/1/0 and individual game differential',()=>{
 const teams=[team('a','א'),team('b','ב'),team('c','ג')];
 const rows=teamLeagueStandings(teams,[meeting(['a','b'],[[2,0],[2,1]]),meeting(['a','c'],[[0,2],[1,1]])]);
 const a=rows.find(x=>x.id==='a'),b=rows.find(x=>x.id==='b'),c=rows.find(x=>x.id==='c');
 assert.equal(a.leaguePoints,3);
 assert.equal(a.played,2);
 assert.equal(a.gameDifference,1);
 assert.equal(b.leaguePoints,0);
 assert.equal(c.leaguePoints,3);
 assert.equal(c.gameDifference,2);
 assert.equal(c.position,1);
 assert.equal(a.position,2);
});
test('shared positions when league points and game difference tie',()=>{
 const rows=teamLeagueStandings([team('a','א'),team('b','ב')],[meeting(['a','b'],[[2,1],[1,2]])]);
 assert.equal(rows[0].leaguePoints,1);assert.equal(rows[1].leaguePoints,1);
 assert.equal(rows[0].gameDifference,0);assert.equal(rows[1].gameDifference,0);
 assert.equal(rows[0].position,1);assert.equal(rows[1].position,1);
});
test('unfinished/non-official tournaments never score',()=>{
 const rows=teamLeagueStandings([team('a','א'),team('b','ב')],[
  {...meeting(['a','b'],[[2,0]]),phase:'running'},
  {...meeting(['a','b'],[[2,0]]),type:'team_internal'},
 ]);
 assert.ok(rows.every(r=>r.played===0&&r.leaguePoints===0));
});
test('competition year begins in September Israel time',()=>{
 assert.equal(leagueYearStart(new Date('2026-10-15T10:00:00Z')).toISOString(),'2026-08-31T21:00:00.000Z');
 assert.equal(leagueYearStart(new Date('2026-02-15T10:00:00Z')).toISOString(),'2025-08-31T21:00:00.000Z');
});
test('YouTube accepts bounded HTTPS video IDs only',()=>{
 assert.equal(youtubeId('https://youtu.be/AbCdEf123_-'),'AbCdEf123_-');
 assert.equal(youtubeId('https://www.youtube.com/watch?v=AbCdEf123_-'),'AbCdEf123_-');
 for (const input of ['http://youtu.be/AbCdEf123_-','https://evil-youtube.com/watch?v=AbCdEf123_-','https://www.youtube.com/watch?v=<script>','javascript:alert(1)','https://youtu.be/invalid']) {
  assert.throws(()=>youtubeId(input));
 }
});
