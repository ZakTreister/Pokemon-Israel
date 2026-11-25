import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, admin } from '../middleware/authMiddleware.js';
import StaticPageText from '../models/staticPageTextModel.js';
import { staticPageDefaults, staticPageTextFields } from '../services/staticPageTexts.js';

const router = express.Router();
const view = (record) => ({ title: record.title, subtitle: record.subtitle, bodyHtml: record.bodyHtml });

router.get('/:key', asyncHandler(async (req, res) => {
  const defaults = staticPageDefaults(req.params.key);
  const record = await StaticPageText.findById(req.params.key);
  res.json(record ? view(record) : defaults);
}));

router.put('/:key', protect, admin, asyncHandler(async (req, res) => {
  staticPageDefaults(req.params.key);
  const fields = staticPageTextFields(req.body);
  const record = await StaticPageText.findOneAndUpdate(
    { _id: req.params.key }, { $set: fields },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.json(view(record));
}));

export default router;
