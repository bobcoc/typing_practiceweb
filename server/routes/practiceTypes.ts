import express from 'express';
import { PracticeType } from '../models/PracticeType';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const practiceTypes = await PracticeType.find();
    res.json(practiceTypes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching practice types' });
  }
});

export default router; 