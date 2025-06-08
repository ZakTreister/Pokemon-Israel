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
  const { title, content } = req.body;

  const update = await Update.create({
    title,
    content,
  });

  res.status(201).json(update);
});

// @desc    Update an update
// @route   PUT /api/updates/:id
// @access  Private/Admin
export const updateUpdate = asyncHandler(async (req, res) => {
  const update = await Update.findById(req.params.id);

  if (update) {
    update.title = req.body.title || update.title;
    update.content = req.body.content || update.content;

    const updatedUpdate = await update.save();
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
    await update.deleteOne();
    res.json({ message: 'Update removed' });
  } else {
    res.status(404);
    throw new Error('Update not found');
  }
});