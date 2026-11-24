import { updateFields } from '../services/updateFields.js';
import { resolveUpload, finishAttachment } from '../services/mediaUpload.js';
import asyncHandler from 'express-async-handler';
import Update from '../models/updateModel.js';
import Event from '../models/eventModel.js';
import { fail } from '../utils/httpError.js';
import { attachAsset,removeAsset } from '../services/assetAttachment.js';
const linkedEvent = async (input, existing) => {
  const id = input.eventId === undefined ? existing?.eventId ?? null : input.eventId;
  if (id === null || id === '') return null;
  if (!/^[a-f0-9]{24}$/i.test(String(id)) || !await Event.exists({ _id:id })) fail(400,'האירוע המשויך לא נמצא');
  return id;
};

// @desc    Get all updates
// @route   GET /api/updates
// @access  Public
export const getUpdates = asyncHandler(async (req, res) => {
  const published = await Event.find({ status:'published' }).select('_id').lean();
  const updates = await Update.find({ $or: [{eventId:null},{eventId:{$in:published.map(e=>e._id)}}] }).sort('-date');
  res.json(updates);
});

// @desc    Create an update
// @route   POST /api/updates
// @access  Private/Admin
export const createUpdate = asyncHandler(async (req, res) => {
  const fields = updateFields(req.body);
  fields.eventId = await linkedEvent(req.body);
  const attachment = await resolveUpload(req, 'update-image');
  const update = await Update.create({
    ...fields,
    ...(attachment?.id ? { _id: attachment.id } : {}),
    imageMedia: attachment?.media || null,
  });
  await finishAttachment(req, attachment);

  res.status(201).json(update);
});

// @desc    Update an update
// @route   PUT /api/updates/:id
// @access  Private/Admin
export const updateUpdate = asyncHandler(async (req, res) => {
  const update = await Update.findById(req.params.id);

  if (update) {
    Object.assign(update, updateFields(req.body, update));
    update.eventId = await linkedEvent(req.body,update);
    const previous = update.imageMedia;
    const attachment = await resolveUpload(
      req,
      'update-image',
      update._id,
      previous,
    );
    if (attachment) update.imageMedia = attachment.media;

    const updatedUpdate = await update.save();
    await finishAttachment(req, attachment, previous);
    res.json(updatedUpdate);
  } else {
    res.status(404);
    throw new Error('Update not found');
  }
});

// @desc    Delete an update
// @route   DELETE /api/updates/:id
// @access  Private/Admin
export const deleteUpdate = asyncHandler(async (req, res) => {
  const update = await Update.findById(req.params.id);

  if (update) {
    const previous = update.imageMedia;
    await update.deleteOne();
    await finishAttachment(req, { media: null }, previous);
    res.json({ message: 'Update removed' });
  } else {
    res.status(404);
    throw new Error('Update not found');
  }
});
export const getUpdate = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    res.status(404);
    throw new Error('Update not found');
  }
  const update = await Update.findById(req.params.id);
  if (update?.eventId && !await Event.exists({_id:update.eventId,status:'published'})) fail(404,'Update not found');
  if (!update) {
    res.status(404);
    throw new Error('Update not found');
  }
  res.json(update);
});

// Admin-only canonical feed, including updates linked to draft events.
export const getManagedUpdates = asyncHandler(async(req,res)=>res.json(await Update.find({}).sort('-date')));

export const addUpdateAsset=asyncHandler(async(req,res)=>{
 if(!/^[a-f0-9]{24}$/i.test(req.params.id)) fail(404,'העדכון לא נמצא');
 const update=await Update.findById(req.params.id);if(!update)fail(404,'העדכון לא נמצא');
 res.status(201).json(await attachAsset(req,update,'update-media'));
});
export const deleteUpdateAsset=asyncHandler(async(req,res)=>{
 if(!/^[a-f0-9]{24}$/i.test(req.params.id)) fail(404,'העדכון לא נמצא');
 const update=await Update.findById(req.params.id);if(!update)fail(404,'העדכון לא נמצא');
 res.json(await removeAsset(update,req.params.assetId));
});
