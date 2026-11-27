import test from 'node:test';
import assert from 'node:assert/strict';
import { publicTournament } from '../services/publicTournament.js';

const tournament={id:'t1',type:'quarterly',status:'upcoming',phase:'setup',engineVersion:'swiss-v1',date:new Date('2026-12-08T12:00:00Z'),image:'https://example.com/original.jpg',eventId:'event1',playerParticipants:[],rounds:[]};
const cover='https://example.com/event.jpg';

test('linked tournament inherits current event cover in list and detail projections',()=>{
 assert.equal(publicTournament(tournament,false,cover).image,cover);
 assert.equal(publicTournament(tournament,true,cover).image,cover);
 assert.equal(publicTournament(tournament,false,'https://example.com/new.jpg').image,'https://example.com/new.jpg');
 assert.equal(tournament.image,'https://example.com/original.jpg');
});
test('missing event cover or removed event association preserves own image',()=>{
 assert.equal(publicTournament(tournament).image,tournament.image);
 assert.equal(publicTournament({...tournament,eventId:null},false,cover).image,tournament.image);
});
