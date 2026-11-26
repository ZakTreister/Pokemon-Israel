import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let renderer;
try {
  const { default: Editor } = await vite.ssrLoadModule('/src/components/content/RichHtmlField.tsx');
  const { serializeEditor } = await vite.ssrLoadModule('/src/components/content/serializeEditor.ts');
  const text = value => ({nodeType:3,textContent:value});
  const element = (tag, children = [], attributes = {}) => ({
    nodeType:1, tagName:tag.toUpperCase(), childNodes:children,
    children:children.filter(n=>n.nodeType===1),
    getAttribute:name=>attributes[name] ?? null,
    style:{fontWeight:'',fontStyle:'',textDecorationLine:'',textDecoration:'',...attributes.style},
  });
  const root = element('div', [
    element('div',[text('שלום & <עולם>')]),
    element('b',[text('מודגש')]),
    element('span',[text('נטוי')],{style:{fontStyle:'italic'}}),
    element('a',[text('קישור')],{href:'/events/123?x=1&y=2'}),
    element('script',[text('bad')]),
  ]);
  assert.equal(serializeEditor(root), '<p>שלום &amp; &lt;עולם&gt;</p><b>מודגש</b><em>נטוי</em><a href="/events/123?x=1&amp;y=2">קישור</a>');
  assert.throws(()=>serializeEditor(element('div',[element('a',[text('bad')],{href:'javascript:alert(1)'})])));
  assert.equal(serializeEditor(element('div',[element('div',[text('מרכז')],{align:'center'}),element('h2',[text('כותרת')],{style:{textAlign:'center'}})])),'<p style="text-align: center">מרכז</p><h2 style="text-align: center">כותרת</h2>');
  const el = React.createElement;
  const Harness = () => {
    const [value,setValue] = React.useState('<p>תוכן קיים</p>');
    return el(Editor,{value,onChange:setValue});
  };
  const fake = {innerHTML:'', ownerDocument:{getSelection:()=>null}, focus(){}, contains(){return true;}};
  await act(async()=>{renderer=TestRenderer.create(el(Harness),{createNodeMock:node=>node.props.contentEditable?fake:null});});
  const button = label => renderer.root.findAllByType('button').find(b=>b.props['aria-label']===label || b.children.join('')===label);
  assert.equal(renderer.root.findAllByType('input').length,0,'no permanent link fields');
  assert.equal(renderer.root.findAllByType('textarea').length,0);
  assert.equal(fake.innerHTML,'<p>תוכן קיים</p>');
  for(const label of ['הדגשה','כתב נטוי','קו תחתון','מרכז טקסט','יישור לימין','הוסף או ערוך קישור','הסר קישור','בטל פעולה','שחזר פעולה']) assert.ok(button(label),label);
  act(()=>button('הוסף או ערוך קישור').props.onClick());
  assert.equal(renderer.root.findAllByType('input').length,0,'link requires selected text');
  assert.ok(renderer.root.findByProps({role:'alert'}));
  act(()=>button('HTML').props.onClick());
  assert.equal(renderer.root.findByType('textarea').props.value,'<p>תוכן קיים</p>');
  act(()=>renderer.root.findByType('textarea').props.onChange({target:{value:'<script>bad</script>'}}));
  act(()=>button('עריכה ויזואלית').props.onClick());
  assert.equal(renderer.root.findByType('textarea').props.value,'<script>bad</script>');
  assert.ok(renderer.root.findAllByProps({role:'alert'}).length);
  act(()=>renderer.root.findByType('textarea').props.onChange({target:{value:'<h2>כותרת</h2><a href="/events/123">אירוע</a>'}}));
  act(()=>button('עריכה ויזואלית').props.onClick());
  assert.equal(renderer.root.findAllByType('textarea').length,0);
  assert.equal(fake.innerHTML,'<h2>כותרת</h2><a href="/events/123">אירוע</a>');
  assert.equal(renderer.root.findAllByType('input').length,0);
  console.log('Rich HTML editor checks passed: safe serialization, visual/source roundtrip, invalid source rejection and no permanent link fields.');
} finally {
  if(renderer) act(()=>renderer.unmount());
  await vite.close();
}
