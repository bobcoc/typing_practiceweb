import mongoose from 'mongoose';

const keywordsSchema = new mongoose.Schema({
  content: String,
  updatedAt: { type: Date, default: Date.now }
});

export const Keywords = mongoose.model('Keywords', keywordsSchema); 