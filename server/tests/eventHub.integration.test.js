import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Event from '../models/eventModel.js';
import Tournament from '../models/tournamentModel.js';
import Update from '../models/updateModel.js';
import '../models/deckModel.js';
import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import interTeamRoutes from '../routes/interTeamRoutes.js';
import eventRoutes from '../routes/eventRoutes.js';
import updateRoutes from '../routes/updateRoutes.js';
import mediaRoutes from '../routes/mediaRoutes.js';
import MediaUpload from '../models/mediaUploadModel.js';
import tournamentRoutes from '../routes/tournamentRoutes.js';
import { errorHandler } from '../middleware/errorMiddleware.js';
let server, origin, tokens = {};
const dbName = 'events_integration_' + randomUUID().replaceAll('-', '');
const call = async (path, method='GET', body, role=null) => {
 const res=await fetch(origin+'/api'+path,{method,headers:{
   'Content-Type':'application/json',
   ...(role?{Authorization:'Bearer '+tokens[role]}:{})},
   body:body===undefined?undefined:JSON.stringify(body)});
 return {status:res.status,body:await res.json()};
};
const ok = async (path,method='GET',body,role=null,status=200)=>{
 const response=await call(path,method,body,role);
 assert.equal(response.status,status,JSON.stringify(response.body));
 return response.body;
};
before(async()=>{
 process.env.JWT_SECRET=randomBytes(32).toString('hex');
 await mongoose.connect(process.env.STAGE_A_TEST_MONGO_URI||'mongodb://127.0.0.1:27017',{dbName});
 await Promise.all([User.init(),Event.init(),Tournament.init(),Update.init()]);
 for(const role of ['admin','judge']) {
  const u=await User.create({username:'event-'+role,name:'Event '+role,password:'secret-event-123',role});
  tokens[role]=jwt.sign({id:u.id},process.env.JWT_SECRET);
 }
 const app=express();app.use(express.json());app.use('/api/events',eventRoutes);
 app.use('/api/updates',updateRoutes);app.use('/api/tournaments',tournamentRoutes);
 app.use('/api/inter-team',interTeamRoutes);app.use('/api/media',mediaRoutes);
 app.use(errorHandler);
 server=createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));
 if(mongoose.connection.readyState===1){await mongoose.connection.dropDatabase();await mongoose.disconnect();}
});
test('event permission, publication and linked news are unified',async()=>{
 const bad=await call('/events','POST',{title:'חנוכה',category:'club'},'judge');
 assert.equal(bad.status,403);
 const draft=await ok('/events','POST',{title:'חנוכה',category:'club',description:'מפגשים',status:'draft'},'admin',201);
 assert.equal(draft.status,'draft');
 assert.equal((await ok('/events')).total,0);
 assert.equal((await call('/events/'+draft.id)).status,404);
 const published=await ok('/events/'+draft.id,'PUT',{status:'published'},'admin');
 assert.equal(published.status,'published');
 assert.equal((await ok('/events')).total,1);
 const ordinary=await ok('/updates','POST',{title:'חדשות רגילות',description:'כללי'},'admin',201);
 const linked=await ok('/updates','POST',{title:'חנוכה מתחיל',description:'עדכון האירוע',eventId:draft.id},'admin',201);
 assert.equal(linked.eventId,draft.id);
 const feed=await ok('/updates');
 assert.equal(feed.filter(u=>u.id===linked.id).length,1);
 assert.equal(feed.length,2);
 const detail=await ok('/events/'+draft.id);
 assert.equal(detail.updates.length,1);
 assert.equal(detail.updates[0].id,linked.id);
 const managed=await ok('/updates/management','GET',undefined,'admin');
 assert.equal(managed.length,2);
 assert.equal((await call('/updates/management','GET',undefined,'judge')).status,403);
 await ok('/events/'+draft.id,'PUT',{status:'draft'},'admin');
 assert.equal((await ok('/updates')).length,1);
 assert.equal((await call('/updates/'+linked.id)).status,404);
 assert.equal((await ok('/updates/management','GET',undefined,'admin')).length,2);
 assert.equal((await call('/events/'+draft.id,'DELETE',undefined,'admin')).status,409);
 await ok('/updates/'+linked.id,'DELETE',undefined,'admin');
 await ok('/events/'+draft.id,'DELETE',undefined,'admin');
 assert.equal((await ok('/updates')).length,1);
 await ok('/updates/'+ordinary.id,'DELETE',undefined,'admin');
});
test('tournaments have at most one event; weekly internal and wrong categories rejected',async()=>{
 const a=await ok('/events','POST',{title:'חוגים א',category:'club',status:'published'},'admin',201);
 const b=await ok('/events','POST',{title:'חוגים ב',category:'club',status:'published'},'admin',201);
 const allStars=await ok('/events','POST',{title:'מפגשי נבחרות',category:'all_stars',status:'published'},'admin',201);
 const mk=async(type)=>Tournament.create({
  title:'טורניר בדיקה',description:'בדיקת שיוך',date:new Date('2026-12-01'),
  location:'תל אביב',registrationDeadline:new Date('2026-12-01'),
  image:'/pokemon.png',type,source:'historical',status:'completed',
  ...(type==='team_internal'?{team:new mongoose.Types.ObjectId(),maxParticipants:32}:{})
 });
 const club=await mk('quarterly');
 const internal=await mk('team_internal');
 const url=(event,tournament)=>'/events/'+event.id+'/tournaments/'+tournament.id;
 await ok(url(a,club),'PUT',{},'admin');
 assert.equal((await ok('/events/'+a.id)).tournaments.length,1);
 assert.equal((await call(url(b,club),'PUT',{},'admin')).status,409);
 assert.equal((await call(url(allStars,club),'PUT',{},'admin')).status,400);
 assert.equal((await call(url(a,internal),'PUT',{},'admin')).status,400);
 await ok(url(a,club),'DELETE',{},'admin');
 await ok(url(b,club),'PUT',{},'admin');
 assert.equal((await ok('/events/'+b.id)).tournaments.length,1);
 await ok(url(b,club),'DELETE',{},'admin');
 assert.equal((await ok('/events/'+b.id)).tournaments.length,0);
 // Legacy events still have directly reachable tournament records.
 assert.equal((await ok('/tournaments/'+club.id)).id,club.id);
 assert.equal((await ok('/tournaments/'+internal.id)).id,internal.id);
});

