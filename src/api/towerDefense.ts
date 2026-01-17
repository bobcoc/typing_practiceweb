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

export const saveGame = (state: any) => api.post('/tower-defense/save', { state });

export const fetchSaves = () => api.get('/tower-defense/saves');

export const fetchSave = (id: string) => api.get(`/tower-defense/save/${id}`);

export const deleteSave = (id: string) => api.delete(`/tower-defense/save/${id}`);

export default {
  submitTowerRecord,
  fetchLeaderboard,
  fetchPersonalBest,
  saveGame,
  fetchSaves,
  fetchSave,
  deleteSave
};
