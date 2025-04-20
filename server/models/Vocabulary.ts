import mongoose, { Document, Schema } from 'mongoose';

// 单词接口
export interface IWord extends Document {
  word: string;
  translation: string;
  pronunciation?: string;
  example?: string;
  wordSet: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// 单词集接口
export interface IWordSet extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  totalWords: number;
  createdAt: Date;
  updatedAt: Date;
}

// 单词学习记录接口
export interface IWordRecord extends Document {
  user: mongoose.Types.ObjectId;
  word: mongoose.Types.ObjectId;
  mode: 'chinese-to-english' | 'audio-to-english' | 'multiple-choice';
  streak: number;
  totalCorrect: number;
  totalWrong: number;
  mastered: boolean;
  inWrongBook: boolean;
  lastTestedAt: Date;
  lastMasteredAt: Date;
  createdAt: Date;
}

// 单词测试记录接口
export interface IVocabularyTestRecord extends Document {
  user: mongoose.Types.ObjectId;
  wordSet: mongoose.Types.ObjectId;
  testType: 'chinese-to-english' | 'audio-to-english' | 'multiple-choice';
  stats: {
    totalWords: number;
    correctWords: number;
    accuracy: number;
    startTime: Date;
    endTime: Date;
    duration: number;
  };
  createdAt: Date;
}

// 单词模式
const WordSchema = new Schema<IWord>({
  word: { type: String, required: true, trim: true },
  translation: { type: String, required: true, trim: true },
  pronunciation: { type: String, trim: true },
  example: { type: String, trim: true },
  wordSet: { type: Schema.Types.ObjectId, ref: 'WordSet', required: true },
}, { timestamps: true });

// 为单词模型添加索引
WordSchema.index({ word: 1, wordSet: 1 }, { unique: true });
WordSchema.index({ translation: 'text', word: 'text' });

// 单词集模式
const WordSetSchema = new Schema<IWordSet>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  totalWords: { type: Number, default: 0 },
}, { timestamps: true });

// 为单词集模型添加索引
WordSetSchema.index({ name: 1, owner: 1 }, { unique: true });

const ModeStatsSchema = new Schema({
  streak: { type: Number, default: 0 },
  totalCorrect: { type: Number, default: 0 },
  totalWrong: { type: Number, default: 0 },
  mastered: { type: Boolean, default: false },
  inWrongBook: { type: Boolean, default: false },
  lastTestedAt: Date,
  lastMasteredAt: Date
}, { _id: false });

const WordRecordSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  word: { type: Schema.Types.ObjectId, ref: 'Word', required: true },
  multipleChoice: { type: ModeStatsSchema, default: () => ({}) },
  audioToEnglish: { type: ModeStatsSchema, default: () => ({}) },
  chineseToEnglish: { type: ModeStatsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now }
});

// 单词测试记录模式
const VocabularyTestRecordSchema = new Schema<IVocabularyTestRecord>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  wordSet: { type: Schema.Types.ObjectId, ref: 'WordSet', required: true },
  testType: { 
    type: String, 
    enum: ['chinese-to-english', 'audio-to-english', 'multiple-choice'],
    required: true 
  },
  stats: {
    totalWords: { type: Number, required: true },
    correctWords: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

// 创建和导出模型
export const Word = mongoose.model<IWord>('Word', WordSchema);
export const WordSet = mongoose.model<IWordSet>('WordSet', WordSetSchema);
export const WordRecord = mongoose.model('WordRecord', WordRecordSchema);
export const VocabularyTestRecord = mongoose.model<IVocabularyTestRecord>('VocabularyTestRecord', VocabularyTestRecordSchema);

export default {
  Word,
  WordSet,
  WordRecord,
  VocabularyTestRecord
}; 