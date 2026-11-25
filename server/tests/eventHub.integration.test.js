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
import allStarsPublicRoutes from '../routes/allStarsPublicRoutes.js';
import eventRoutes from '../routes/eventRoutes.js';
import contentPageRoutes from '../routes/contentPageRoutes.js';
import ContentPage from '../models/contentPageModel.js';
import updateRoutes from '../routes/updateRoutes.js';
import mediaRoutes from '../routes/mediaRoutes.js';
import MediaUpload from '../models/mediaUploadModel.js';
import tournamentRoutes from '../routes/tournamentRoutes.js';
import { errorHandler } from '../middleware/errorMiddleware.js';
import { fileURLToPath } from 'node:url';
import ContentPage from '../models/contentPageModel.js';
import {registerSeoEndpoints,createSpaSeoHandler} from '../services/seoRoutes.js';
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
 app.use('/api/content-pages',contentPageRoutes);app.use('/api/updates',updateRoutes);app.use('/api/tournaments',tournamentRoutes);
 app.use('/api/all-stars',allStarsPublicRoutes);app.use('/api/inter-team',interTeamRoutes);app.use('/api/media',mediaRoutes);
 registerSeoEndpoints(app);
 const serveSpa=createSpaSeoHandler(fileURLToPath(new URL('../../index.html',import.meta.url)));
 app.get(['/', '/events/:id', '/content/:id', '/news/:id', '/manage', '/all-stars/players/:id'],serveSpa);
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
 // Seed a legacy fixture directly; the public API no longer allows creating one.
 const legacy=await Event.findById(ev.id);
 legacy.fixtures.push({firstTeam:first.id,secondTeam:second.id,date:new Date('2026-11-29T10:00:00.000Z'),location:'תל אביב'});
 await legacy.save();
 const planned=legacy.toJSON();
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

test('event-scoped creation persists club association and rejects standalone fixtures',async()=>{
 const club=await ok('/events','POST',{title:'Club creation',category:'club'},'admin',201);
 const stars=await ok('/events','POST',{title:'Fixture creation',category:'all_stars'},'admin',201);
 const date=new Date(Date.now()+86400000*10).toISOString();
 const input={date:date.slice(0,10),location:'Test',eventId:club.id};
 assert.equal((await call('/tournaments','POST',input,'judge')).status,403);
 assert.equal((await call('/tournaments','POST',{...input,eventId:stars.id},'admin')).status,400);
 const created=await ok('/tournaments','POST',input,'admin',201);
 assert.equal(created.eventId,club.id);
 assert.equal(created.status,'upcoming');
 assert.equal((await ok('/events/management/'+club.id,'GET',undefined,'admin')).tournaments.length,1);
 const url='/events/'+stars.id+'/fixtures';
 assert.equal((await call(url,'POST',{},'judge')).status,403);
 assert.equal((await call(url,'POST',{},'admin')).status,410);
 assert.equal((await call(url,'PUT',{fixtures:[]},'admin')).status,410);
 assert.equal(await Tournament.countDocuments({eventId:stars.id}),0);
});

test('scheduled inter-team creation creates a real upcoming tournament without rounds',async()=>{
 const event=await ok('/events','POST',{title:'Scheduled meeting',category:'all_stars',status:'published'},'admin',201);
 const admin=await User.findOne({role:'admin'});
 const [a,b]=await Team.create([{name:'Scheduled Alpha',createdBy:admin._id},{name:'Scheduled Beta',createdBy:admin._id}]);
 await Player.create([{firstName:'A',lastName:'Scheduled',playerType:'team',team:a._id,city:'City',isActive:true},{firstName:'B',lastName:'Scheduled',playerType:'team',team:b._id,city:'City',isActive:true}]);
 const scheduledDate=new Date(Date.now()+86400000*10).toISOString();
 const input={eventId:event.id,teamIds:[a.id,b.id],scheduledDate,location:'Test venue'};
 assert.equal((await call('/inter-team','POST',input,'judge')).status,403);
 const created=await ok('/inter-team','POST',input,'admin',201);
 assert.equal(created.status,'upcoming');
 assert.equal(created.phase,'setup');
 assert.equal(created.date,scheduledDate);
 assert.equal(created.eventId,event.id);
 assert.equal(created.rounds.length,0);
 assert.equal((await ok('/events/management/'+event.id,'GET',undefined,'admin')).tournaments.length,1);
 const overview=await ok('/all-stars/overview');
 assert.equal(overview.fixtures.filter(f=>f.eventId===event.id).length,1);
 assert.equal(overview.fixtures.find(f=>f.eventId===event.id).tournamentId,created.id);
 assert.equal((await ok('/inter-team/active','GET',undefined,'admin')).some(t=>t.id===created.id),false);
 assert.equal((await call('/inter-team/'+created.id+'/rounds','POST',{expectedRevision:created.revision},'admin')).status,400);
});


