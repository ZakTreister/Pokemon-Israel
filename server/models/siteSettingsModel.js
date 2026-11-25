import mongoose from 'mongoose';
const page=new mongoose.Schema({path:String,active:Boolean,menu:Boolean,footer:Boolean},{_id:false});
const social=new mongoose.Schema({key:String,enabled:Boolean,url:String},{_id:false});
const schema=new mongoose.Schema({_id:String,pages:{type:[page],default:[]},socials:{type:[social],default:[]}},{timestamps:true});
export default mongoose.model('SiteSettings',schema);
