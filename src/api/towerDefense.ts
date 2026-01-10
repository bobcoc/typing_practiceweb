import { api } from './apiClient';

export interface TowerRecordPayload {
  wave: number;
  score: number;
  timeSeconds: number;
}

export const submitTowerRecord = (payload: TowerRecordPayload) =>
  api.post('/tower-defense/record', payload);

export const fetchLeaderboard = (page = 1, limit = 20) =>
  api.get(`/tower-defense/leaderboard?page=${page}&limit=${limit}`);

export const fetchPersonalBest = () => api.get('/tower-defense/personal-best');

export default {
  submitTowerRecord,
  fetchLeaderboard,
  fetchPersonalBest
};
