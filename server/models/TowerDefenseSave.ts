// server/models/TowerDefenseSave.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface ITowerDefenseSave extends Document {
  userId: mongoose.Types.ObjectId;
  name: string; // e.g. timestamp string
  state: any; // arbitrary game state JSON
  createdAt: Date;
  updatedAt: Date;
}

const towerDefenseSaveSchema = new Schema<ITowerDefenseSave>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  state: {
    type: Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

towerDefenseSaveSchema.index({ userId: 1, createdAt: -1 });

export const TowerDefenseSave = mongoose.model<ITowerDefenseSave>(
  'TowerDefenseSave',
  towerDefenseSaveSchema
);
