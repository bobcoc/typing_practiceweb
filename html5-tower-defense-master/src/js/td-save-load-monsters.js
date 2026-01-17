// 新的保存和加载函数，添加怪物状态保存/恢复功能
// 替换原有的 __TD_getState 和 __TD_loadState 函数

window.__TD_getState = function () {
	try {
		console.log('[__TD_getState] ===== START SAVING STATE =====');

		// 直接从当前 scene 获取 map
		var scene = TD.stage && TD.stage.current_act && TD.stage.current_act.current_scene;
		console.log('[__TD_getState] scene:', scene);
		console.log('[__TD_getState] scene.map:', scene ? scene.map : 'scene is null');

		var map = scene && scene.map;
		console.log('[__TD_getState] map:', map);

		var buildings = [];
		if (map && map.buildings && map.buildings.length) {
			console.log('[__TD_getState] Found ' + map.buildings.length + ' buildings');
			for (var i = 0; i < map.buildings.length; i++) {
				var b = map.buildings[i];
				if (!b || !b.grid) continue;
				buildings.push({ type: b.type, mx: b.grid.mx, my: b.grid.my, level: b.level, money: b.money });
			}
		}

		// 保存怪物状态 - 从 map.monsters 获取
		var monsters_data = [];
		if (map && map.monsters && map.monsters.length) {
			console.log('[__TD_getState] Found ' + map.monsters.length + ' monsters in map.monsters');
			for (var i = 0; i < map.monsters.length; i++) {
				var m = map.monsters[i];
				console.log('[__TD_getState] Monster ' + i + ':', {
					'is_valid': m ? m.is_valid : 'null',
					'grid': m ? m.grid : 'null',
					'idx': m ? m.idx : 'null',
					'life': m ? m.life : 'null'
				});

				if (!m || !m.is_valid || !m.grid) {
					console.log('[__TD_getState] Skipping invalid monster', m);
					continue;
				}

				var monster_data = {
					// 核心属性
					idx: m.idx,
					difficulty: m.difficulty,
					life: m.life,
					life0: m.life0,
					shield: m.shield,
					speed: m.speed,
					damage: m.damage,
					money: m.money,

					// 位置和渲染
					mx: m.grid.mx,
					my: m.grid.my,
					cx: m.cx,
					cy: m.cy,
					r: m.r,
					color: m.color,

					// 路径和导航
					toward: m.toward,
					way: m.way || [],
					next_grid_mx: m.next_grid ? m.next_grid.mx : null,
					next_grid_my: m.next_grid ? m.next_grid.my : null,

					// 移动辅助
					_dx: m._dx || 0,
					_dy: m._dy || 0,

					// 配置级别
					step_level: m.step_level,
					render_level: m.render_level,

					// 状态标志
					is_paused: m.is_paused,
					is_blocked: m.is_blocked
				};

				monsters_data.push(monster_data);
				console.log('[__TD_getState] Saved monster data:', monster_data);
			}
		} else {
			console.log('[__TD_getState] No monsters found');
			console.log('[__TD_getState] map:', map);
			console.log('[__TD_getState] map.monsters:', map ? map.monsters : 'map is null');
		}

		var state = {
			money: TD.money,
			life: TD.life,
			score: TD.score,
			wave: (scene && scene.wave) || 0,
			buildings: buildings,
			monsters: monsters_data
		};
		console.log('[__TD_getState] Returning state with ' + monsters_data.length + ' monsters');
		console.log('[__TD_getState] ===== END SAVING STATE =====');
		return state;
	} catch (e) {
		console.error('[__TD_getState] error', e);
		console.error('[__TD_getState] error stack', e.stack);
		return null;
	}
};

