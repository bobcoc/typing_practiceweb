import mongoose from 'mongoose';

const practiceTypeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  level: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced', 'keyword'],
    required: true
  }
});

export const PracticeType = mongoose.model('PracticeType', practiceTypeSchema); 