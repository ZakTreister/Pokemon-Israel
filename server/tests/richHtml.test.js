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