window.__TD_loadState = function (s) {
	try {
		console.log('[__TD_loadState] ===== START LOADING STATE =====');
		console.log('[__TD_loadState] State received:', s);

		if (!s) {
			console.warn('[__TD_loadState] State is null or undefined');
			return;
		}

		// 直接从当前 scene 获取 map
		var scene = TD.stage && TD.stage.current_act && TD.stage.current_act.current_scene;
		console.log('[__TD_loadState] scene:', scene);

		var map = scene && scene.map;
		if (!map) {
			console.warn('[__TD_loadState] Map is null');
			return;
		}
		console.log('[__TD_loadState] map:', map);
		console.log('[__TD_loadState] Current monsters count:', map.monsters ? map.monsters.length : 'null');

		// remove existing buildings
		for (var i = 0; i < map.grids.length; i++) {
			var g = map.grids[i];
			if (g && g.building) g.removeBuilding();
		}
		console.log('[__TD_loadState] Removed existing buildings');

		// remove existing monsters
		if (map.monsters && map.monsters.length) {
			console.log('[__TD_loadState] Removing ' + map.monsters.length + ' existing monsters');
			for (var mi = 0; mi < map.monsters.length; mi++) {
				var old_monster = map.monsters[mi];
				if (old_monster) {
					old_monster.pause();
					old_monster.del();
				}
			}
			map.monsters = [];
			console.log('[__TD_loadState] Cleared monsters array');
		}

		// add saved buildings
		if (s.buildings && s.buildings.length) {
			console.log('[__TD_loadState] Restoring ' + s.buildings.length + ' buildings');
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

		// add saved monsters
		if (s.monsters && s.monsters.length) {
			console.log('[__TD_loadState] Found ' + s.monsters.length + ' monsters to restore');
			for (var mj = 0; mj < s.monsters.length; mj++) {
				var md = s.monsters[mj];
				console.log('[__TD_loadState] Processing monster:', md);

				// 验证生命值
				if (md.life <= 0) {
					console.warn('[__TD_loadState] Cannot restore monster: life is 0', md);
					continue;
				}
				if (md.life > md.life0) {
					md.life = md.life0; // 修正：当前生命值不应超过初始值
				}

				var monster_grid = map.getGrid(md.mx, md.my);
				if (!monster_grid) {
					console.warn('[__TD_loadState] Cannot restore monster: grid not found', md.mx, md.my);
					continue;
				}

				// 检查怪物是否在终点
				if (monster_grid === map.exit) {
					console.warn('[__TD_loadState] Skipping monster at exit', md);
					continue;
				}

				console.log('[__TD_loadState] Creating monster instance');
				// 创建怪物实例
				var monster = new TD.Monster(null, {
					idx: md.idx,
					difficulty: md.difficulty,
					step_level: md.step_level,
					render_level: md.render_level
				});
				console.log('[__TD_loadState] Monster instance created');

				// 手动设置保存的属性（跳过_init中的随机计算）
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
				console.log('[__TD_loadState] Monster properties set');

				// 设置位置
				monster.beAddToGrid(monster_grid);
				monster.cx = md.cx;
				monster.cy = md.cy;
				monster.caculatePos();
				console.log('[__TD_loadState] Monster positioned at grid (' + md.mx + ',' + md.my + ') cx:' + monster.cx + ' cy:' + monster.cy);

				// 设置下一个目标格子
				if (md.next_grid_mx !== null && md.next_grid_my !== null) {
					monster.next_grid = map.getGrid(md.next_grid_mx, md.next_grid_my);
					console.log('[__TD_loadState] Monster next_grid set to (' + md.next_grid_mx + ',' + md.next_grid_my + ')');
				}

				// 验证并过滤路径点
				var valid_way = [];
				for (var wi = 0; wi < md.way.length; wi++) {
					var wp = md.way[wi];
					var wp_grid = map.getGrid(wp[0], wp[1]);
					if (wp_grid) {
						valid_way.push(wp);
					}
				}
				monster.way = valid_way;
				console.log('[__TD_loadState] Monster way set with ' + valid_way.length + ' waypoints');

				// 如果路径被严重破坏，触发重新寻路
				if (valid_way.length === 0) {
					monster.findWay();
					console.log('[__TD_loadState] Monster found new path after way was empty');
				}

				// 恢复后检查怪物是否被阻塞
				if (monster.is_blocked || !monster.next_grid) {
					monster.findWay();
					if (!monster.next_grid) {
						monster.beBlocked();
					}
					console.log('[__TD_loadState] Monster path checked, next_grid:', monster.next_grid);
				}

				// 添加到场景和地图
				monster_grid.scene.addElement(monster, monster.step_level, monster.render_level);
				map.monsters.push(monster);
				console.log('[__TD_loadState] Monster added, total monsters:', map.monsters.length);

				// 如果未被暂停，启动怪物
				if (!monster.is_paused) {
					monster.start();
					console.log('[__TD_loadState] Monster started');
				}
			}
			console.log('[__TD_loadState] Finished restoring monsters, final count:', map.monsters.length);
		} else {
			console.log('[__TD_loadState] No monsters to restore');
		}

		if (typeof s.money !== 'undefined') TD.money = s.money;
		if (typeof s.life !== 'undefined') TD.life = s.life;
		if (typeof s.score !== 'undefined') TD.score = s.score;
		if (typeof s.wave !== 'undefined' && scene) scene.wave = s.wave;

		console.log('[__TD_loadState] Load completed. Money:' + TD.money + ' Life:' + TD.life + ' Score:' + TD.score);
		console.log('[__TD_loadState] ===== END LOADING STATE =====');
	} catch (e) {
		console.error('[__TD_loadState] error', e);
		console.error('[__TD_loadState] error stack', e.stack);
	}
};
