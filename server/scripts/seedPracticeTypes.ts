import mongoose from 'mongoose';
import { PracticeType } from '../models/PracticeType';

const seedData = [
  {
    title: '关键字训练',
    description: '训练C/C++基础关键字的输入',
    level: 'keyword',
  },
  {
    title: '初级算法',
    description: '训练基础算法代码的输入',
    level: 'basic',
  },
  {
    title: '中级算法',
    description: '训练中级算法代码的输入',
    level: 'intermediate',
  },
  {
    title: '高级算法',
    description: '训练高级算法代码的输入',
    level: 'advanced',
  },
];

const seedPracticeTypes = async () => {
  try {
    await PracticeType.deleteMany({});
    await PracticeType.insertMany(seedData);
    console.log('Practice types seeded successfully');
  } catch (error) {
    console.error('Error seeding practice types:', error);
  }
};

// 运行种子脚本
seedPracticeTypes(); 