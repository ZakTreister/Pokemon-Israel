import mongoose from 'mongoose';
// Random ID identifies a single operation for retries, never a visitor.
const schema=new mongoose.Schema({_id:{type:String,required:true},fromTeam:{type:mongoose.Schema.Types.ObjectId,default:null},toTeam:{type:mongoose.Schema.Types.ObjectId,default:null},actionTeam:{type:mongoose.Schema.Types.ObjectId,required:true}},{timestamps:{createdAt:true,updatedAt:false},versionKey:false});
schema.index({fromTeam:1});schema.index({toTeam:1});
export default mongoose.model('TeamFavoriteAction',schema);
