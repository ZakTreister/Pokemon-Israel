import { updateFields } from '../services/updateFields.js';
import { resolveUpload, finishAttachment } from '../services/mediaUpload.js';
import asyncHandler from 'express-async-handler';
import Update from '../models/updateModel.js';

// @desc    Get all updates
// @route   GET /api/updates
// @access  Public
export const getUpdates = asyncHandler(async (req, res) => {
  const updates = await Update.find({}).sort('-date');
  res.json(updates);
});

// @desc    Create an update
// @route   POST /api/updates
// @access  Private/Admin
export const createUpdate = asyncHandler(async (req, res) => {
  const fields = updateFields(req.body);
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
  if (!update) {
    res.status(404);
    throw new Error('Update not found');
  }
  res.json(update);
});
