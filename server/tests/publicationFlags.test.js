import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateFields} from '../services/updateFields.js';
import {publicAssets} from '../models/mediaAssetSchema.js';
test('update publication flags accept explicit booleans, preserve unspecified legacy behavior',()=>{assert.equal(updateFields({title:'test',showInFieldNews:false,imageInGallery:true}).showInFieldNews,false);assert.equal(updateFields({title:'test',showInFieldNews:false,imageInGallery:true}).imageInGallery,true);assert.equal(Object.hasOwn(updateFields({title:'test'}),'showInFieldNews'),false);assert.throws(()=>updateFields({title:'test',showInFieldNews:'false'}));});
test('media public DTOs expose gallery selection, defaulting old items to false',()=>{const rows=publicAssets([{_id:'1',kind:'youtube',youtubeId:'abcdefghijk',showInGallery:true},{_id:'2',kind:'youtube',youtubeId:'abcdefghijk'}]);assert.deepEqual(rows.map(r=>r.showInGallery),[true,false]);});
