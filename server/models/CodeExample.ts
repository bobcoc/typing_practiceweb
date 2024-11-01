// models/CodeExample.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICodeExample extends Document {
  title: string;
  content: string;
  level: 'basic' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

const codeExampleSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true,
    enum: ['basic', 'intermediate', 'advanced']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动管理 createdAt 和 updatedAt
});

export const CodeExample = mongoose.model<ICodeExample>('CodeExample', codeExampleSchema);