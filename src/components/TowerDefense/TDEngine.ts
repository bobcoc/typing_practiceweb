// src/components/TowerDefense/TDEngine.ts
/* eslint-disable */

export interface GameStats {
  money: number;
  score: number;
  life: number;
  wave: number;
  difficulty: number;
}

export class TDEngine {
  retina: number = window.devicePixelRatio || 1;
  money: number = 500;
  score: number = 0;
  life: number = 100;
  difficulty: number = 1;
  wave_damage: number = 0;
  global_speed: number = 0.1;
  is_paused: boolean = true;
  is_debug: boolean = false;
  fps: number = 0;
  exp_fps: number = 24;
  step_time: number = 36;
  grid_size: number = 0;
  padding: number = 0;
  
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stage: any;
  eventManager: any;
  lang: any;
  
  onGameOver: (score: number, wave: number) => void;
  onUpdateStats: (stats: GameStats) => void;

  constructor(canvas: HTMLCanvasElement, options: { 
    onGameOver: (s: number, w: number) => void,
    onUpdateStats: (s: GameStats) => void
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onGameOver = options.onGameOver;
    this.onUpdateStats = options.onUpdateStats;
    this.grid_size = 32 * this.retina;
    this.padding = 10 * this.retina;
    
    this.init();
  }

  // 这里的 init 会包含原版 JS 中所有的 _TD.a.push 内容的合并与适配
  private init() {
    const self = this;
    
    // 工具函数
    this.lang = {
      $e: (id: string) => document.getElementById(id),
      mix: (t: any, s: any) => { for(let k in s) if(s.hasOwnProperty(k)) t[k]=s[k]; return t; },
      rndRGB: () => `rgb(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0})`,
      rgb2Arr: (c: string) => { const m = c.match(/\d+/g); return m ? m.map(Number) : [0,0,0]; },
      strLen2: (s: string) => s.replace(/[^\x00-\xff]/g, "**").length,
      each: (a: any[], f: any) => a && a.forEach(f),
      any: (a: any[], f: any) => a && a.find(f),
      shift: (a: any[], f: any) => { if(a) while(a.length) f(a.shift()); },
      rndSort: (a: any[]) => [...a].sort(() => Math.random() - 0.5),
      nullFunc: () => {},
      arrayEqual: (a: any[], b: any[]) => JSON.stringify(a) === JSON.stringify(b)
    };

    // 事件管理
    this.eventManager = {
      ex: -1, ey: -1, _registers: {} as any,
      ontypes: ["enter", "hover", "out", "click"],
      current_type: "hover",
      isOn: (el: any) => self.eventManager.ex > el.x && self.eventManager.ex < el.x2 && self.eventManager.ey > el.y && self.eventManager.ey < el.y2,
      on: (el: any, type: string, fn: any) => { self.eventManager._registers[el.id + "::" + type] = [el, type, fn]; },
      clear: () => { self.eventManager._registers = {}; },
      step: () => {
        if (!self.eventManager.current_type) return;
        for (let k in self.eventManager._registers) {
          const [el, type, fn] = self.eventManager._registers[k];
          if (!el.is_valid || !el.is_visiable) continue;
          const is_on = self.eventManager.isOn(el);
          if (self.eventManager.current_type === "click") {
            if (is_on && type === "click") fn();
          } else {
            if (type === "hover" && el.is_hover && is_on) fn();
            else if (type === "enter" && !el.is_hover && is_on) { el.is_hover = true; fn(); }
            else if (type === "out" && el.is_hover && !is_on) { el.is_hover = false; fn(); }
          }
        }
        self.eventManager.current_type = "";
      }
    };

    // 定义核心类
    class Element {
      id: string; is_valid = true; is_visiable = true; is_paused = false; is_hover = false;
      x: number = 0; y: number = 0; width: number = 0; height: number = 0; cx: number = 0; cy: number = 0; x2: number = 0; y2: number = 0;
      step_level: number; render_level: number; scene: any;
      constructor(id: string, cfg: any) {
        this.id = id || "el-" + (Math.random()*1e9|0);
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
      on(type: string, fn: any) { self.eventManager.on(this, type, fn); }
      addToScene(s: any, sl: number, rl: number) {
        this.scene = s; this.step_level = sl || this.step_level; this.render_level = rl || this.render_level;
        s.addElement(this, this.step_level, this.render_level);
      }
      del() { this.is_valid = false; }
      step() {}
      render() {}
    }

    // ... 此处需要填入 Map, Grid, Monster, Building, Bullet, Panel 等所有类的完整迁移代码
    // 由于篇幅限制，我将先提供一个骨架，并在随后补全。
  }
}
