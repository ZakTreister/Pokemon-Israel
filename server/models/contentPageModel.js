import mongoose from 'mongoose';
import { mediaAssetSchema,publicAssets } from './mediaAssetSchema.js';
const schema=new mongoose.Schema({
 title:{type:String,required:true,trim:true,maxlength:180},
 subtitle:{type:String,default:'',maxlength:5000},
 bodyHtml:{type:String,default:'',maxlength:50000},
 status:{type:String,enum:['draft','published'],default:'draft'},
 showInNavigation:{type:Boolean,default:false},
 navigationLabel:{type:String,default:'',trim:true,maxlength:80},
 showInFieldNews:{type:Boolean,default:false},
 isAllStars:{type:Boolean,default:false},
 showAsButton:{type:Boolean,default:false},
 buttonLabel:{type:String,default:'',trim:true,maxlength:80},
 buttonTargets:{type:[String],default:[]},
 mediaItems:{type:[mediaAssetSchema],default:[]},
},{timestamps:true});
schema.index({buttonTargets:1,status:1,showAsButton:1});
schema.set('toJSON',{transform:(doc,ret)=>{
 ret.id=String(doc._id);ret.mediaItems=publicAssets(doc.mediaItems||[]);
 delete ret._id;delete ret.__v;return ret;
}});
export default mongoose.model('ContentPage',schema);
