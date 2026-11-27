import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeRichHtml,hasRichContent} from '../../shared/richHtml.js';
import {contentPageFields,mobileContentFields} from '../services/contentFields.js';
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

test('approved layouts, safe image URL extensions and canonical attribute order',()=>{
 const html='<div class="layout-2-col"><div><p>טקסט</p></div><img class="image-medium align-center" alt="תמונה" src="https://cdn.example.com/p.JPG?v=1&x=2"/></div>';
 const clean=sanitizeRichHtml(html);
 assert.match(clean,/<img src="https:\/\/cdn\.example\.com\/p\.JPG\?v=1&amp;x=2" alt="תמונה" class="image-medium align-center">/);
 assert.equal(sanitizeRichHtml(clean),clean);
 assert.equal(sanitizeRichHtml('<a class="cta-button" href="/events">אירועים</a>'),'<a href="/events" class="cta-button">אירועים</a>');
 for(const html of ['<img src="http://example.com/a.png">','<img src="https://example.com/a.svg">','<img src="https://example.com/a">','<img src="data:image/png;base64,x">','<img src="https://example.com/a.png" onerror="x()">','<img src="https://example.com/a.png" srcset="x">','<div class="fixed">x</div>','<div class="mobile-only desktop-only">x</div>','<div style="display:none">x</div>','<img src="https://example.com/a.png" src="https://example.com/b.png">'])assert.throws(()=>sanitizeRichHtml(html),html);
});

test('mobile HTML validates independently and disabling preserves stored content',()=>{
 assert.deepEqual(mobileContentFields({mobileHtml:'<p>מובייל</p>',mobileEnabled:true}),{mobileHtml:'<p>מובייל</p>',mobileEnabled:true});
 assert.deepEqual(mobileContentFields({mobileEnabled:false}),{mobileEnabled:false});
 assert.throws(()=>mobileContentFields({mobileHtml:'<script>x</script>'}));
 assert.throws(()=>mobileContentFields({mobileEnabled:'false'}));
 assert.equal(hasRichContent('<p><br>&nbsp;</p>'),false);
 assert.equal(hasRichContent('<img src="https://example.com/a.png" alt="">'),true);
});
