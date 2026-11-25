import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
const el=React.createElement;
let renderer;
try {
  const load=file=>vite.ssrLoadModule('/src/'+file);
  const {default:Content}=await load('pages/ContentPage.tsx');
  const {default:Event}=await load('pages/EventDetailsPage.tsx');
  const {contentPagesService}=await load('services/contentPages.ts');
  const {eventsService}=await load('services/events.ts');
  const {publicTeams}=await load('services/publicTeams.ts');
  const mount=async(Component,path)=>{
    await act(async()=>{
      renderer=TestRenderer.create(el(MemoryRouter,{initialEntries:[path],future:{v7_startTransition:true,v7_relativeSplatPath:true}},el(Routes,{},el(Route,{path:'/:kind/:id',element:el(Component)}))));
      await new Promise(resolve=>setImmediate(resolve));
    });
  };
  const unmount=()=>{act(()=>renderer.unmount());renderer=null;};
  const card=n=>{
    assert.match(n.props.className,/\bbg-card\b/);
    assert.match(n.props.className,/\bcs-card\b/);
    assert.match(n.parent.props.className,/\bcs-card-frame\b/);
  };
  const divs=()=>renderer.root.findAllByType('div');
  contentPagesService.get=async()=>({id:'info',title:'מידע',subtitle:'כותרת משנה',bodyHtml:'<p>תוכן לדוגמה</p>',mediaItems:[]});
  await mount(Content,'/content/info');
  const body=divs().find(n=>n.props['aria-label']==='תוכן העמוד');
  card(body);
  assert.equal(body.findAllByType('div').find(n=>n.props.dangerouslySetInnerHTML).props.dangerouslySetInnerHTML.__html,'<p>תוכן לדוגמה</p>');
  unmount();
  publicTeams.list=async()=>[];
  const event={id:'event',title:'אירוע',description:'כותרת משנה',bodyHtml:'<p>פרטי האירוע</p>',mediaItems:[],coverUrl:'',category:'club',startDate:'2026-12-01',updates:[],fixtures:[],contentPages:[{id:'one',title:'עמוד ראשון'},{id:'two',title:'עמוד שני'}],tournaments:[{id:'t1',title:'טורניר ראשון',date:'2026-12-01',type:'quarterly',lifecycle:'completed'},{id:'t2',title:'טורניר שני',date:'2026-12-01',type:'quarterly',lifecycle:'upcoming'}]};
  eventsService.get=async()=>event;
  await mount(Event,'/events/event');
  card(divs().find(n=>n.props['aria-label']==='תוכן האירוע'));
  const linked=divs().filter(n=>n.props['aria-label']==='מידע נוסף');
  assert.equal(linked.length,1);
  card(linked[0]);
  assert.deepEqual(linked[0].findAllByType('a').map(n=>n.props.href),['/content/one','/content/two']);
  const tournaments=divs().filter(n=>n.props.role==='article'&&!n.props['aria-label']);
  assert.equal(tournaments.length,2);
  tournaments.forEach(card);
  unmount();
  eventsService.get=async()=>({...event,tournaments:[],fixtures:[],contentPages:[]});
  await mount(Event,'/events/event');
  assert.ok(!renderer.root.findAllByType('h2').some(n=>n.children.join('')==='טורנירי האירוע ותוצאות'));
  assert.ok(!divs().some(n=>n.props['aria-label']==='מידע נוסף'));
  console.log('Public card checks passed: actual shared background/frame, event body, one linked-content panel, individual tournament cards and empty-section hiding.');
} finally {
  if(renderer) act(()=>renderer.unmount());
  await vite.close();
}
