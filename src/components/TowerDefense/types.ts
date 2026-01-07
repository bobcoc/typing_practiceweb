// src/components/TowerDefense/types.ts

export type ElementEvent = 'enter' | 'out' | 'hover' | 'click';

export interface GameConfig {
  version: string;
  is_debug: boolean;
  is_paused: boolean;
  width: number;
  height: number;
  show_monster_life: boolean;
  fps: number;
  exp_fps: number;
  stage_data: any;
  step_time: number;
  grid_size: number;
  padding: number;
  global_speed: number;
  money: number;
  score: number;
  life: number;
  difficulty: number;
  wave_damage: number;
  retina: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseAttributes {
  damage: number;
  range: number;
  speed: number;
  life: number;
  shield: number;
  cost: number;
}

export interface BuildingAttributes extends BaseAttributes {
  max_range?: number;
  bullet_speed?: number;
  _upgrade_rule_damage?: (level: number, damage: number) => number;
}

export interface MonsterAttributes {
  name: string;
  desc: string;
  speed: number;
  max_speed: number;
  life: number;
  damage: number;
  shield: number;
  money?: number;
  color?: string;
  render?: (ctx: CanvasRenderingContext2D) => void;
}
