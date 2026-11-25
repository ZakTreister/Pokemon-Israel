import mongoose from 'mongoose';
import {mediaSchema} from '../services/storage/mediaMetadata.js';

// A single durable public explanation, independent of individual badge definitions.
export const BADGE_PROGRAM_ID='000000000000000000000001';
const schema=new mongoose.Schema({
 _id:mongoose.Schema.Types.ObjectId,
 description:{type:String,default:'',maxlength:5000},
 imageMedia:{type:mediaSchema,default:null},
},{timestamps:true});
export default mongoose.model('BadgeProgram',schema);