test('next ranking event skips empty, draft, past and All-Stars events and respects date rather than featured order',async()=>{
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const date=offset=>new Date(Date.parse(today+'T00:00:00Z')+offset*86400000);
 const make=async(title,offset,category='club',status='published',featured=false)=>ok('/events','POST',{title,category,status,featured,startDate:date(offset).toISOString()},'admin',201);
 const past=await make('Past ranking event',-1);
 const empty=await make('Empty ranking event',0);
 const draft=await make('Draft ranking event',0,'club','draft');
 const stars=await make('Stars ranking event',0,'all_stars');
 const next=await make('Next ranking event',1);
 const later=await make('Later featured ranking event',2,'club','published',true);
 const tournaments=[];
 try{
  for(const ev of [past,draft,next,later]) tournaments.push(await Tournament.create({title:'Ranking '+ev.title,description:'test',date:ev.startDate,location:'Test',registrationDeadline:ev.startDate,image:'/pokemon.png',type:'quarterly',source:'historical',status:'upcoming',eventId:ev.id}));
  assert.equal((await ok('/events/next-ranking-event')).id,next.id);
  await Tournament.updateMany({eventId:next.id},{$set:{eventId:null}});
  assert.equal((await ok('/events/next-ranking-event')).id,later.id);
  await Tournament.updateMany({eventId:later.id},{$set:{eventId:null}});
  assert.equal(await ok('/events/next-ranking-event'),null);
 }finally{
  await Tournament.deleteMany({_id:{$in:tournaments.map(t=>t._id)}});
  await Event.deleteMany({_id:{$in:[past,empty,draft,stars,next,later].map(e=>e.id)}});
 }
});


test('admin can open a draft directly in the content editor without exposing it publicly',async()=>{
 const page=await ContentPage.create({title:'Draft editor route',status:'draft'});
 try {
  assert.equal((await call('/content-pages/'+page.id)).status,404);
  assert.equal((await call('/content-pages/management/'+page.id)).status,401);
  assert.equal((await call('/content-pages/management/'+page.id,'GET',undefined,'judge')).status,403);
  const managed=await ok('/content-pages/management/'+page.id,'GET',undefined,'admin');
  assert.equal(managed.title,page.title);assert.equal(managed.status,'draft');
  assert.equal((await call('/content-pages/management/not-a-page','GET',undefined,'admin')).status,404);
 }finally{await page.deleteOne();}
test('production-style SEO HTML and sitemap respect publication and exclude personal pages',async()=>{
 const published=await ok('/events','POST',{title:'SEO public event',description:'Public event description',category:'club',status:'published'},'admin',201);
 const draft=await ok('/events','POST',{title:'SEO private event',category:'club',status:'draft'},'admin',201);
 const [page,hiddenPage]=await ContentPage.create([{title:'SEO public page',status:'published'},{title:'SEO private page',status:'draft'}]);
 const publicNews=await ok('/updates','POST',{title:'SEO public news',description:'Public news',eventId:published.id},'admin',201);
 const hiddenNews=await ok('/updates','POST',{title:'SEO private news',description:'Private news',eventId:draft.id},'admin',201);
 const get=async path=>{const res=await fetch(origin+path);assert.equal(res.status,200,path);return {html:await res.text(),res};};
 try {
  const home=await get('/');
  assert.match(home.html,/קארדסקול.*חוגי פוקימון/);
  assert.equal(home.res.headers.get('x-robots-tag'),null);
  for(const [path,title] of [['/events/'+published.id,'SEO public event'],['/content/'+page.id,'SEO public page'],['/news/'+publicNews.id,'SEO public news']]){
   const {html,res}=await get(path);
   assert.ok(html.includes('<title>'+title+' | קארדסקול</title>'),path);
   assert.ok(html.includes('https://cardschool.co.il'+path));
   assert.equal(res.headers.get('x-robots-tag'),null);
  }
  for(const [path,title] of [['/events/'+draft.id,'SEO private event'],['/content/'+hiddenPage.id,'SEO private page'],['/news/'+hiddenNews.id,'SEO private news'],['/manage',''],['/all-stars/players/'+page.id,'']]){
   const {html,res}=await get(path);
   assert.equal(res.headers.get('x-robots-tag'),'noindex, follow',path);
   assert.ok(html.includes('name="robots" content="noindex, follow"'));
   assert.ok(!html.includes('rel="canonical"'));
   if(title)assert.ok(!html.includes(title));
  }
  const sitemap=await get('/sitemap.xml');
  assert.match(sitemap.res.headers.get('content-type'),/application\/xml/);
  for(const path of ['/events/'+published.id,'/content/'+page.id,'/news/'+publicNews.id])assert.ok(sitemap.html.includes(path));
  for(const path of ['/events/'+draft.id,'/content/'+hiddenPage.id,'/news/'+hiddenNews.id,'/manage','/all-stars/players/'])assert.ok(!sitemap.html.includes(path));
  const robots=await get('/robots.txt');
  assert.ok(robots.html.includes('Sitemap: https://cardschool.co.il/sitemap.xml'));
 }finally{
  await Update.deleteMany({_id:{$in:[publicNews.id,hiddenNews.id]}});
  await Event.deleteMany({_id:{$in:[published.id,draft.id]}});
  await ContentPage.deleteMany({_id:{$in:[page.id,hiddenPage.id]}});
 }
});
