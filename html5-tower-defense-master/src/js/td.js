/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 */

var _TD = {
	a: [],
	retina: window.devicePixelRatio || 1,
	init: function (td_board, is_debug) {
		delete this.init; // 一旦初始化运行，即删除这个入口引用，防止初始化方法被再次调用

		var i, TD = {
			version: "0.1.17", // 版本命名规范参考：http://semver.org/
			is_debug: !!is_debug,
			is_paused: true,
			width: 16, // 横向多少个格子
			height: 16, // 纵向多少个格子
			show_monster_life: true, // 是否显示怪物的生命值
			fps: 0,
			exp_fps: 24, // 期望的 fps
			exp_fps_half: 12,
			exp_fps_quarter: 6,
			exp_fps_eighth: 4,
			stage_data: {},
			defaultSettings: function () {
				return {
					step_time: 36, // 每一次 step 循环之间相隔多少毫秒
					grid_size: 32 * _TD.retina, // px
					padding: 10 * _TD.retina, // px
					global_speed: 0.1 // 全局速度系数
				};
			},

			/**
			 * 初始化
			 * @param ob_board
			 */
			init: function (ob_board/*, ob_info*/) {
				this.obj_board = TD.lang.$e(ob_board);
				this.canvas = this.obj_board.getElementsByTagName("canvas")[0];
				//this.obj_info = TD.lang.$e(ob_info);
				if (!this.canvas.getContext) return; // 不支持 canvas
				this.ctx = this.canvas.getContext("2d");
				// 让 canvas 可聚焦以确保能接收键盘/鼠标交互
				try {
					this.canvas.tabIndex = 0;
					this.canvas.style.outline = 'none';
				} catch (e) {}


				this.monster_type_count = TD.getDefaultMonsterAttributes(); // 一共有多少种怪物
				this.iframe = 0; // 当前播放到第几帧了
				this.last_iframe_time = (new Date()).getTime();
				this.fps = 0;

				this.start();
			},

			/**
			 * 开始游戏，或重新开始游戏
			 */
			start: function () {
				clearTimeout(this._st);
				TD.log("Start!");
				var _this = this;
				this._exp_fps_0 = this.exp_fps - 0.4; // 下限
				this._exp_fps_1 = this.exp_fps + 0.4; // 上限

				this.mode = "normal"; // mode 分为 normail（普通模式）及 build（建造模式）两种
				this.eventManager.clear(); // 清除事件管理器中监听的事件
				this.lang.mix(this, this.defaultSettings());
				this.stage = new TD.Stage("stage-main", TD.getDefaultStageData("stage_main"));

				this.canvas.setAttribute("width", this.stage.width);
				this.canvas.setAttribute("height", this.stage.height);
				this.canvas.style.width = (this.stage.width / _TD.retina) + "px";
				this.canvas.style.height = (this.stage.height / _TD.retina) + "px";

				this.canvas.onmousemove = function (e) {
					var xy = _this.getEventXY.call(_this, e);
				_this.hover(xy[0], xy[1]);
			};
			this.canvas.onclick = function (e) {
				var xy = _this.getEventXY.call(_this, e);
				_this.click(xy[0], xy[1]);
			};

				this.is_paused = false;
				this.stage.start();

				// 记录游戏开始时间（用于计算时长并在结束时上报）
				this.startedAt = (new Date()).getTime();

				this.step();

				return this;
			},

			/**
			 * 作弊方法
			 * @param cheat_code
			 *
			 * 用例：
			 * 1、增加 100 万金钱：javascript:_TD.cheat="money+";void(0);
			 * 2、难度增倍：javascript:_TD.cheat="difficulty+";void(0);
			 * 3、难度减半：javascript:_TD.cheat="difficulty-";void(0);
			 * 4、生命值恢复：javascript:_TD.cheat="life+";void(0);
			 * 5、生命值降为最低：javascript:_TD.cheat="life-";void(0);
			 */
			checkCheat: function (cheat_code) {
				switch (cheat_code) {
					case "money+":
						this.money += 1000000;
						this.log("cheat success!");
						break;
					case "life+":
						this.life = 100;
						this.log("cheat success!");
						break;
					case "life-":
						this.life = 1;
						this.log("cheat success!");
						break;
					case "difficulty+":
						this.difficulty *= 2;
						this.log("cheat success! difficulty = " + this.difficulty);
						break;
					case "difficulty-":
						this.difficulty /= 2;
						this.log("cheat success! difficulty = " + this.difficulty);
						break;
				}
			},

			/**
			 * 主循环方法
			 */
			step: function () {

				if (this.is_debug && _TD && _TD.cheat) {
					// 检查作弊代码
					this.checkCheat(_TD.cheat);
					_TD.cheat = "";
				}

				if (this.is_paused) return;

				this.iframe++; // 当前总第多少帧
				if (this.iframe % 50 == 0) {
					// 计算 fps
					var t = (new Date()).getTime(),
						step_time = this.step_time;
					this.fps = Math.round(500000 / (t - this.last_iframe_time)) / 10;
					this.last_iframe_time = t;

					// 动态调整 step_time ，保证 fps 恒定为 24 左右
					if (this.fps < this._exp_fps_0 && step_time > 1) {
						step_time--;
					} else if (this.fps > this._exp_fps_1) {
						step_time++;
					}
//					if (step_time != this.step_time)
//						TD.log("FPS: " + this.fps + ", Step Time: " + step_time);
					this.step_time = step_time;
				}
				if (this.iframe % 2400 == 0) TD.gc(); // 每隔一段时间自动回收垃圾

				this.stage.step();
				this.stage.render();

				var _this = this;
				this._st = setTimeout(function () {
					_this.step();
				}, this.step_time);
			},

			/**
			 * 取得事件相对于 canvas 左上角的坐标
			 * @param e
			 */
			getEventXY: function (e) {
				// Use bounding client rect to correctly map event coordinates to canvas,
				// this handles iframe offsets, CSS scaling, and scrolling more reliably.
				try {
					var rect = this.canvas.getBoundingClientRect();
					var x = (e.clientX - rect.left);
					var y = (e.clientY - rect.top);
					// map to canvas pixel coordinates in case canvas is scaled via CSS
					var scaleX = this.canvas.width / rect.width;
					var scaleY = this.canvas.height / rect.height;
					return [Math.round(x * scaleX), Math.round(y * scaleY)];
				} catch (err) {
					// fallback to old method if something goes wrong
					var wra = TD.lang.$e("wrapper"),
						x = e.clientX - wra.offsetLeft - this.canvas.offsetLeft + Math.max(document.documentElement.scrollLeft, document.body.scrollLeft),
						y = e.clientY - wra.offsetTop - this.canvas.offsetTop + Math.max(document.documentElement.scrollTop, document.body.scrollTop);
					return [x * _TD.retina, y * _TD.retina];
				}
			},

			/**
			 * 鼠标移到指定位置事件
			 * @param x
			 * @param y
			 */
			hover: function (x, y) {
				this.eventManager.hover(x, y);
			},

			/**
			 * 点击事件
			 * @param x
			 * @param y
			 */
			click: function (x, y) {
				this.eventManager.click(x, y);
			},

			/**
			 * 是否将 canvas 中的鼠标指针变为手的形状
			 * @param v {Boolean}
			 */
			mouseHand: function (v) {
				this.canvas.style.cursor = v ? "pointer" : "default";
			},

			/**
			 * 显示调试信息，只在 is_debug 为 true 的情况下有效
			 * @param txt
			 */
			log: function (txt) {
				this.is_debug && window.console && console.log && console.log(txt);
			},

			/**
			 * 回收内存
			 * 注意：CollectGarbage 只在 IE 下有效
			 */
			gc: function () {
				if (window.CollectGarbage) {
					CollectGarbage();
					setTimeout(CollectGarbage, 1);
				}
			}
		};

		for (i = 0; this.a[i]; i++) {
			// 依次执行添加到列表中的函数
			this.a[i](TD);
		}
		delete this.a;

		TD.init(td_board);

		// Expose a small API for parent page to save/load minimal game state.
		try {
			if (typeof window !== 'undefined') {
				window.TD = TD;
				window.__TD_getState = function () {
					try {
						var scene = TD.stage && TD.stage.current_act && TD.stage.current_act.current_scene;
						var map = (TD.stage && TD.stage.map) || (scene && scene.map) || TD.map;
						var buildings = [];
						if (map && map.buildings && map.buildings.length) {
							for (var i = 0; i < map.buildings.length; i++) {
								var b = map.buildings[i];
								if (!b || !b.grid) continue;
								buildings.push({ type: b.type, mx: b.grid.mx, my: b.grid.my, level: b.level, money: b.money });
							}
						}

						// 添加怪物保存逻辑
						var monsters_data = [];
						if (scene && scene._step_elements) {
							// 遍历所有 step 元素层（共3层）
							for (var level = 0; level < scene._step_elements.length; level++) {
								var elements = scene._step_elements[level];
								for (var mi = 0; mi < elements.length; mi++) {
									var el = elements[mi];
									// 筛选有效的怪物
									if (el && el.is_monster && el.is_valid && el.grid) {
										var monster_data = {
											idx: el.idx,
											difficulty: el.difficulty,
											life: el.life,
											life0: el.life0,
											shield: el.shield,
											speed: el.speed,
											damage: el.damage,
											money: el.money,
											mx: el.grid.mx,
											my: el.grid.my,
											cx: el.cx,
											cy: el.cy,
											r: el.r,
											color: el.color,
											toward: el.toward,
											way: el.way || [],
											next_grid_mx: el.next_grid ? el.next_grid.mx : null,
											next_grid_my: el.next_grid ? el.next_grid.my : null,
											_dx: el._dx || 0,
											_dy: el._dy || 0,
											step_level: el.step_level,
											render_level: el.render_level,
											is_paused: el.is_paused,
											is_blocked: el.is_blocked
										};
										monsters_data.push(monster_data);
									}
								}
							}
						}

						return { money: TD.money, life: TD.life, score: TD.score, wave: (scene && scene.wave) || 0, buildings: buildings, monsters: monsters_data };
					} catch (e) {
						console.error('__TD_getState error', e);
						return null;
					}
				};

				window.__TD_loadState = function (s) {
					try {
						if (!s) return;
						var scene = TD.stage && TD.stage.current_act && TD.stage.current_act.current_scene;
						var map = (TD.stage && TD.stage.map) || (scene && scene.map) || TD.map;
						if (!map) return;

						// remove existing buildings
						for (var i = 0; i < map.grids.length; i++) {
							var g = map.grids[i];
							if (g && g.building) g.removeBuilding();
						}

						// 清除现有怪物（新增）
						if (scene && scene._step_elements) {
							for (var level = 0; level < scene._step_elements.length; level++) {
								var elements = scene._step_elements[level];
								for (var ei = elements.length - 1; ei >= 0; ei--) {
									var el = elements[ei];
									if (el && el.is_monster) {
										el.pause && el.pause();
										el.del && el.del();
									}
								}
							}
						}
						if (map.monsters) {
							map.monsters = [];
						}

						// add saved buildings
						if (s.buildings && s.buildings.length) {
							for (var j = 0; j < s.buildings.length; j++) {
								var bi = s.buildings[j];
								var grid = map.getGrid(bi.mx, bi.my);
								if (grid) grid.addBuilding(bi.type);
								var b = grid && grid.building;
								if (b) {
									if (typeof bi.level !== 'undefined') b.level = bi.level;
									if (typeof bi.money !== 'undefined') b.money = bi.money;
									b.updateBtnDesc && b.updateBtnDesc();
								}
							}
						}

						// 恢复保存的怪物（新增）
						if (s.monsters && s.monsters.length) {
							for (var mj = 0; mj < s.monsters.length; mj++) {
								var md = s.monsters[mj];

								// 验证生命值
								if (md.life <= 0 || md.life > md.life0) {
									md.life = md.life0;
								}

								var monster_grid = map.getGrid(md.mx, md.my);
								if (!monster_grid || monster_grid === map.exit) {
									continue;
								}

								try {
									// 创建怪物实例
									var monster = new TD.Monster(null, {
										idx: md.idx,
										difficulty: md.difficulty,
										step_level: md.step_level,
										render_level: md.render_level
									});

									// 手动设置保存的属性
									monster.life = md.life;
									monster.life0 = md.life0;
									monster.shield = md.shield;
									monster.speed = md.speed;
									monster.damage = md.damage;
									monster.money = md.money;
									monster.r = md.r;
									monster.color = md.color;
									monster.toward = md.toward;
									monster._dx = md._dx;
									monster._dy = md._dy;
									monster.is_paused = md.is_paused;
									monster.is_blocked = md.is_blocked;

									// 设置位置
									monster.beAddToGrid(monster_grid);
									monster.cx = md.cx;
									monster.cy = md.cy;
									monster.caculatePos();

									// 设置下一个目标格子
									if (md.next_grid_mx !== null && md.next_grid_my !== null) {
										monster.next_grid = map.getGrid(md.next_grid_mx, md.next_grid_my);
									}

									// 设置路径
									var validWay = [];
									for (var wi = 0; wi < md.way.length; wi++) {
										var wp = md.way[wi];
										var wpgrid = map.getGrid(wp[0], wp[1]);
										if (wpgrid) validWay.push(wp);
									}
									monster.way = validWay;

									// 检查路径并重新寻路
									if (validWay.length === 0 || !monster.next_grid || monster.is_blocked) {
										monster.findWay && monster.findWay();
										if (!monster.next_grid) monster.beBlocked && monster.beBlocked();
									}

									// 添加到场景和地图
									monster_grid.scene.addElement(monster, monster.step_level, monster.render_level);
									map.monsters.push(monster);

									// 启动怪物
									if (!monster.is_paused) monster.start && monster.start();
								} catch (monsterErr) {
									console.warn('__TD_loadState: Failed to restore monster:', monsterErr);
								}
							}
						}

						if (typeof s.money !== 'undefined') TD.money = s.money;
						if (typeof s.life !== 'undefined') TD.life = s.life;
						if (typeof s.score !== 'undefined') TD.score = s.score;
						if (typeof s.wave !== 'undefined' && scene) scene.wave = s.wave;
					} catch (e) {
						console.error('__TD_loadState error', e);
					}
				};
			}
		} catch (e) {
			console.warn('expose TD api failed', e);
		}
	}
};
