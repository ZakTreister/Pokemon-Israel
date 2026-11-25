import {test} from 'node:test';
import assert from 'node:assert/strict';
import {favoriteFields} from '../services/teamFavorites.js';
const a='000000000000000000000002',b='000000000000000000000003',operationId='58a75128-83e4-43b9-8c42-8d26d8f4b15f';
test('favorite change accepts selection, switch, removal and uncounted legacy removal',()=>{for(const [fromTeam,toTeam,actionTeam] of [[null,a,a],[a,b,b],[a,null,a],[null,null,a]])assert.deepEqual(favoriteFields({operationId,fromTeam,toTeam,actionTeam}),{_id:operationId,fromTeam,toTeam,actionTeam});});
test('favorite change rejects malformed and contradictory operations',()=>{for(const data of [{fromTeam:a,toTeam:a,actionTeam:a},{toTeam:a,actionTeam:b},{fromTeam:a,actionTeam:b},{toTeam:'invalid',actionTeam:a}])assert.throws(()=>favoriteFields({operationId,...data}));});
