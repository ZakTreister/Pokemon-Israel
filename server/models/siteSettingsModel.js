import mongoose from 'mongoose';
import {mediaSchema} from '../services/storage/mediaMetadata.js';
const page=new mongoose.Schema({path:String,active:Boolean,menu:Boolean,footer:Boolean,order:Number},{_id:false});
const social=new mongoose.Schema({key:String,enabled:Boolean,url:String},{_id:false});
const schema=new mongoose.Schema({_id:String,pages:{type:[page],default:[]},contentNavigation:{type:[page],default:[]},socials:{type:[social],default:[]},kidsLogoMedia:{type:mediaSchema,default:null},allStarsLogoMedia:{type:mediaSchema,default:null}},{timestamps:true});
export default mongoose.model('SiteSettings',schema);
