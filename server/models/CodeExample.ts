import mongoose from 'mongoose';

const codeExampleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  level: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced', 'keyword'],
    required: true
  }
}, {
  timestamps: true
});

export const CodeExample = mongoose.model('CodeExample', codeExampleSchema); 