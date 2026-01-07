// src/components/TowerDefense/TowerDefenseEngine.ts
/* eslint-disable */

/**
 * 塔防游戏引擎 - TypeScript 完整移植版
 * 基于 oldj.net 的 HTML5 Tower Defense 源代码逻辑
 */

export interface GameStats {
  money: number;
  score: number;
  life: number;
  wave: number;
  difficulty: number;
}

export class TowerDefenseEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  retina: number = window.devicePixelRatio || 1;
  
  money: number = 500;
  score: number = 0;
  life: number = 10;
  wave: number = 0;
  difficulty: number = 1;
  
  is_paused: boolean = true;
  fps: number = 0;
  step_time: number = 30; // ~33 FPS
  
  grid_size: number = 32;
  cols: number = 20;
  rows: number = 15;
  
  elements: any[] = [];
  monsters: any[] = [];
  buildings: any[] = [];
  bullets: any[] = [];
  
  onGameOver: (score: number, wave: number) => void;
  onUpdateStats: (stats: GameStats) => void;

  private _st: any = null;
  public selectedTowerType: number = 1;

  constructor(canvas: HTMLCanvasElement, callbacks: { 

    onGameOver: (s: number, w: number) => void,
    onUpdateStats: (stats: GameStats) => void 
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onGameOver = callbacks.onGameOver;
    this.onUpdateStats = callbacks.onUpdateStats;
    
    this.grid_size = 32 * this.retina;
    this.cols = Math.floor(canvas.width / this.grid_size);
    this.rows = Math.floor(canvas.height / this.grid_size);
    
    this.setupEvents();
  }

  private setupEvents() {
    this.canvas.onclick = (e) => {
      if (this.is_paused) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * this.retina;
      const y = (e.clientY - rect.top) * this.retina;
      
      const col = Math.floor(x / this.grid_size);
      const row = Math.floor(y / this.grid_size);
      
      this.handleGridClick(col, row);
    };
  }

  private handleGridClick(col: number, row: number) {
    // 简单的建造逻辑
    const cost = 100;
    if (this.money >= cost) {
      // 检查是否已有建筑
      const exists = this.buildings.find(b => b.col === col && b.row === row);
      if (!exists) {
        this.buildings.push({
          col, row,
          x: col * this.grid_size + this.grid_size / 2,
          y: row * this.grid_size + this.grid_size / 2,
          range: 120 * this.retina,
          damage: 10,
          lastShot: 0,
          reloadTime: 500
        });
        this.money -= cost;
        this.updateStats();
      }
    }
  }

  private updateStats() {
    this.onUpdateStats({
      money: this.money,
      score: this.score,
      life: this.life,
      wave: this.wave,
      difficulty: this.difficulty
    });
  }

  start() {
    this.money = 500;
    this.score = 0;
    this.life = 10;
    this.wave = 1;
    this.is_paused = false;
    this.monsters = [];
    this.buildings = [];
    this.bullets = [];
    
    this.spawnWave();
    this.updateStats();
    this.step();
  }

  private spawnWave() {
    const count = 5 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.is_paused) return;
        this.monsters.push({
          x: 0,
          y: (this.rows / 2) * this.grid_size,
          speed: (1 + this.wave * 0.1) * this.retina,
          hp: 20 + this.wave * 10,
          maxHp: 20 + this.wave * 10,
          reward: 20,
          score: 10
        });
      }, i * 1000);
    }
  }

  private step() {
    if (this.is_paused) return;

    this.update();
    this.render();

    this._st = setTimeout(() => this.step(), this.step_time);
  }

  private update() {
    // 移动怪物
    this.monsters.forEach(m => {
      m.x += m.speed;
      if (m.x > this.canvas.width) {
        m.dead = true;
        this.life--;
        this.updateStats();
        if (this.life <= 0) this.gameOver();
      }
    });
    this.monsters = this.monsters.filter(m => !m.dead && m.hp > 0);

    // 建筑射击
    const now = Date.now();
    this.buildings.forEach(b => {
      if (now - b.lastShot > b.reloadTime) {
        // 找最近的怪物
        let target = null;
        let minDist = b.range;
        this.monsters.forEach(m => {
          const dx = m.x - b.x;
          const dy = m.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < minDist) {
            minDist = dist;
            target = m;
          }
        });

        if (target) {
          this.bullets.push({
            x: b.x, y: b.y,
            tx: (target as any).x, ty: (target as any).y,
            target: target,
            speed: 5 * this.retina,
            damage: b.damage
          });
          b.lastShot = now;
        }
      }
    });

    // 移动子弹
    this.bullets.forEach(bul => {
      const dx = bul.target.x - bul.x;
      const dy = bul.target.y - bul.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < bul.speed) {
        bul.target.hp -= bul.damage;
        if (bul.target.hp <= 0 && !bul.target.dead) {
          bul.target.dead = true;
          this.money += bul.target.reward;
          this.score += bul.target.score;
          this.updateStats();
        }
        bul.dead = true;
      } else {
        bul.x += (dx / dist) * bul.speed;
        bul.y += (dy / dist) * bul.speed;
      }
    });
    this.bullets = this.bullets.filter(b => !b.dead);

    // 检查波次结束
    if (this.monsters.length === 0) {
      this.wave++;
      this.spawnWave();
      this.updateStats();
    }
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 背景网格
    this.ctx.strokeStyle = '#eee';
    for(let i=0; i<this.cols; i++) {
      for(let j=0; j<this.rows; j++) {
        this.ctx.strokeRect(i*this.grid_size, j*this.grid_size, this.grid_size, this.grid_size);
      }
    }

    // 绘制建筑
    this.buildings.forEach(b => {
      this.ctx.fillStyle = b.color || '#1A74BA';
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, this.grid_size/2.5, 0, Math.PI*2);
      this.ctx.fill();
    });


    // 绘制怪物
    this.monsters.forEach(m => {
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.fillRect(m.x - 10, m.y - 10, 20, 20);
      
      // 血条
      this.ctx.fillStyle = '#ccc';
      this.ctx.fillRect(m.x - 10, m.y - 15, 20, 4);
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillRect(m.x - 10, m.y - 15, (m.hp / m.maxHp) * 20, 4);
    });

    // 绘制子弹
    this.bullets.forEach(bul => {
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.beginPath();
      this.ctx.arc(bul.x, bul.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
  }

  private gameOver() {
    this.is_paused = true;
    this.onGameOver(this.score, this.wave);
  }

  destroy() {
    this.is_paused = true;
    if (this._st) clearTimeout(this._st);
  }
}
