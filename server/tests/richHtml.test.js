import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeRichHtml} from '../../shared/richHtml.js';
import {contentPageFields} from '../services/contentFields.js';
test('rich HTML accepts only safe tags and canonical links',()=>{
 const html='<p>שלום <strong>עולם</strong> <a href="https://example.com/?a=1&b=2">קישור</a></p>';
 const clean=sanitizeRichHtml(html);
 assert.match(clean,/a=1&amp;b=2/);
 assert.equal(sanitizeRichHtml(clean),clean);
 for(const malicious of ['<script>alert(1)</script>','<img src=x onerror=alert(1)>','<p onclick="alert(1)">hi</p>','<a href="javascript:alert(1)">x</a>','<a href="&#106;avascript:alert(1)">x</a>','<a href="//example.com">x</a>','<a href="/\\evil.example">x</a>','</p><p>'])assert.throws(()=>sanitizeRichHtml(malicious));
});
test('published navigation pages require a label, including partial edits',()=>{
 assert.throws(()=>contentPageFields({title:'test',showInNavigation:true}));
 assert.equal(contentPageFields({title:'test',showInNavigation:true,navigationLabel:'ניווט'}).navigationLabel,'ניווט');
 assert.throws(()=>contentPageFields({navigationLabel:''},{title:'test',showInNavigation:true}));
});

 test('center alignment is normalized without allowing arbitrary CSS or attributes',()=>{
  assert.equal(sanitizeRichHtml('<p align="center">שלום</p>'),'<p style="text-align: center">שלום</p>');
  assert.equal(sanitizeRichHtml('<h2 style="text-align: center;">כותרת</h2>'),'<h2 style="text-align: center">כותרת</h2>');
  assert.throws(()=>sanitizeRichHtml('<p style="text-align: center; color:red">x</p>'));
  assert.throws(()=>sanitizeRichHtml('<p align="center" onclick="x()">x</p>'));
 });

test('safe inline images and device-only divs round trip',()=>{
 const raw='<div class="mobile-only"><img src="https://example.com/a.jpg?x=1&y=2" alt="תמונה"></div><div class="desktop-only"><p>מחשב</p></div>';
 const clean=sanitizeRichHtml(raw);
 assert.equal(clean,raw.replace('&y=','&amp;y='));
 assert.equal(sanitizeRichHtml(clean),clean);
 assert.equal(sanitizeRichHtml('<img src="/a.jpg"/>'),'<img src="/a.jpg" alt="">');
 for(const html of [
   '<img src="javascript:alert(1)">','<img src="data:image/svg+xml;base64,x">','<img src="//evil.example/x">','<img src="http://example.com/x">',
   '<img src="https://example.com/x" onerror="alert(1)">','<img src="https://example.com/x" srcset="x">',
   '<div class="hidden">x</div>','<div class="mobile-only other">x</div>','<div class="desktop-only" style="display:none">x</div>','<style>div{display:none}</style>',
 ])assert.throws(()=>sanitizeRichHtml(html),html);
});
