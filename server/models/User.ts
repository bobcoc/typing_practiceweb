import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  email?: string;  // 可选字段
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },  
  email: { 
    type: String, 
    required: false,  // 允许为空
    sparse: true     // 只对非空的值建立唯一索引
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema); 