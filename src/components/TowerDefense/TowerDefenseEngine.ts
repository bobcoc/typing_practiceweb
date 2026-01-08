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

  // 核心状态
  money: number = 500;
  score: number = 0;
  life: number = 100;
  wave: number = 0;
  difficulty: number = 1.0;
  wave_damage: number = 0;
  
  is_paused: boolean = true;
  is_debug: boolean = false;
  fps: number = 0;
  exp_fps: number = 24;
  step_time: number = 36;
  grid_size: number = 32;
  padding: number = 10;
  global_speed: number = 0.1;

  // 内部组件
  stage: any;
  eventManager: any;
  lang: any;
  _st: any = null;
  iframe: number = 0;
  last_iframe_time: number = 0;

  // 回调
  onGameOver: (score: number, wave: number) => void;
  onUpdateStats: (stats: GameStats) => void;

  // UI 交互
  public selectedTowerType: string = "cannon";

  constructor(canvas: HTMLCanvasElement, callbacks: { 
    onGameOver: (s: number, w: number) => void,
    onUpdateStats: (stats: GameStats) => void 
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onGameOver = callbacks.onGameOver;
    this.onUpdateStats = callbacks.onUpdateStats;
    
    this.grid_size = 32 * this.retina;
    this.padding = 10 * this.retina;
    
    this.initEngine();
    this.setupEvents();
  }

  private setupEvents() {
    this.canvas.onmousemove = (e) => {
      if (this.is_paused) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * this.retina;
      const y = (e.clientY - rect.top) * this.retina;
      this.eventManager.hover(x, y);
    };
    this.canvas.onclick = (e) => {
      if (this.is_paused) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * this.retina;
      const y = (e.clientY - rect.top) * this.retina;
      this.eventManager.click(x, y);
    };
  }

  private initEngine() {
    const self = this;

    // --- TD.lang 移植 ---
    this.lang = {
      mix: (r: any, s: any) => {
        if (!s || !r) return r;
        for (let p in s) if (s.hasOwnProperty(p)) r[p] = s[p];
        return r;
      },
      rndStr: (n: number = 16) => {
        let chars = "1234567890abcdefghijklmnopqrstuvwxyz", a = [];
        for (let i = 0; i < n; i++) a.push(chars.charAt(Math.floor(Math.random() * chars.length)));
        return a.join("");
      },
      each: (list: any[], f: Function) => list && list.forEach((v, i) => f(v, i)),
      any: (list: any[], f: Function) => {
        for (let i = 0; i < (list ? list.length : 0); i++) if (f(list[i])) return list[i];
        return null;
      },
      shift: (list: any[], f: Function) => {
        while (list && list.length > 0) f(list.shift());
      },
      rndSort: (list: any[]) => [...list].sort(() => Math.random() - 0.5),
      rgb2Arr: (rgb: string) => {
        if (rgb.length != 7) return [0, 0, 0];
        return [parseInt(rgb.substr(1, 2), 16), parseInt(rgb.substr(3, 2), 16), parseInt(rgb.substr(5, 2), 16)];
      },
      nullFunc: () => {}
    };

    // --- TD.eventManager 移植 ---
    this.eventManager = {
      ex: -1, ey: -1, _registers: {} as any, current_type: "hover",
      isOn: (el: any) => this.eventManager.ex > el.x && this.eventManager.ex < el.x2 && this.eventManager.ey > el.y && this.eventManager.ey < el.y2,
      on: (el: any, type: string, f: Function) => {
        this.eventManager._registers[el.id + "::" + type] = [el, type, f];
      },
      clear: () => { this.eventManager._registers = {}; },
      hover: (x: number, y: number) => {
        if (this.eventManager.current_type == "click") return;
        this.eventManager.current_type = "hover";
        this.eventManager.ex = x; this.eventManager.ey = y;
      },
      click: (x: number, y: number) => {
        this.eventManager.current_type = "click";
        this.eventManager.ex = x; this.eventManager.ey = y;
      },
      step: () => {
        if (!this.eventManager.current_type) return;
        for (let k in this.eventManager._registers) {
          const [el, et, f] = this.eventManager._registers[k];
          if (!el.is_valid || !el.is_visiable) continue;
          const is_on = this.eventManager.isOn(el);
          if (this.eventManager.current_type != "click") {
            if (et == "hover" && el.is_hover && is_on) f();
            else if (et == "enter" && !el.is_hover && is_on) { el.is_hover = true; f(); }
            else if (et == "out" && el.is_hover && !is_on) { el.is_hover = false; f(); }
          } else if (is_on && et == "click") f();
        }
        this.eventManager.current_type = "";
      }
    };

    // --- FindWay 移植 ---
    const FindWay = function(this: any, w: number, h: number, x1: number, y1: number, x2: number, y2: number, fPassable: Function) {
      this.m = []; this.w = w; this.h = h; this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
      this.way = []; this.fPassable = fPassable; this.is_arrived = false; this.is_blocked = false;
      this.init = () => {
        if (this.x1 == this.x2 && this.y1 == this.y2) { this.way = [[this.x1, this.y1]]; return; }
        for (let i = 0; i < this.w * this.h; i++) this.m[i] = -2;
        let current = [[this.x1, this.y1]], dist = 0;
        this.m[this.y1 * this.w + this.x1] = 0;
        while (current.length > 0) {
          dist++; let nextStep: any[] = [];
          for (let [cx, cy] of current) {
            [[cx, cy-1], [cx+1, cy], [cx, cy+1], [cx-1, cy]].forEach(([nx, ny]) => {
              if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h && this.m[ny*this.w+nx] == -2) {
                if (fPassable(nx, ny)) {
                  this.m[ny*this.w+nx] = dist; nextStep.push([nx, ny]);
                  if (nx == this.x2 && ny == this.y2) { this.is_arrived = true; }
                } else this.m[ny*this.w+nx] = -1;
              }
            });
          }
          current = nextStep; if (this.is_arrived) break;
        }
        if (this.is_arrived) this.findPath(); else this.is_blocked = true;
      };
      this.findPath = () => {
        let x = this.x2, y = this.y2;
        while (x != this.x1 || y != this.y1) {
          this.way.unshift([x, y]);
          let minV = -1, next = null;
          [[x, y-1], [x+1, y], [x, y+1], [x-1, y]].forEach(([nx, ny]) => {
            if (nx>=0 && nx<this.w && ny>=0 && ny<this.h) {
              let v = this.m[ny*this.w+nx];
              if (v >= 0 && (minV == -1 || v < minV)) { minV = v; next = [nx, ny]; }
            }
          });
          if (next) [x, y] = next; else break;
        }
      };
      this.init();
    } as any;

    // --- 基类 Element ---
    class Element {
      id: string; is_valid = true; is_visiable = true; is_paused = false; is_hover = false;
      x: number; y: number; width: number; height: number; cx: number = 0; cy: number = 0; x2: number = 0; y2: number = 0;
      step_level: number; render_level: number; scene: any;
      constructor(id: string, cfg: any) {
        this.id = id || "el-" + self.lang.rndStr();
        this.x = cfg.x || 0; this.y = cfg.y || 0;
        this.width = cfg.width || 0; this.height = cfg.height || 0;
        this.step_level = cfg.step_level || 1;
        this.render_level = cfg.render_level || 0;
        this.calculatePos();
      }
      calculatePos() {
        this.cx = this.x + this.width / 2; this.cy = this.y + this.height / 2;
        this.x2 = this.x + this.width; this.y2 = this.y + this.height;
      }
      on(type: string, f: Function) { self.eventManager.on(this, type, f); }
      addToScene(s: any, sl: number, rl: number) {
        this.scene = s; this.step_level = sl || this.step_level; this.render_level = rl || this.render_level;
        s.addElement(this, this.step_level, this.render_level);
      }
      del() { this.is_valid = false; }
      step() {}
      render() {}
    }

    // --- Grid 类 ---
    class Grid extends Element {
      map: any; mx: number; my: number; passable_flag = 1; build_flag = 1; building: any = null;
      is_entrance = false; is_exit = false;
      constructor(id: string, cfg: any) {
        super(id, cfg);
        this.map = cfg.map; this.mx = cfg.mx; this.my = cfg.my;
        this.width = self.grid_size; this.height = self.grid_size;
        this.calculatePos();
        this.on("enter", () => this.onEnter());
        this.on("out", () => this.onOut());
        this.on("click", () => this.onClick());
      }
      calculatePos() {
        this.x = this.map.x + this.mx * self.grid_size;
        this.y = this.map.y + this.my * self.grid_size;
        super.calculatePos();
      }
      onEnter() {
        if (self.stage.mode == "build" && this.build_flag == 1) {
          this.map.pre_building.is_visiable = true;
          this.map.pre_building.locate(this);
        }
      }
      onOut() {
        if (self.stage.mode == "build" && this.map.pre_building.grid === this) {
          this.map.pre_building.is_visiable = false;
        }
      }
      onClick() {
        if (self.stage.mode == "build" && this.build_flag == 1) {
          if (this.checkBlock()) return;
          this.buyBuilding(this.map.pre_building.type);
        }
      }
      checkBlock() {
        if (this.is_entrance || this.is_exit) return true;
        let fw = new FindWay(this.map.grid_x, this.map.grid_y, this.map.entrance.mx, this.map.entrance.my, this.map.exit.mx, this.map.exit.my, (x: number, y: number) => {
          return !(x == this.mx && y == this.my) && this.map.checkPassable(x, y);
        });
        return fw.is_blocked;
      }
      buyBuilding(type: string) {
        const cost = self.getBuildingCost(type);
        if (self.money >= cost) {
          self.money -= cost;
          this.addBuilding(type);
          self.updateStats();
        }
      }
      addBuilding(type: string) {
        const b = new Building("b-"+self.lang.rndStr(), { type, map: this.map, grid: this });
        b.locate(this);
        this.map.buildings.push(b);
        this.building = b; this.build_flag = 2;
        this.scene.addElement(b, 1, 3);
        this.map.monsters.forEach((m: any) => m.findWay());
      }
      render() {
        const ctx = self.ctx;
        if (this.is_hover) { ctx.fillStyle = "rgba(255, 255, 200, 0.3)"; ctx.fillRect(this.x, this.y, this.width, this.height); }
        if (this.is_entrance || this.is_exit) {
          ctx.fillStyle = "#ccc"; ctx.fillRect(this.x, this.y, this.width, this.height);
          ctx.fillStyle = this.is_entrance ? "#fff" : "#666";
          ctx.beginPath(); ctx.arc(this.cx, this.cy, self.grid_size*0.3, 0, Math.PI*2); ctx.fill();
        }
        ctx.strokeStyle = "#eee"; ctx.lineWidth = 1; ctx.strokeRect(this.x, this.y, this.width, this.height);
      }
    }

    // --- Building 类 ---
    class Building extends Element {
      type: string; map: any; grid: any; target: any = null; range: number; range_px: number; damage: number; speed: number; bullet_speed: number;
      _fire_wait: number = 0; color: string;
      constructor(id: string, cfg: any) {
        super(id, cfg);
        this.type = cfg.type; this.map = cfg.map; this.grid = cfg.grid;
        const attr = self.getBuildingAttr(this.type);
        this.range = attr.range; this.damage = attr.damage; this.speed = attr.speed; this.bullet_speed = attr.bullet_speed;
        this.range_px = this.range * self.grid_size;
        this.color = attr.color;
        this._fire_wait = Math.floor(24 / this.speed);
      }
      locate(grid: any) { this.grid = grid; this.x = grid.x; this.y = grid.y; this.calculatePos(); }
      step() {
        this.findTarget();
        if (this.target) {
          this._fire_wait--;
          if (this._fire_wait <= 0) { this.fire(); this._fire_wait = Math.floor(24 / this.speed); }
        }
      }
      findTarget() {
        if (this.target && this.target.is_valid && Math.sqrt(Math.pow(this.target.cx-this.cx, 2)+Math.pow(this.target.cy-this.cy, 2)) <= this.range_px) return;
        this.target = self.lang.any(this.map.monsters, (m: any) => Math.sqrt(Math.pow(m.cx-this.cx, 2)+Math.pow(m.cy-this.cy, 2)) <= this.range_px);
      }
      fire() {
        new Bullet(null, { building: this, target: this.target, damage: this.damage, speed: this.bullet_speed, x: this.cx, y: this.cy });
      }
      render() {
        const ctx = self.ctx;
        self.renderBuildingVisual(this);
        if (this.is_hover || (this.grid && this.grid.is_hover)) {
          ctx.beginPath(); ctx.arc(this.cx, this.cy, this.range_px, 0, Math.PI*2);
          ctx.fillStyle = "rgba(187, 141, 32, 0.15)"; ctx.fill();
          ctx.strokeStyle = "#bb8d20"; ctx.stroke();
        }
      }
    }

    // --- Monster 类 ---
    class Monster extends Element {
      idx: number; hp: number; maxHp: number; speed: number; money: number; damage: number;
      grid: any; next_grid: any = null; way: any[] = []; color: string;
      constructor(id: string, cfg: any) {
        super(id, cfg);
        this.idx = cfg.idx;
        const attr = self.getMonsterAttr(this.idx);
        this.hp = this.maxHp = attr.life * (self.difficulty + 0.5);
        this.speed = attr.speed * self.global_speed;
        this.money = attr.money || 10;
        this.damage = attr.damage || 1;
        this.color = attr.color || "#f00";
        this.width = self.grid_size * 0.5; this.height = self.grid_size * 0.5;
      }
      beAddToGrid(grid: any) { this.grid = grid; this.x = grid.x; this.y = grid.y; this.calculatePos(); this.findWay(); }
      findWay() {
        let fw = new FindWay(this.grid.map.grid_x, this.grid.map.grid_y, this.grid.mx, this.grid.my, this.grid.map.exit.mx, this.grid.map.exit.my, (x: number, y: number) => this.grid.map.checkPassable(x, y));
        this.way = fw.way;
      }
      step() {
        if (!this.next_grid) {
          if (this.way.length > 0) {
            let next = this.way.shift();
            this.next_grid = this.grid.map.getGrid(next[0], next[1]);
          } else {
            self.life -= this.damage; self.wave_damage += this.damage; this.del(); self.updateStats();
            if (self.life <= 0) self.gameOver(); return;
          }
        }
        let dx = this.next_grid.cx - this.cx, dy = this.next_grid.cy - this.cy, dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.speed) { this.cx = this.next_grid.cx; this.cy = this.next_grid.cy; this.grid = this.next_grid; this.next_grid = null; }
        else { this.cx += (dx/dist)*this.speed; this.cy += (dy/dist)*this.speed; }
        this.x = this.cx - this.width/2; this.y = this.cy - this.height/2; this.calculatePos();
      }
      beHit(damage: number) {
        this.hp -= damage;
        if (this.hp <= 0) { this.del(); self.money += this.money; self.score += 10; self.updateStats(); }
      }
      render() {
        const ctx = self.ctx;
        ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.cx, this.cy, this.width/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.fillRect(this.cx - 10, this.cy - this.width - 5, 20, 4);
        ctx.fillStyle = "#f00"; ctx.fillRect(this.cx - 10, this.cy - this.width - 5, (this.hp/this.maxHp)*20, 4);
      }
    }

    // --- Bullet 类 ---
    class Bullet extends Element {
      target: any; damage: number; speed: number; vx = 0; vy = 0;
      constructor(id: string, cfg: any) {
        super(id, cfg);
        this.target = cfg.target; this.damage = cfg.damage; this.speed = cfg.speed;
        let dx = this.target.cx - this.x, dy = this.target.cy - this.y, dist = Math.sqrt(dx*dx + dy*dy);
        let s = this.speed * self.global_speed * 10;
        this.vx = (dx/dist)*s; this.vy = (dy/dist)*s;
        cfg.building.map.scene.addElement(this, 1, 5);
      }
      step() {
        this.x += this.vx; this.y += this.vy; this.calculatePos();
        if (this.x < 0 || this.x > self.canvas.width || this.y < 0 || this.y > self.canvas.height) { this.del(); return; }
        let hit = self.lang.any(this.scene.elements[1], (el: any) => el instanceof Monster && Math.sqrt(Math.pow(el.cx-this.cx, 2)+Math.pow(el.cy-this.cy, 2)) < el.width);
        if (hit) { hit.beHit(this.damage); this.del(); }
      }
      render() { const ctx = self.ctx; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(this.cx, this.cy, 2, 0, Math.PI*2); ctx.fill(); }
    }

    // --- Map 类 ---
    class Map extends Element {
      grid_x: number; grid_y: number; grids: any[] = []; entrance: any; exit: any; buildings: any[] = []; monsters: any[] = [];
      pre_building: any;
      constructor(id: string, cfg: any) {
        super(id, cfg);
        this.grid_x = cfg.grid_x; this.grid_y = cfg.grid_y;
        for (let i = 0; i < this.grid_x * this.grid_y; i++) {
          this.grids.push(new Grid(this.id+"-g-"+i, { map: this, mx: i % this.grid_x, my: Math.floor(i / this.grid_x) }));
        }
        this.entrance = this.getGrid(cfg.entrance[0], cfg.entrance[1]); this.entrance.is_entrance = true;
        this.exit = this.getGrid(cfg.exit[0], cfg.exit[1]); this.exit.is_exit = true;
        this.pre_building = new Building("pre", { type: "cannon", map: this });
        this.pre_building.is_visiable = false;
      }
      getGrid(x: number, y: number) { return this.grids[y * this.grid_x + x]; }
      checkPassable(x: number, y: number) { let g = this.getGrid(x, y); return g && g.passable_flag == 1 && g.build_flag != 2; }
      step() {
        this.buildings = this.buildings.filter(b => b.is_valid);
        this.monsters = this.monsters.filter(m => m.is_valid);
      }
      render() { self.ctx.strokeStyle = "#000"; self.ctx.strokeRect(this.x, this.y, this.width, this.height); }
    }

    // --- Scene 类 ---
    class Scene {
      elements: any = {};
      addElement(el: any, sl: number, rl: number) {
        if (!this.elements[sl]) this.elements[sl] = [];
        this.elements[sl].push(el);
      }
      step() {
        for (let sl in this.elements) {
          this.elements[sl] = this.elements[sl].filter((el: any) => el.is_valid);
          this.elements[sl].forEach((el: any) => el.step());
        }
      }
      render() {
        let all: any[] = [];
        for (let sl in this.elements) all = all.concat(this.elements[sl]);
        all.sort((a, b) => (a.render_level || 0) - (b.render_level || 0));
        all.forEach(el => el.render());
      }
    }

    // --- Stage 类 ---
    this.stage = {
      mode: "normal", scene: new Scene(),
      init: () => {
        const map = new Map("main-map", { x: self.padding, y: self.padding, grid_x: 16, grid_y: 16, entrance: [0, 0], exit: [15, 15] });
        this.stage.map = map;
        this.stage.scene.addElement(map, 1, 1);
        map.grids.forEach(g => this.stage.scene.addElement(g, 1, 2));
        this.stage.scene.addElement(map.pre_building, 1, 10);
      },
      step: () => { this.stage.scene.step(); },
      render: () => { this.stage.scene.render(); }
    };

    (this as any).Monster = Monster; // 暴露给内部使用

    this.stage.init();
  }

  // --- 属性定义移植 ---
  private getBuildingAttr(type: string) {
    const attrs: any = {
      "cannon": { damage: 12, range: 4, speed: 2, bullet_speed: 6, cost: 300, color: "#393" },
      "LMG": { damage: 5, range: 5, speed: 3, bullet_speed: 6, cost: 100, color: "#36f" },
      "HMG": { damage: 30, range: 3, speed: 3, bullet_speed: 5, cost: 800, color: "#933" },
      "wall": { damage: 0, range: 0, speed: 0, bullet_speed: 0, cost: 5, color: "#666" }
    };
    return attrs[type] || attrs["cannon"];
  }

  private getBuildingCost(type: string) { return this.getBuildingAttr(type).cost; }

  private getMonsterAttr(idx: number) {
    const attrs = [
      { name: "m1", life: 50, speed: 3, damage: 1, color: "#f00" },
      { name: "m2", life: 80, speed: 5, damage: 2, color: "#0f0" },
      { name: "m3", life: 120, speed: 7, damage: 3, color: "#00f" }
    ];
    return attrs[idx % attrs.length];
  }

  // --- 渲染移植 ---
  private renderBuildingVisual(b: any) {
    const ctx = this.ctx;
    const gs2 = this.grid_size / 2;
    if (b.type == "wall") {
      ctx.fillStyle = "#666"; ctx.fillRect(b.x+2, b.y+2, this.grid_size-4, this.grid_size-4);
      ctx.strokeStyle = "#000"; ctx.strokeRect(b.x+2, b.y+2, this.grid_size-4, this.grid_size-4);
      return;
    }
    ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.cx, b.cy, gs2 - 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.cx, b.cy);
    let tx = b.target ? b.target.cx : b.cx, ty = b.target ? b.target.cy : b.cy - 100;
    let angle = Math.atan2(ty - b.cy, tx - b.cx);
    ctx.lineTo(b.cx + Math.cos(angle)*gs2, b.cy + Math.sin(angle)*gs2); ctx.stroke();
  }

  private updateStats() {
    this.onUpdateStats({ money: this.money, score: this.score, life: this.life, wave: this.wave, difficulty: this.difficulty });
  }

  // --- 主循环 ---
  start() {
    this.is_paused = false;
    this.last_iframe_time = Date.now();
    this.updateStats();
    this.step();
  }

  private step() {
    if (this.is_paused) return;
    this.iframe++;
    if (this.iframe % 50 == 0) {
      let t = Date.now(); this.fps = Math.round(50000 / (t - this.last_iframe_time)); this.last_iframe_time = t;
    }
    
    // 生成怪物逻辑
    if (this.stage.map.monsters.length == 0) {
      this.wave++; this.difficulty *= 1.1;
      for(let i=0; i<5+this.wave; i++) {
        setTimeout(() => {
          if (this.is_paused) return;
          const m = new (this as any).Monster(null, { idx: Math.floor(Math.random()*3), step_level: 1, render_level: 4 });
          m.beAddToGrid(this.stage.map.entrance);
        }, i * 1000);
      }
      this.updateStats();
    }

    this.eventManager.step();
    this.stage.step();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.stage.render();
    this._st = setTimeout(() => this.step(), this.step_time);
  }

  private gameOver() { this.is_paused = true; this.onGameOver(this.score, this.wave); }
  destroy() { this.is_paused = true; if (this._st) clearTimeout(this._st); }
}
