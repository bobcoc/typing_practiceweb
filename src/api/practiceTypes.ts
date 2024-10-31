import axios from 'axios';
import { PracticeType } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

export const getPracticeTypes = async (): Promise<PracticeType[]> => {
  try {
    const response = await axios.get<PracticeType[]>(`${API_BASE_URL}/api/practice-types`);
    return response.data;
  } catch (error) {
    console.error('Error fetching practice types:', error);
    return [];
  }
}; 