test('planned All-Stars fixture launches exactly one official inter-team tournament',async()=>{
 const admin=await User.findOne({role:'admin'});
 const [first,second]=await Team.create([
  {name:'Planned Alpha',createdBy:admin._id},
  {name:'Planned Beta',createdBy:admin._id},
 ]);
 await Player.create([
  {firstName:'Alpha',lastName:'Test',playerType:'team',team:first._id,city:'City',isActive:true},
  {firstName:'Beta',lastName:'Test',playerType:'team',team:second._id,city:'City',isActive:true},
 ]);
 const ev=await ok('/events','POST',{title:'מחזור פתיחה',category:'all_stars',status:'published'},'admin',201);
 const planned=await ok('/events/'+ev.id+'/fixtures','PUT',{fixtures:[{
  firstTeam:first.id,secondTeam:second.id,date:'2026-11-29T10:00:00.000Z',location:'תל אביב'
 }]},'admin');
 assert.equal(planned.fixtures.length,1);
 const input={teamIds:[first.id,second.id],eventId:ev.id,fixtureId:planned.fixtures[0].id};
 const created=await ok('/inter-team','POST',input,'admin',201);
 assert.equal(created.eventId,ev.id);
 assert.equal(created.phase,'setup');
 const repeated=await ok('/inter-team','POST',input,'admin',200);
 assert.equal(repeated.id,created.id);
 const detail=await ok('/events/'+ev.id);
 assert.equal(detail.fixtures[0].tournamentId,created.id);
 assert.equal(detail.tournaments.length,1);
 assert.equal((await Tournament.countDocuments({eventId:ev.id,type:'inter_team'})),1);
});


test('event and update videos use YouTube links only; S3 video upload grants are rejected',async()=>{
 const admin=await User.findOne({role:'admin'});
 const event=await ok('/events','POST',{title:'מדיה לאירוע',category:'club',status:'published'},'admin',201);
 const update=await ok('/updates','POST',{title:'עדכון וידאו',description:'עדכון',eventId:event.id},'admin',201);
 for(const purpose of ['event-media','update-media']) {
  const target=purpose==='event-media'?event.id:update.id;
  for(const contentType of ['video/mp4','video/webm']) {
   const r=await call('/media/presign','POST',{purpose,entityId:target,contentType,size:1024},'admin');
   assert.equal(r.status,400,JSON.stringify(r.body));
  }
 }
 assert.equal((await call('/updates/'+update.id+'/media','POST',{youtubeUrl:'https://fake-youtube.com/watch?v=AbCdEf123_-'},'admin')).status,400);
 const updated=await ok('/updates/'+update.id+'/media','POST',{youtubeUrl:'https://youtu.be/AbCdEf123_-'},'admin',201);
 assert.equal(updated.mediaItems[0].kind,'youtube');
 assert.equal(updated.mediaItems[0].youtubeId,'AbCdEf123_-');
 const gallery=await ok('/events/'+event.id+'/media','POST',{youtubeUrl:'https://www.youtube.com/watch?v=AbCdEf123_-'},'admin',201);
 assert.equal(gallery.mediaItems[0].kind,'youtube');
 const news=await ok('/updates');
 assert.equal(news.find(item=>item.id===update.id)?.mediaItems[0]?.kind,'youtube');
 const legacy=await MediaUpload.create({purpose:'update-media',entityId:update.id,createdBy:admin._id,
  uploadKey:'private/uploads/old-video.mp4',storageKey:`public/updates/${update.id}/old-video.mp4`,
  contentType:'video/mp4',size:1024,status:'verified',expiresAt:new Date(Date.now()+300000)});
 const forbidden=await call('/updates/'+update.id+'/media','POST',{uploadId:legacy.id},'admin');
 assert.equal(forbidden.status,400,JSON.stringify(forbidden.body));
 await ok('/updates/'+update.id,'DELETE',undefined,'admin');
 await ok('/events/'+event.id,'DELETE',undefined,'admin');
});
