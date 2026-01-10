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
	}
};
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	TD.lang = {
		/**
		 * document.getElementById 方法的简写
		 * @param el_id {String}
		 */
		$e: function (el_id) {
			return document.getElementById(el_id);
		},

		/**
		 * 创建一个 DOM 元素
		 * @param tag_name {String}
		 * @param attributes {Object}
		 * @param parent_node {HTMLElement}
		 * @return {HTMLElement}
		 */
		$c: function (tag_name, attributes, parent_node) {
			var el = document.createElement(tag_name);
			attributes = attributes || {};

			for (var k in attributes) {
				if (attributes.hasOwnProperty(k)) {
					el.setAttribute(k, attributes[k]);
				}
			}

			if (parent_node)
				parent_node.appendChild(el);

			return el;
		},

		/**
		 * 从字符串 s 左边截取n个字符
		 * 如果包含汉字，则汉字按两个字符计算
		 * @param s {String} 输入的字符串
		 * @param n {Number}
		 */
		strLeft: function (s, n) {
			var s2 = s.slice(0, n),
				i = s2.replace(/[^\x00-\xff]/g, "**").length;
			if (i <= n) return s2;
			i -= s2.length;
			switch (i) {
				case 0:
					return s2;
				case n:
					return s.slice(0, n >> 1);
				default:
					var k = n - i,
						s3 = s.slice(k, n),
						j = s3.replace(/[\x00-\xff]/g, "").length;
					return j ?
					s.slice(0, k) + this.arguments.callee(s3, j) :
						s.slice(0, k);
			}
		},

		/**
		 * 取得一个字符串的字节长度
		 * 汉字等字符长度算2，英文、数字等算1
		 * @param s {String}
		 */
		strLen2: function (s) {
			return s.replace(/[^\x00-\xff]/g, "**").length;
		},

		/**
		 * 对一个数组的每一个元素执行指定方法
		 * @param list {Array}
		 * @param f {Function}
		 */
		each: function (list, f) {
			if (Array.prototype.forEach) {
				list.forEach(f);
			} else {
				for (var i = 0, l = list.length; i < l; i++) {
					f(list[i]);
				}
			}
		},

		/**
		 * 对一个数组的每一项依次执行指定方法，直到某一项的返回值为 true
		 * 返回第一个令 f 值为 true 的元素，如没有元素令 f 值为 true，则
		 * 返回 null
		 * @param list {Array}
		 * @param f {Function}
		 * @return {Object}
		 */
		any: function (list, f) {
			for (var i = 0, l = list.length; i < l; i++) {
				if (f(list[i]))
					return list[i];
			}
			return null;
		},

		/**
		 * 依次弹出列表中的元素，并对其进行操作
		 * 注意，执行完毕之后原数组将被清空
		 * 类似于 each，不同的是这个函数执行完后原数组将被清空
		 * @param list {Array}
		 * @param f {Function}
		 */
		shift: function (list, f) {
			while (list[0]) {
				f(list.shift());
//			f.apply(list.shift(), args);
			}
		},

		/**
		 * 传入一个数组，将其随机排序并返回
		 * 返回的是一个新的数组，原数组不变
		 * @param list {Array}
		 * @return {Array}
		 */
		rndSort: function (list) {
			var a = list.concat();
			return a.sort(function () {
				return Math.random() - 0.5;
			});
		},

		_rndRGB2: function (v) {
			var s = v.toString(16);
			return s.length == 2 ? s : ("0" + s);
		},
		/**
		 * 随机生成一个 RGB 颜色
		 */
		rndRGB: function () {
			var r = Math.floor(Math.random() * 256),
				g = Math.floor(Math.random() * 256),
				b = Math.floor(Math.random() * 256);

			return "#" + this._rndRGB2(r) + this._rndRGB2(g) + this._rndRGB2(b);
		},
		/**
		 * 将一个 rgb 色彩字符串转化为一个数组
		 * eg: '#ffffff' => [255, 255, 255]
		 * @param rgb_str {String} rgb色彩字符串，类似于“#f8c693”
		 */
		rgb2Arr: function (rgb_str) {
			if (rgb_str.length != 7) return [0, 0, 0];

			var r = rgb_str.substr(1, 2),
				g = rgb_str.substr(3, 2),
				b = rgb_str.substr(3, 2);

			return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
		},

		/**
		 * 生成一个长度为 n 的随机字符串
		 *
		 * @param [n] {Number}
		 */
		rndStr: function (n) {
			n = n || 16;
			var chars = "1234567890abcdefghijklmnopqrstuvwxyz",
				a = [],
				i, chars_len = chars.length, r;

			for (i = 0; i < n; i++) {
				r = Math.floor(Math.random() * chars_len);
				a.push(chars.substr(r, 1));
			}
			return a.join("");
		},

		/**
		 * 空函数，一般用于占位
		 */
		nullFunc: function () {
		},

		/**
		 * 判断两个数组是否相等
		 *
		 * @param arr1 {Array}
		 * @param arr2 {Array}
		 */
		arrayEqual: function (arr1, arr2) {
			var i, l = arr1.length;

			if (l != arr2.length) return false;

			for (i = 0; i < l; i++) {
				if (arr1[i] != arr2[i]) return false;
			}

			return true;
		},

		/**
		 * 将所有 s 的属性复制给 r
		 * @param r {Object}
		 * @param s {Object}
		 * @param [is_overwrite] {Boolean} 如指定为 false ，则不覆盖已有的值，其它值
		 *      包括 undefined ，都表示 s 中的同名属性将覆盖 r 中的值
		 */
		mix: function (r, s, is_overwrite) {
			if (!s || !r) return r;

			for (var p in s) {
				if (s.hasOwnProperty(p) && (is_overwrite !== false || !(p in r))) {
					r[p] = s[p];
				}
			}
			return r;
		}
	};

}); // _TD.a.push end
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	/**
	 * 事件管理器
	 */
	TD.eventManager = {
		ex: -1, // 事件坐标 x
		ey: -1, // 事件坐标 y
		_registers: {}, // 注册监听事件的元素

		// 目前支持的事件类型
		ontypes: [
			"enter", // 鼠标移入
			"hover", // 鼠标在元素上，相当于 onmouseover
			"out", // 鼠标移出
			"click" // 鼠标点击
		],

		// 当前事件类型
		current_type: "hover",

		/**
		 * 根据事件坐标，判断事件是否在元素上
		 * @param el {Element} Element 元素
		 * @return {Boolean}
		 */
		isOn: function (el) {
			return (this.ex != -1 &&
			this.ey != -1 &&
			this.ex > el.x &&
			this.ex < el.x2 &&
			this.ey > el.y &&
			this.ey < el.y2);
		},

		/**
		 * 根据元素名、事件名，生成一个字符串标识，用于注册事件监听
		 * @param el {Element}
		 * @param evt_type {String}
		 * @return evt_name {String} 字符串标识
		 */
		_mkElEvtName: function (el, evt_type) {
			return el.id + "::_evt_::" + evt_type;
		},

		/**
		 * 为元素注册事件监听
		 * 现在的实现比较简单，如果一个元素对某个事件多次注册监听，后面的监听将会覆盖前面的
		 *
		 * @param el {Element}
		 * @param evt_type {String}
		 * @param f {Function}
		 */
		on: function (el, evt_type, f) {
			this._registers[this._mkElEvtName(el, evt_type)] = [el, evt_type, f];
		},

		/**
		 * 移除元素对指定事件的监听
		 * @param el {Element}
		 * @param evt_type {String}
		 */
		removeEventListener: function (el, evt_type) {
			var en = this._mkElEvtName(el, evt_type);
			delete this._registers[en];
		},

		/**
		 * 清除所有监听事件
		 */
		clear: function () {
			delete this._registers;
			this._registers = {};
			//this.elements = [];
		},

		/**
		 * 主循环方法
		 */
		step: function () {
			if (!this.current_type) return; // 没有事件被触发

			var k, a, el, et, f,
			//en,
				j,
				_this = this,
				ontypes_len = this.ontypes.length,
				is_evt_on,
//				reg_length = 0,
				to_del_el = [];

			//var m = TD.stage.current_act.current_scene.map;
			//TD.log([m.is_hover, this.isOn(m)]);

			// 遍历当前注册的事件
			for (k in this._registers) {
//				reg_length ++;
				if (!this._registers.hasOwnProperty(k)) continue;
				a = this._registers[k];
				el = a[0]; // 事件对应的元素
				et = a[1]; // 事件类型
				f = a[2]; // 事件处理函数
				if (!el.is_valid) {
					to_del_el.push(el);
					continue;
				}
				if (!el.is_visiable) continue; // 不可见元素不响应事件

				is_evt_on = this.isOn(el); // 事件是否发生在元素上

				if (this.current_type != "click") {
					// enter / out / hover 事件

					if (et == "hover" && el.is_hover && is_evt_on) {
						// 普通的 hover
						f();
						this.current_type = "hover";
					} else if (et == "enter" && !el.is_hover && is_evt_on) {
						// enter 事件
						el.is_hover = true;
						f();
						this.current_type = "enter";
					} else if (et == "out" && el.is_hover && !is_evt_on) {
						// out 事件
						el.is_hover = false;
						f();
						this.current_type = "out";
//					} else {
						// 事件与当前元素无关
//					continue;
					}

				} else {
					// click 事件
					if (is_evt_on && et == "click") f();
				}
			}

			// 删除指定元素列表的事件
			TD.lang.each(to_del_el, function (obj) {
				for (j = 0; j < ontypes_len; j++)
					_this.removeEventListener(obj, _this.ontypes[j]);
			});
//			TD.log(reg_length);
			this.current_type = "";
		},

		/**
		 * 鼠标在元素上
		 * @param ex {Number}
		 * @param ey {Number}
		 */
		hover: function (ex, ey) {
			// 如果还有 click 事件未处理则退出，点击事件具有更高的优先级
			if (this.current_type == "click") return;

			this.current_type = "hover";
			this.ex = ex;
			this.ey = ey;
		},

		/**
		 * 点击事件
		 * @param ex {Number}
		 * @param ey {Number}
		 */
		click: function (ex, ey) {
			this.current_type = "click";
			this.ex = ex;
			this.ey = ey;
		}
	};

}); // _TD.a.push end

/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	/**
	 * 舞台类
	 * @param id {String} 舞台ID
	 * @param cfg {Object} 配置
	 */
	TD.Stage = function (id, cfg) {
		this.id = id || ("stage-" + TD.lang.rndStr());
		this.cfg = cfg || {};
		this.width = this.cfg.width || 640;
		this.height = this.cfg.height || 540;

		/**
		 * mode 有以下状态：
		 *         "normal": 普通状态
		 *         "build": 建造模式
		 */
		this.mode = "normal";

		/*
		 * state 有以下几种状态：
		 * 0: 等待中
		 * 1: 运行中
		 * 2: 暂停
		 * 3: 已结束
		 */
		this.state = 0;
		this.acts = [];
		this.current_act = null;
		this._step2 = TD.lang.nullFunc;

		this._init();
	};

	TD.Stage.prototype = {
		_init: function () {
			if (typeof this.cfg.init == "function") {
				this.cfg.init.call(this);
			}
			if (typeof this.cfg.step2 == "function") {
				this._step2 = this.cfg.step2;
			}
		},
		start: function () {
			this.state = 1;
			TD.lang.each(this.acts, function (obj) {
				obj.start();
			});
		},
		pause: function () {
			this.state = 2;
		},
		gameover: function () {
			//this.pause();
			this.current_act.gameover();
		},
		/**
		 * 清除本 stage 所有物品
		 */
		clear: function () {
			this.state = 3;
			TD.lang.each(this.acts, function (obj) {
				obj.clear();
			});
//		delete this;
		},
		/**
		 * 主循环函数
		 */
		step: function () {
			if (this.state != 1 || !this.current_act) return;
			TD.eventManager.step();
			this.current_act.step();

			this._step2();
		},
		/**
		 * 绘制函数
		 */
		render: function () {
			if (this.state == 0 || this.state == 3 || !this.current_act) return;
			this.current_act.render();
		},
		addAct: function (act) {
			this.acts.push(act);
		},
		addElement: function (el, step_level, render_level) {
			if (this.current_act)
				this.current_act.addElement(el, step_level, render_level);
		}
	};

}); // _TD.a.push end


// _TD.a.push begin
_TD.a.push(function (TD) {

	TD.Act = function (stage, id) {
		this.stage = stage;
		this.id = id || ("act-" + TD.lang.rndStr());

		/*
		 * state 有以下几种状态：
		 * 0: 等待中
		 * 1: 运行中
		 * 2: 暂停
		 * 3: 已结束
		 */
		this.state = 0;
		this.scenes = [];
		this.end_queue = []; // 本 act 结束后要执行的队列，添加时请保证里面全是函数
		this.current_scene = null;

		this._init();
	};

	TD.Act.prototype = {
		_init: function () {
			this.stage.addAct(this);
		},
		/*
		 * 开始当前 act
		 */
		start: function () {
			if (this.stage.current_act && this.stage.current_act.state != 3) {
				// queue...
				this.state = 0;
				this.stage.current_act.queue(this.start);
				return;
			}
			// start
			this.state = 1;
			this.stage.current_act = this;
			TD.lang.each(this.scenes, function (obj) {
				obj.start();
			});
		},
		pause: function () {
			this.state = 2;
		},
		end: function () {
			this.state = 3;
			var f;
			while (f = this.end_queue.shift()) {
				f();
			}
			this.stage.current_act = null;
		},
		queue: function (f) {
			this.end_queue.push(f);
		},
		clear: function () {
			this.state = 3;
			TD.lang.each(this.scenes, function (obj) {
				obj.clear();
			});
//		delete this;
		},
		step: function () {
			if (this.state != 1 || !this.current_scene) return;
			this.current_scene.step();
		},
		render: function () {
			if (this.state == 0 || this.state == 3 || !this.current_scene) return;
			this.current_scene.render();
		},
		addScene: function (scene) {
			this.scenes.push(scene);
		},
		addElement: function (el, step_level, render_level) {
			if (this.current_scene)
				this.current_scene.addElement(el, step_level, render_level);
		},
		gameover: function () {
			//this.is_paused = true;
			//this.is_gameover = true;
			this.current_scene.gameover();
		}
	};

}); // _TD.a.push end


// _TD.a.push begin
_TD.a.push(function (TD) {

	TD.Scene = function (act, id) {
		this.act = act;
		this.stage = act.stage;
		this.is_gameover = false;
		this.id = id || ("scene-" + TD.lang.rndStr());
		/*
		 * state 有以下几种状态：
		 * 0: 等待中
		 * 1: 运行中
		 * 2: 暂停
		 * 3: 已结束
		 */
		this.state = 0;
		this.end_queue = []; // 本 scene 结束后要执行的队列，添加时请保证里面全是函数
		this._step_elements = [
			// step 共分为 3 层
			[],
			// 0
			[],
			// 1 默认
			[] // 2
		];
		this._render_elements = [ // 渲染共分为 10 层
			[], // 0 背景 1 背景图片
			[], // 1 背景 2
			[], // 2 背景 3 地图、格子
			[], // 3 地面 1 一般建筑
			[], // 4 地面 2 人物、NPC等
			[], // 5 地面 3
			[], // 6 天空 1 子弹等
			[], // 7 天空 2 主地图外边的遮罩，panel
			[], // 8 天空 3
			[] // 9 系统特殊操作，如选中高亮，提示、文字遮盖等
		];

		this._init();
	};

	TD.Scene.prototype = {
		_init: function () {
			this.act.addScene(this);
			this.wave = 0; // 第几波
		},
		start: function () {
			if (this.act.current_scene &&
				this.act.current_scene != this &&
				this.act.current_scene.state != 3) {
				// queue...
				this.state = 0;
				this.act.current_scene.queue(this.start);
				return;
			}
			// start
			this.state = 1;
			this.act.current_scene = this;
		},
		pause: function () {
			this.state = 2;
		},
		end: function () {
			this.state = 3;
			var f;
			while (f = this.end_queue.shift()) {
				f();
			}
			this.clear();
			this.act.current_scene = null;
		},
		/**
		 * 清空场景
		 */
		clear: function () {
			// 清空本 scene 中引用的所有对象以回收内存
			TD.lang.shift(this._step_elements, function (obj) {
				TD.lang.shift(obj, function (obj2) {
					// element
					//delete this.scene;
					obj2.del();
//				delete this;
				});
//			delete this;
			});
			TD.lang.shift(this._render_elements, function (obj) {
				TD.lang.shift(obj, function (obj2) {
					// element
					//delete this.scene;
					obj2.del();
//				delete this;
				});
//			delete this;
			});
//		delete this;
		},
		queue: function (f) {
			this.end_queue.push(f);
		},
		gameover: function () {
			if (this.is_gameover) return;
			this.pause();
			this.is_gameover = true;
		},
		step: function () {
			if (this.state != 1) return;
			if (TD.life <= 0) {
				TD.life = 0;
				this.gameover();
			}

			var i, a;
			for (i = 0; i < 3; i++) {
				a = [];
				var level_elements = this._step_elements[i];
				TD.lang.shift(level_elements, function (obj) {
					if (obj.is_valid) {
						if (!obj.is_paused)
							obj.step();
						a.push(obj);
					} else {
						setTimeout(function () {
							obj = null;
						}, 500); // 一会儿之后将这个对象彻底删除以收回内存
					}
				});
				this._step_elements[i] = a;
			}
		},
		render: function () {
			if (this.state == 0 || this.state == 3) return;
			var i, a,
				ctx = TD.ctx;

			ctx.clearRect(0, 0, this.stage.width, this.stage.height);

			for (i = 0; i < 10; i++) {
				a = [];
				var level_elements = this._render_elements[i];
				TD.lang.shift(level_elements, function (obj) {
					if (obj.is_valid) {
						if (obj.is_visiable)
							obj.render();
						a.push(obj);
					}
				});
				this._render_elements[i] = a;
			}

			if (this.is_gameover) {
				this.panel.gameover_obj.show();
			}
		},
		addElement: function (el, step_level, render_level) {
			//TD.log([step_level, render_level]);
			step_level = step_level || el.step_level || 1;
			render_level = render_level || el.render_level;
			this._step_elements[step_level].push(el);
			this._render_elements[render_level].push(el);
			el.scene = this;
			el.step_level = step_level;
			el.render_level = render_level;
		}
	};

}); // _TD.a.push end
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 *
 * 本文件定义了 Element 类，这个类是游戏中所有元素的基类，
 * 包括地图、格子、怪物、建筑、子弹、气球提示等都基于这个类
 *
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	/**
	 * Element 是游戏中所有可控制元素的基类
	 * @param id {String} 给这个元素一个唯一的不重复的 ID，如果不指定则随机生成
	 * @param cfg {Object} 元素的配置信息
	 */
	TD.Element = function (id, cfg) {
		this.id = id || ("el-" + TD.lang.rndStr());
		this.cfg = cfg || {};

		this.is_valid = true;
		this.is_visiable = typeof cfg.is_visiable != "undefined" ? cfg.is_visiable : true;
		this.is_paused = false;
		this.is_hover = false;
		this.x = this.cfg.x || -1;
		this.y = this.cfg.y || -1;
		this.width = this.cfg.width || 0;
		this.height = this.cfg.height || 0;
		this.step_level = cfg.step_level || 1;
		this.render_level = cfg.render_level;
		this.on_events = cfg.on_events || [];

		this._init();
	};

	TD.Element.prototype = {
		_init: function () {
			var _this = this,
				i, en, len;

			// 监听指定事件
			for (i = 0, len = this.on_events.length; i < len; i++) {
				en = this.on_events[i];
				switch (en) {

					// 鼠标进入元素
					case "enter":
						this.on("enter", function () {
							_this.onEnter();
						});
						break;

					// 鼠标移出元素
					case "out":
						this.on("out", function () {
							_this.onOut();
						});
						break;

					// 鼠标在元素上，相当于 DOM 中的 onmouseover
					case "hover":
						this.on("hover", function () {
							_this.onHover();
						});
						break;

					// 鼠标点击了元素
					case "click":
						this.on("click", function () {
							_this.onClick();
						});
						break;
				}
			}
			this.caculatePos();
		},
		/**
		 * 重新计算元素的位置信息
		 */
		caculatePos: function () {
			this.cx = this.x + this.width / 2; // 中心的位置
			this.cy = this.y + this.height / 2;
			this.x2 = this.x + this.width; // 右边界
			this.y2 = this.y + this.height; // 下边界
		},
		start: function () {
			this.is_paused = false;
		},
		pause: function () {
			this.is_paused = true;
		},
		hide: function () {
			this.is_visiable = false;
			this.onOut();
		},
		show: function () {
			this.is_visiable = true;
		},
		/**
		 * 删除本元素
		 */
		del: function () {
			this.is_valid = false;
		},
		/**
		 * 绑定指定类型的事件
		 * @param evt_type {String} 事件类型
		 * @param f {Function} 处理方法
		 */
		on: function (evt_type, f) {
			TD.eventManager.on(this, evt_type, f);
		},

		// 下面几个方法默认为空，实例中按需要重载
		onEnter: TD.lang.nullFunc,
		onOut: TD.lang.nullFunc,
		onHover: TD.lang.nullFunc,
		onClick: TD.lang.nullFunc,
		step: TD.lang.nullFunc,
		render: TD.lang.nullFunc,

		/**
		 * 将当前 element 加入到场景 scene 中
		 * 在加入本 element 之前，先加入 pre_add_list 中的element
		 * @param scene
		 * @param step_level {Number}
		 * @param render_level {Number}
		 * @param pre_add_list {Array} Optional [element1, element2, ...]
		 */
		addToScene: function (scene, step_level, render_level, pre_add_list) {
			this.scene = scene;
			if (isNaN(step_level)) return;
			this.step_level = step_level || this.step_level;
			this.render_level = render_level || this.render_level;

			if (pre_add_list) {
				TD.lang.each(pre_add_list, function (obj) {
					scene.addElement(obj, step_level, render_level);
				});
			}
			scene.addElement(this, step_level, render_level);
		}
	};

}); // _TD.a.push end

/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	var _default_wait_clearInvalidElements = 20;

	// map 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var map_obj = {
		_init: function (cfg) {
			cfg = cfg || {};
			this.grid_x = cfg.grid_x || 10;
			this.grid_y = cfg.grid_y || 10;
			this.x = cfg.x || 0;
			this.y = cfg.y || 0;
			this.width = this.grid_x * TD.grid_size;
			this.height = this.grid_y * TD.grid_size;
			this.x2 = this.x + this.width;
			this.y2 = this.y + this.height;
			this.grids = [];
			this.entrance = this.exit = null;
			this.buildings = [];
			this.monsters = [];
			this.bullets = [];
			this.scene = cfg.scene;
			this.is_main_map = !!cfg.is_main_map;
			this.select_hl = TD.MapSelectHighLight(this.id + "-hl", {
				map: this
			});
			this.select_hl.addToScene(this.scene, 1, 9);
			this.selected_building = null;
			this._wait_clearInvalidElements = _default_wait_clearInvalidElements;
			this._wait_add_monsters = 0;
			this._wait_add_monsters_arr = [];
			if (this.is_main_map) {
				this.mmm = new MainMapMask(this.id + "-mmm", {
					map: this
				});
				this.mmm.addToScene(this.scene, 1, 7);

			}

			// 下面添加相应的格子
			var i, l = this.grid_x * this.grid_y,
				grid_data = cfg["grid_data"] || [],
				d, grid;

			for (i = 0; i < l; i++) {
				d = grid_data[i] || {};
				d.mx = i % this.grid_x;
				d.my = Math.floor(i / this.grid_x);
				d.map = this;
				d.step_level = this.step_level;
				d.render_level = this.render_level;
				grid = new TD.Grid(this.id + "-grid-" + d.mx + "-" + d.my, d);
				this.grids.push(grid);
			}

			if (cfg.entrance && cfg.exit && !TD.lang.arrayEqual(cfg.entrance, cfg.exit)) {
				this.entrance = this.getGrid(cfg.entrance[0], cfg.entrance[1]);
				this.entrance.is_entrance = true;
				this.exit = this.getGrid(cfg.exit[0], cfg.exit[1]);
				this.exit.is_exit = true;
			}

			var _this = this;
			if (cfg.grids_cfg) {
				TD.lang.each(cfg.grids_cfg, function (obj) {
					var grid = _this.getGrid(obj.pos[0], obj.pos[1]);
					if (!grid) return;
					if (!isNaN(obj.passable_flag))
						grid.passable_flag = obj.passable_flag;
					if (!isNaN(obj.build_flag))
						grid.build_flag = obj.build_flag;
					if (obj.building) {
						grid.addBuilding(obj.building);
					}
				});
			}
		},

		/**
		 * 检查地图中是否有武器（具备攻击性的建筑）
		 * 因为第一波怪物只有在地图上有了第一件武器后才会出现
		 */
		checkHasWeapon: function () {
			this.has_weapon = (this.anyBuilding(function (obj) {
				return obj.is_weapon;
			}) != null);
		},

		/**
		 * 取得指定位置的格子对象
		 * @param mx {Number} 地图上的坐标 x
		 * @param my {Number} 地图上的坐标 y
		 */
		getGrid: function (mx, my) {
			var p = my * this.grid_x + mx;
			return this.grids[p];
		},

		anyMonster: function (f) {
			return TD.lang.any(this.monsters, f);
		},
		anyBuilding: function (f) {
			return TD.lang.any(this.buildings, f);
		},
		anyBullet: function (f) {
			return TD.lang.any(this.bullets, f);
		},
		eachBuilding: function (f) {
			TD.lang.each(this.buildings, f);
		},
		eachMonster: function (f) {
			TD.lang.each(this.monsters, f);
		},
		eachBullet: function (f) {
			TD.lang.each(this.bullets, f);
		},

		/**
		 * 预建设
		 * @param building_type {String}
		 */
		preBuild: function (building_type) {
			TD.mode = "build";
			if (this.pre_building) {
				this.pre_building.remove();
			}

			this.pre_building = new TD.Building(this.id + "-" + "pre-building-" + TD.lang.rndStr(), {
				type: building_type,
				map: this,
				is_pre_building: true
			});
			this.scene.addElement(this.pre_building, 1, this.render_level + 1);
			//this.show_all_ranges = true;
		},

		/**
		 * 退出预建设状态
		 */
		cancelPreBuild: function () {
			TD.mode = "normal";
			if (this.pre_building) {
				this.pre_building.remove();
			}
			//this.show_all_ranges = false;
		},

		/**
		 * 清除地图上无效的元素
		 */
		clearInvalidElements: function () {
			if (this._wait_clearInvalidElements > 0) {
				this._wait_clearInvalidElements--;
				return;
			}
			this._wait_clearInvalidElements = _default_wait_clearInvalidElements;

			var a = [];
			TD.lang.shift(this.buildings, function (obj) {
				if (obj.is_valid)
					a.push(obj);
			});
			this.buildings = a;

			a = [];
			TD.lang.shift(this.monsters, function (obj) {
				if (obj.is_valid)
					a.push(obj);
			});
			this.monsters = a;

			a = [];
			TD.lang.shift(this.bullets, function (obj) {
				if (obj.is_valid)
					a.push(obj);
			});
			this.bullets = a;
		},

		/**
		 * 在地图的入口处添加一个怪物
		 * @param monster 可以是数字，也可以是 monster 对象
		 */
		addMonster: function (monster) {
			if (!this.entrance) return;
			if (typeof monster == "number") {
				monster = new TD.Monster(null, {
					idx: monster,
					difficulty: TD.difficulty,
					step_level: this.step_level,
					render_level: this.render_level + 2
				});
			}
			this.entrance.addMonster(monster);
		},

		/**
		 * 在地图的入口处添加 n 个怪物
		 * @param n
		 * @param monster
		 */
		addMonsters: function (n, monster) {
			this._wait_add_monsters = n;
			this._wait_add_monsters_objidx = monster;
		},

		/**
		 * arr 的格式形如：
		 *     [[1, 0], [2, 5], [3, 6], [10, 4]...]
		 */
		addMonsters2: function (arr) {
			this._wait_add_monsters_arr = arr;
		},

		/**
		 * 检查地图的指定格子是否可通过
		 * @param mx {Number}
		 * @param my {Number}
		 */
		checkPassable: function (mx, my) {
			var grid = this.getGrid(mx, my);
			return (grid != null && grid.passable_flag == 1 && grid.build_flag != 2);
		},

		step: function () {
			this.clearInvalidElements();

			if (this._wait_add_monsters > 0) {
				this.addMonster(this._wait_add_monsters_objidx);
				this._wait_add_monsters--;
			} else if (this._wait_add_monsters_arr.length > 0) {
				var a = this._wait_add_monsters_arr.shift();
				this.addMonsters(a[0], a[1]);
			}
		},

		render: function () {
			var ctx = TD.ctx;
			ctx.strokeStyle = "#99a";
			ctx.lineWidth = _TD.retina;
			ctx.beginPath();
			ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.width, this.height);
			ctx.closePath();
			ctx.stroke();
		},

		/**
		 * 鼠标移出地图事件
		 */
		onOut: function () {
			if (this.is_main_map && this.pre_building)
				this.pre_building.hide();
		}
	};

	/**
	 * @param id {String} 配置对象
	 * @param cfg {Object} 配置对象
	 *         至少需要包含以下项：
	 *         {
	 *			 grid_x: 宽度（格子）,
	 *			 grid_y: 高度（格子）,
	 *			 scene: 属于哪个场景,
	 *		 }
	 */
	TD.Map = function (id, cfg) {
		// map 目前只需要监听 out 事件
		// 虽然只需要监听 out 事件，但同时也需要监听 enter ，因为如果
		// 没有 enter ，out 将永远不会被触发
		cfg.on_events = ["enter", "out"];
		var map = new TD.Element(id, cfg);
		TD.lang.mix(map, map_obj);
		map._init(cfg);

		return map;
	};


	/**
	 * 地图选中元素高亮边框对象
	 */
	var map_selecthl_obj = {
		_init: function (cfg) {
			this.map = cfg.map;
			this.width = TD.grid_size + 2;
			this.height = TD.grid_size + 2;
			this.is_visiable = false;
		},
		show: function (grid) {
			this.x = grid.x;
			this.y = grid.y;
			this.is_visiable = true;
		},
		render: function () {
			var ctx = TD.ctx;
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#f93";
			ctx.beginPath();
			ctx.strokeRect(this.x, this.y, this.width - 1, this.height - 1);
			ctx.closePath();
			ctx.stroke();
		}
	};

	/**
	 * 地图选中的高亮框
	 * @param id {String} 至少需要包含
	 * @param cfg {Object} 至少需要包含
	 *      {
	 *          map: map 对象
	 *      }
	 */
	TD.MapSelectHighLight = function (id, cfg) {
		var map_selecthl = new TD.Element(id, cfg);
		TD.lang.mix(map_selecthl, map_selecthl_obj);
		map_selecthl._init(cfg);

		return map_selecthl;
	};


	var mmm_obj = {
		_init: function (cfg) {
			this.map = cfg.map;

			this.x1 = this.map.x;
			this.y1 = this.map.y;
			this.x2 = this.map.x2 + 1;
			this.y2 = this.map.y2 + 1;
			this.w = this.map.scene.stage.width;
			this.h = this.map.scene.stage.height;
			this.w2 = this.w - this.x2;
			this.h2 = this.h - this.y2;
		},
		render: function () {
			var ctx = TD.ctx;
			/*ctx.clearRect(0, 0, this.x1, this.h);
			 ctx.clearRect(0, 0, this.w, this.y1);
			 ctx.clearRect(0, this.y2, this.w, this.h2);
			 ctx.clearRect(this.x2, 0, this.w2, this.h2);*/

			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.fillRect(0, 0, this.x1, this.h);
			ctx.fillRect(0, 0, this.w, this.y1);
			ctx.fillRect(0, this.y2, this.w, this.h2);
			ctx.fillRect(this.x2, 0, this.w2, this.h);
			ctx.closePath();
			ctx.fill();

		}
	};

	/**
	 * 主地图外边的遮罩，用于遮住超出地图的射程等
	 */
	function MainMapMask(id, cfg) {
		var mmm = new TD.Element(id, cfg);
		TD.lang.mix(mmm, mmm_obj);
		mmm._init(cfg);

		return mmm;
	}

}); // _TD.a.push end

/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	// grid 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var grid_obj = {
		_init: function (cfg) {
			cfg = cfg || {};
			this.map = cfg.map;
			this.scene = this.map.scene;
			this.mx = cfg.mx; // 在 map 中的格子坐标
			this.my = cfg.my;
			this.width = TD.grid_size;
			this.height = TD.grid_size;
			this.is_entrance = this.is_exit = false;
			this.passable_flag = 1; // 0: 不可通过; 1: 可通过
			this.build_flag = 1;// 0: 不可修建; 1: 可修建; 2: 已修建
			this.building = null;
			this.caculatePos();
		},

		/**
		 * 根据 map 位置及本 grid 的 (mx, my) ，计算格子的位置
		 */
		caculatePos: function () {
			this.x = this.map.x + this.mx * TD.grid_size;
			this.y = this.map.y + this.my * TD.grid_size;
			this.x2 = this.x + TD.grid_size;
			this.y2 = this.y + TD.grid_size;
			this.cx = Math.floor(this.x + TD.grid_size / 2);
			this.cy = Math.floor(this.y + TD.grid_size / 2);
		},

		/**
		 * 检查如果在当前格子建东西，是否会导致起点与终点被阻塞
		 */
		checkBlock: function () {
			if (this.is_entrance || this.is_exit) {
				this._block_msg = TD._t("entrance_or_exit_be_blocked");
				return true;
			}

			var is_blocked,
				_this = this,
				fw = new TD.FindWay(
					this.map.grid_x, this.map.grid_y,
					this.map.entrance.mx, this.map.entrance.my,
					this.map.exit.mx, this.map.exit.my,
					function (x, y) {
						return !(x == _this.mx && y == _this.my) && _this.map.checkPassable(x, y);
					}
				);

			is_blocked = fw.is_blocked;

			if (!is_blocked) {
				is_blocked = !!this.map.anyMonster(function (obj) {
					return obj.chkIfBlocked(_this.mx, _this.my);
				});
				if (is_blocked)
					this._block_msg = TD._t("monster_be_blocked");
			} else {
				this._block_msg = TD._t("blocked");
			}

			return is_blocked;
		},

		/**
		 * 购买建筑
		 * @param building_type {String}
		 */
		buyBuilding: function (building_type) {
			var cost = TD.getDefaultBuildingAttributes(building_type).cost || 0;
			if (TD.money >= cost) {
				TD.money -= cost;
				this.addBuilding(building_type);
			} else {
				TD.log(TD._t("not_enough_money", [cost]));
				this.scene.panel.balloontip.msg(TD._t("not_enough_money", [cost]), this);
			}
		},

		/**
		 * 在当前格子添加指定类型的建筑
		 * @param building_type {String}
		 */
		addBuilding: function (building_type) {
			if (this.building) {
				// 如果当前格子已经有建筑，先将其移除
				this.removeBuilding();
			}

			var building = new TD.Building("building-" + building_type + "-" + TD.lang.rndStr(), {
				type: building_type,
				step_level: this.step_level,
				render_level: this.render_level
			});
			building.locate(this);

			this.scene.addElement(building, this.step_level, this.render_level + 1);
			this.map.buildings.push(building);
			this.building = building;
			this.build_flag = 2;
			this.map.checkHasWeapon();
			if (this.map.pre_building)
				this.map.pre_building.hide();
		},

		/**
		 * 移除当前格子的建筑
		 */
		removeBuilding: function () {
			if (this.build_flag == 2)
				this.build_flag = 1;
			if (this.building)
				this.building.remove();
			this.building = null;
		},

		/**
		 * 在当前建筑添加一个怪物
		 * @param monster
		 */
		addMonster: function (monster) {
			monster.beAddToGrid(this);
			this.map.monsters.push(monster);
			monster.start();
		},

		/**
		 * 高亮当前格子
		 * @param show {Boolean}
		 */
		hightLight: function (show) {
			this.map.select_hl[show ? "show" : "hide"](this);
		},

		render: function () {
			var ctx = TD.ctx,
				px = this.x + 0.5,
				py = this.y + 0.5;

			//if (this.map.is_main_map) {
			//ctx.drawImage(this.map.res,
			//0, 0, 32, 32, this.x, this.y, 32, 32
			//);
			//}

			if (this.is_hover) {
				ctx.fillStyle = "rgba(255, 255, 200, 0.2)";
				ctx.beginPath();
				ctx.fillRect(px, py, this.width, this.height);
				ctx.closePath();
				ctx.fill();
			}

			if (this.passable_flag == 0) {
				// 不可通过
				ctx.fillStyle = "#fcc";
				ctx.beginPath();
				ctx.fillRect(px, py, this.width, this.height);
				ctx.closePath();
				ctx.fill();
			}

			/**
			 * 画入口及出口
			 */
			if (this.is_entrance || this.is_exit) {
				ctx.lineWidth = 1;
				ctx.fillStyle = "#ccc";
				ctx.beginPath();
				ctx.fillRect(px, py, this.width, this.height);
				ctx.closePath();
				ctx.fill();

				ctx.strokeStyle = "#666";
				ctx.fillStyle = this.is_entrance ? "#fff" : "#666";
				ctx.beginPath();
				ctx.arc(this.cx, this.cy, TD.grid_size * 0.325, 0, Math.PI * 2, true);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			}

			ctx.strokeStyle = "#eee";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.strokeRect(px, py, this.width, this.height);
			ctx.closePath();
			ctx.stroke();
		},

		/**
		 * 鼠标进入当前格子事件
		 */
		onEnter: function () {
			if (this.map.is_main_map && TD.mode == "build") {
				if (this.build_flag == 1) {
					this.map.pre_building.show();
					this.map.pre_building.locate(this);
				} else {
					this.map.pre_building.hide();
				}
			} else if (this.map.is_main_map) {
				var msg = "";
				if (this.is_entrance) {
					msg = TD._t("entrance");
				} else if (this.is_exit) {
					msg = TD._t("exit");
				} else if (this.passable_flag == 0) {
					msg = TD._t("_cant_pass");
				} else if (this.build_flag == 0) {
					msg = TD._t("_cant_build");
				}

				if (msg) {
					this.scene.panel.balloontip.msg(msg, this);
				}
			}
		},

		/**
		 * 鼠标移出当前格子事件
		 */
		onOut: function () {
			// 如果当前气球提示指向本格子，将其隐藏
			if (this.scene.panel.balloontip.el == this) {
				this.scene.panel.balloontip.hide();
			}
		},

		/**
		 * 鼠标点击了当前格子事件
		 */
		onClick: function () {
			if (this.scene.state != 1) return;

			if (TD.mode == "build" && this.map.is_main_map && !this.building) {
				// 如果处于建设模式下，并且点击在主地图的空格子上，则尝试建设指定建筑
				if (this.checkBlock()) {
					// 起点与终点之间被阻塞，不能修建
					this.scene.panel.balloontip.msg(this._block_msg, this);
				} else {
					// 购买建筑
					this.buyBuilding(this.map.pre_building.type);
				}
			} else if (!this.building && this.map.selected_building) {
				// 取消选中建筑
				this.map.selected_building.toggleSelected();
				this.map.selected_building = null;
			}
		}
	};

	/**
	 * @param id {String}
	 * @param cfg {object} 配置对象
	 *         至少需要包含以下项：
	 *         {
	 *			 mx: 在 map 格子中的横向坐标,
	 *			 my: 在 map 格子中的纵向坐标,
	 *			 map: 属于哪个 map,
	 *		 }
	 */
	TD.Grid = function (id, cfg) {
		cfg.on_events = ["enter", "out", "click"];

		var grid = new TD.Element(id, cfg);
		TD.lang.mix(grid, grid_obj);
		grid._init(cfg);

		return grid;
	};

}); // _TD.a.push end
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	// building 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var building_obj = {
		_init: function (cfg) {
			this.is_selected = false;
			this.level = 0;
			this.killed = 0; // 当前建筑杀死了多少怪物
			this.target = null;

			cfg = cfg || {};
			this.map = cfg.map || null;
			this.grid = cfg.grid || null;

			/**
			 * 子弹类型，可以有以下类型：
			 *         1：普通子弹
			 *         2：激光类，发射后马上命中，暂未实现
			 *         3：导弹类，击中后会爆炸，带来面攻击，暂未实现
			 */
			this.bullet_type = cfg.bullet_type || 1;

			/**
			 * type 可能的值有：
			 *         "wall": 墙壁，没有攻击性
			 *         "cannon": 炮台
			 *         "LMG": 轻机枪
			 *         "HMG": 重机枪
			 *         "laser_gun": 激光枪
			 *
			 */
			this.type = cfg.type;

			this.speed = cfg.speed;
			this.bullet_speed = cfg.bullet_speed;
			this.is_pre_building = !!cfg.is_pre_building;
			this.blink = this.is_pre_building;
			this.wait_blink = this._default_wait_blink = 20;
			this.is_weapon = (this.type != "wall"); // 墙等不可攻击的建筑此项为 false ，其余武器此项为 true

			var o = TD.getDefaultBuildingAttributes(this.type);
			TD.lang.mix(this, o);
			this.range_px = this.range * TD.grid_size;
			this.money = this.cost; // 购买、升级本建筑已花费的钱

			this.caculatePos();
		},

		/**
		 * 升级本建筑需要的花费
		 */
		getUpgradeCost: function () {
			return Math.floor(this.money * 0.75);
		},

		/**
		 * 出售本建筑能得到多少钱
		 */
		getSellMoney: function () {
			return Math.floor(this.money * 0.5) || 1;
		},

		/**
		 * 切换选中 / 未选中状态
		 */
		toggleSelected: function () {
			this.is_selected = !this.is_selected;
			this.grid.hightLight(this.is_selected); // 高亮
			var _this = this;

			if (this.is_selected) {
				// 如果当前建筑被选中

				this.map.eachBuilding(function (obj) {
					obj.is_selected = obj == _this;
				});
				// 取消另一个地图中选中建筑的选中状态
				(
					this.map.is_main_map ? this.scene.panel_map : this.scene.map
				).eachBuilding(function (obj) {
						obj.is_selected = false;
						obj.grid.hightLight(false);
					});
				this.map.selected_building = this;

				if (!this.map.is_main_map) {
					// 在面版地图中选中了建筑，进入建筑模式
					this.scene.map.preBuild(this.type);
				} else {
					// 取消建筑模式
					this.scene.map.cancelPreBuild();
				}

			} else {
				// 如果当前建筑切换为未选中状态

				if (this.map.selected_building == this)
					this.map.selected_building = null;

				if (!this.map.is_main_map) {
					// 取消建筑模式
					this.scene.map.cancelPreBuild();
				}
			}

			// 如果是选中 / 取消选中主地图上的建筑，显示 / 隐藏对应的操作按钮
			if (this.map.is_main_map) {
				if (this.map.selected_building) {
					this.scene.panel.btn_upgrade.show();
					this.scene.panel.btn_sell.show();
					this.updateBtnDesc();
				} else {
					this.scene.panel.btn_upgrade.hide();
					this.scene.panel.btn_sell.hide();
				}
			}
		},

		/**
		 * 生成、更新升级按钮的说明文字
		 */
		updateBtnDesc: function () {
			this.scene.panel.btn_upgrade.desc = TD._t(
				"upgrade", [
					TD._t("building_name_" + this.type),
					this.level + 1,
					this.getUpgradeCost()
				]);
			this.scene.panel.btn_sell.desc = TD._t(
				"sell", [
					TD._t("building_name_" + this.type),
					this.getSellMoney()
				]);
		},

		/**
		 * 将本建筑放置到一个格子中
		 * @param grid {Element} 指定格子
		 */
		locate: function (grid) {
			this.grid = grid;
			this.map = grid.map;
			this.cx = this.grid.cx;
			this.cy = this.grid.cy;
			this.x = this.grid.x;
			this.y = this.grid.y;
			this.x2 = this.grid.x2;
			this.y2 = this.grid.y2;
			this.width = this.grid.width;
			this.height = this.grid.height;

			this.px = this.x + 0.5;
			this.py = this.y + 0.5;

			this.wait_blink = this._default_wait_blink;
			this._fire_wait = Math.floor(Math.max(2 / (this.speed * TD.global_speed), 1));
			this._fire_wait2 = this._fire_wait;

		},

		/**
		 * 将本建筑彻底删除
		 */
		remove: function () {
//			TD.log("remove building #" + this.id + ".");
			if (this.grid && this.grid.building && this.grid.building == this)
				this.grid.building = null;
			this.hide();
			this.del();
		},

		/**
		 * 寻找一个目标（怪物）
		 */
		findTaget: function () {
			if (!this.is_weapon || this.is_pre_building || !this.grid) return;

			var cx = this.cx, cy = this.cy,
				range2 = Math.pow(this.range_px, 2);

			// 如果当前建筑有目标，并且目标还是有效的，并且目标仍在射程内
			if (this.target && this.target.is_valid &&
				Math.pow(this.target.cx - cx, 2) + Math.pow(this.target.cy - cy, 2) <= range2)
				return;

			// 在进入射程的怪物中寻找新的目标
			this.target = TD.lang.any(
				TD.lang.rndSort(this.map.monsters), // 将怪物随机排序
				function (obj) {
					return Math.pow(obj.cx - cx, 2) + Math.pow(obj.cy - cy, 2) <= range2;
				});
		},

		/**
		 * 取得目标的坐标（相对于地图左上角）
		 */
		getTargetPosition: function () {
			if (!this.target) {
				// 以 entrance 为目标
				var grid = this.map.is_main_map ? this.map.entrance : this.grid;
				return [grid.cx, grid.cy];
			}
			return [this.target.cx, this.target.cy];
		},

		/**
		 * 向自己的目标开火
		 */
		fire: function () {
			if (!this.target || !this.target.is_valid) return;

			if (this.type == "laser_gun") {
				// 如果是激光枪，目标立刻被击中
				this.target.beHit(this, this.damage);
				return;
			}

			var muzzle = this.muzzle || [this.cx, this.cy], // 炮口的位置
				cx = muzzle[0],
				cy = muzzle[1];

			new TD.Bullet(null, {
				building: this,
				damage: this.damage,
				target: this.target,
				speed: this.bullet_speed,
				x: cx,
				y: cy
			});
		},

		tryToFire: function () {
			if (!this.is_weapon || !this.target)
				return;

			this._fire_wait--;
			if (this._fire_wait > 0) {
//			return;
			} else if (this._fire_wait < 0) {
				this._fire_wait = this._fire_wait2;
			} else {
				this.fire();
			}
		},

		_upgrade2: function (k) {
			if (!this._upgrade_records[k])
				this._upgrade_records[k] = this[k];
			var v = this._upgrade_records[k],
				mk = "max_" + k,
				uk = "_upgrade_rule_" + k,
				uf = this[uk] || TD.default_upgrade_rule;
			if (!v || isNaN(v)) return;

			v = uf(this.level, v);
			if (this[mk] && !isNaN(this[mk]) && this[mk] < v)
				v = this[mk];
			this._upgrade_records[k] = v;
			this[k] = Math.floor(v);
		},

		/**
		 * 升级建筑
		 */
		upgrade: function () {
			if (!this._upgrade_records)
				this._upgrade_records = {};

			var attrs = [
				// 可升级的变量
				"damage", "range", "speed", "life", "shield"
			], i, l = attrs.length;
			for (i = 0; i < l; i++)
				this._upgrade2(attrs[i]);
			this.level++;
			this.range_px = this.range * TD.grid_size;
		},

		tryToUpgrade: function (btn) {
			var cost = this.getUpgradeCost(),
				msg = "";
			if (cost > TD.money) {
				msg = TD._t("not_enough_money", [cost]);
			} else {
				TD.money -= cost;
				this.money += cost;
				this.upgrade();
				msg = TD._t("upgrade_success", [
					TD._t("building_name_" + this.type), this.level,
					this.getUpgradeCost()
				]);
			}

			this.updateBtnDesc();
			this.scene.panel.balloontip.msg(msg, btn);
		},

		tryToSell: function () {
			if (!this.is_valid) return;

			TD.money += this.getSellMoney();
			this.grid.removeBuilding();
			this.is_valid = false;
			this.map.selected_building = null;
			this.map.select_hl.hide();
			this.map.checkHasWeapon();
			this.scene.panel.btn_upgrade.hide();
			this.scene.panel.btn_sell.hide();
			this.scene.panel.balloontip.hide();
		},

		step: function () {
			if (this.blink) {
				this.wait_blink--;
				if (this.wait_blink < -this._default_wait_blink)
					this.wait_blink = this._default_wait_blink;
			}

			this.findTaget();
			this.tryToFire();
		},

		render: function () {
			if (!this.is_visiable || this.wait_blink < 0) return;

			var ctx = TD.ctx;

			TD.renderBuilding(this);

			if (
				this.map.is_main_map &&
				(
					this.is_selected || (this.is_pre_building) ||
					this.map.show_all_ranges
				) &&
				this.is_weapon && this.range > 0 && this.grid
			) {
				// 画射程
				ctx.lineWidth = _TD.retina;
				ctx.fillStyle = "rgba(187, 141, 32, 0.15)";
				ctx.strokeStyle = "#bb8d20";
				ctx.beginPath();
				ctx.arc(this.cx, this.cy, this.range_px, 0, Math.PI * 2, true);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			}

			if (this.type == "laser_gun" && this.target && this.target.is_valid) {
				// 画激光
				ctx.lineWidth = 3 * _TD.retina;
				ctx.strokeStyle = "rgba(50, 50, 200, 0.5)";
				ctx.beginPath();
				ctx.moveTo(this.cx, this.cy);
				ctx.lineTo(this.target.cx, this.target.cy);
				ctx.closePath();
				ctx.stroke();
				ctx.lineWidth = _TD.retina;
				ctx.strokeStyle = "rgba(150, 150, 255, 0.5)";
				ctx.beginPath();
				ctx.lineTo(this.cx, this.cy);
				ctx.closePath();
				ctx.stroke();
			}
		},

		onEnter: function () {
			if (this.is_pre_building) return;

			var msg = "建筑工事";
			if (this.map.is_main_map) {
				msg = TD._t("building_info" + (this.type == "wall" ? "_wall" : ""), [TD._t("building_name_" + this.type), this.level, this.damage, this.speed, this.range, this.killed]);
			} else {
				msg = TD._t("building_intro_" + this.type, [TD.getDefaultBuildingAttributes(this.type).cost]);
			}

			this.scene.panel.balloontip.msg(msg, this.grid);
		},

		onOut: function () {
			if (this.scene.panel.balloontip.el == this.grid) {
				this.scene.panel.balloontip.hide();
			}
		},

		onClick: function () {
			if (this.is_pre_building || this.scene.state != 1) return;
			this.toggleSelected();
		}
	};

	/**
	 * @param id {String}
	 * @param cfg {object} 配置对象
	 *         至少需要包含以下项：
	 *         {
	 *			 type: 建筑类型，可选的值有
	 *				 "wall"
	 *				 "cannon"
	 *				 "LMG"
	 *				 "HMG"
	 *				 "laser_gun"
	 *		 }
	 */
	TD.Building = function (id, cfg) {
		cfg.on_events = ["enter", "out", "click"];
		var building = new TD.Element(id, cfg);
		TD.lang.mix(building, building_obj);
		building._init(cfg);

		return building;
	};


	// bullet 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var bullet_obj = {
		_init: function (cfg) {
			cfg = cfg || {};

			this.speed = cfg.speed;
			this.damage = cfg.damage;
			this.target = cfg.target;
			this.cx = cfg.x;
			this.cy = cfg.y;
			this.r = cfg.r || Math.max(Math.log(this.damage), 2);
			if (this.r < 1) this.r = 1;
			if (this.r > 6) this.r = 6;

			this.building = cfg.building || null;
			this.map = cfg.map || this.building.map;
			this.type = cfg.type || 1;
			this.color = cfg.color || "#000";

			this.map.bullets.push(this);
			this.addToScene(this.map.scene, 1, 6);

			if (this.type == 1) {
				this.caculate();
			}
		},

		/**
		 * 计算子弹的一些数值
		 */
		caculate: function () {
			var sx, sy, c,
				tx = this.target.cx,
				ty = this.target.cy,
				speed;
			sx = tx - this.cx;
			sy = ty - this.cy;
			c = Math.sqrt(Math.pow(sx, 2) + Math.pow(sy, 2));
			speed = 20 * this.speed * TD.global_speed;
			this.vx = sx * speed / c;
			this.vy = sy * speed / c;
		},

		/**
		 * 检查当前子弹是否已超出地图范围
		 */
		checkOutOfMap: function () {
			this.is_valid = !(
				this.cx < this.map.x ||
				this.cx > this.map.x2 ||
				this.cy < this.map.y ||
				this.cy > this.map.y2
			);

			return !this.is_valid;
		},

		/**
		 * 检查当前子弹是否击中了怪物
		 */
		checkHit: function () {
			var cx = this.cx,
				cy = this.cy,
				r = this.r * _TD.retina,
				monster = this.map.anyMonster(function (obj) {
					return Math.pow(obj.cx - cx, 2) + Math.pow(obj.cy - cy, 2) <= Math.pow(obj.r + r, 2) * 2;
				});

			if (monster) {
				// 击中的怪物
				monster.beHit(this.building, this.damage);
				this.is_valid = false;

				// 子弹小爆炸效果
				TD.Explode(this.id + "-explode", {
					cx: this.cx,
					cy: this.cy,
					r: this.r,
					step_level: this.step_level,
					render_level: this.render_level,
					color: this.color,
					scene: this.map.scene,
					time: 0.2
				});

				return true;
			}
			return false;
		},

		step: function () {
			if (this.checkOutOfMap() || this.checkHit()) return;

			this.cx += this.vx;
			this.cy += this.vy;
		},

		render: function () {
			var ctx = TD.ctx;
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
		}
	};

	/**
	 * @param id {String} 配置对象
	 * @param cfg {Object} 配置对象
	 *         至少需要包含以下项：
	 *         {
	 *			 x: 子弹发出的位置
	 *			 y: 子弹发出的位置
	 *			 speed:
	 *			 damage:
	 *			 target: 目标，一个 monster 对象
	 *			 building: 所属的建筑
	 *		 }
	 * 子弹类型，可以有以下类型：
	 *         1：普通子弹
	 *         2：激光类，发射后马上命中
	 *         3：导弹类，击中后会爆炸，带来面攻击
	 */
	TD.Bullet = function (id, cfg) {
		var bullet = new TD.Element(id, cfg);
		TD.lang.mix(bullet, bullet_obj);
		bullet._init(cfg);

		return bullet;
	};

}); // _TD.a.push end

/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	// monster 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var monster_obj = {
		_init: function (cfg) {
			cfg = cfg || {};
			this.is_monster = true;
			this.idx = cfg.idx || 1;
			this.difficulty = cfg.difficulty || 1.0;
			var attr = TD.getDefaultMonsterAttributes(this.idx);

			this.speed = Math.floor(
				(attr.speed + this.difficulty / 2) * (Math.random() * 0.5 + 0.75)
			);
			if (this.speed < 1) this.speed = 1;
			if (this.speed > cfg.max_speed) this.speed = cfg.max_speed;

			this.life = this.life0 = Math.floor(
				attr.life * (this.difficulty + 1) * (Math.random() + 0.5) * 0.5
			);
			if (this.life < 1) this.life = this.life0 = 1;

			this.shield = Math.floor(attr.shield + this.difficulty / 2);
			if (this.shield < 0) this.shield = 0;

			this.damage = Math.floor(
				(attr.damage || 1) * (Math.random() * 0.5 + 0.75)
			);
			if (this.damage < 1) this.damage = 1;

			this.money = attr.money || Math.floor(
					Math.sqrt((this.speed + this.life) * (this.shield + 1) * this.damage)
				);
			if (this.money < 1) this.money = 1;

			this.color = attr.color || TD.lang.rndRGB();
			this.r = Math.floor(this.damage * 1.2) * _TD.retina;
			if (this.r < (4 * _TD.retina)) this.r = 4 * _TD.retina;
			if (this.r > TD.grid_size / 2 - (4 * _TD.retina)) this.r = TD.grid_size / 2 - (4 * _TD.retina);
			this.render = attr.render;

			this.grid = null; // 当前格子
			this.map = null;
			this.next_grid = null;
			this.way = [];
			this.toward = 2; // 默认面朝下方
			this._dx = 0;
			this._dy = 0;

			this.is_blocked = false; // 前进的道路是否被阻塞了
		},
		caculatePos: function () {
//		if (!this.map) return;
			var r = this.r;
			this.x = this.cx - r;
			this.y = this.cy - r;
			this.x2 = this.cx + r;
			this.y2 = this.cy + r;
		},

		/**
		 * 怪物被击中
		 * @param building {Element} 对应的建筑（武器）
		 * @param damage {Number} 本次攻击的原始伤害值
		 */
		beHit: function (building, damage) {
			if (!this.is_valid) return;
			var min_damage = Math.ceil(damage * 0.1);
			damage -= this.shield;
			if (damage <= min_damage) damage = min_damage;

			this.life -= damage;
			TD.score += Math.floor(Math.sqrt(damage));
			if (this.life <= 0) {
				this.beKilled(building);
			}

			var balloontip = this.scene.panel.balloontip;
			if (balloontip.el == this) {
				balloontip.text = TD._t("monster_info", [this.life, this.shield, this.speed, this.damage]);
			}

		},

		/**
		 * 怪物被杀死
		 * @param building {Element} 对应的建筑（武器）
		 */
		beKilled: function (building) {
			if (!this.is_valid) return;
			this.life = 0;
			this.is_valid = false;

			TD.money += this.money;
			building.killed++;

			TD.Explode(this.id + "-explode", {
				cx: this.cx,
				cy: this.cy,
				color: this.color,
				r: this.r,
				step_level: this.step_level,
				render_level: this.render_level,
				scene: this.grid.scene
			});
		},
		arrive: function () {
			this.grid = this.next_grid;
			this.next_grid = null;
			this.checkFinish();
		},
		findWay: function () {
			var _this = this;
			var fw = new TD.FindWay(
				this.map.grid_x, this.map.grid_y,
				this.grid.mx, this.grid.my,
				this.map.exit.mx, this.map.exit.my,
				function (x, y) {
					return _this.map.checkPassable(x, y);
				}
			);
			this.way = fw.way;
			//delete fw;
		},

		/**
		 * 检查是否已到达终点
		 */
		checkFinish: function () {
			if (this.grid && this.map && this.grid == this.map.exit) {
				TD.life -= this.damage;
				TD.wave_damage += this.damage;
				if (TD.life <= 0) {
					TD.life = 0;
					TD.stage.gameover();
				} else {
					this.pause();
					this.del();
				}
			}
		},
		beAddToGrid: function (grid) {
			this.grid = grid;
			this.map = grid.map;
			this.cx = grid.cx;
			this.cy = grid.cy;

			this.grid.scene.addElement(this);
		},

		/**
		 * 取得朝向
		 * 即下一个格子在当前格子的哪边
		 *     0：上；1：右；2：下；3：左
		 */
		getToward: function () {
			if (!this.grid || !this.next_grid) return;
			if (this.grid.my < this.next_grid.my) {
				this.toward = 0;
			} else if (this.grid.mx < this.next_grid.mx) {
				this.toward = 1;
			} else if (this.grid.my > this.next_grid.my) {
				this.toward = 2;
			} else if (this.grid.mx > this.next_grid.mx) {
				this.toward = 3;
			}
		},

		/**
		 * 取得要去的下一个格子
		 */
		getNextGrid: function () {
			if (this.way.length == 0 ||
				Math.random() < 0.1 // 有 1/10 的概率自动重新寻路
			) {
				this.findWay();
			}

			var next_grid = this.way.shift();
			if (next_grid && !this.map.checkPassable(next_grid[0], next_grid[1])) {
				this.findWay();
				next_grid = this.way.shift();
			}

			if (!next_grid) {
				return;
			}

			this.next_grid = this.map.getGrid(next_grid[0], next_grid[1]);
//			this.getToward(); // 在这个版本中暂时没有用
		},

		/**
		 * 检查假如在地图 (x, y) 的位置修建建筑，是否会阻塞当前怪物
		 * @param mx {Number} 地图的 x 坐标
		 * @param my {Number} 地图的 y 坐标
		 * @return {Boolean}
		 */
		chkIfBlocked: function (mx, my) {

			var _this = this,
				fw = new TD.FindWay(
					this.map.grid_x, this.map.grid_y,
					this.grid.mx, this.grid.my,
					this.map.exit.mx, this.map.exit.my,
					function (x, y) {
						return !(x == mx && y == my) &&
							_this.map.checkPassable(x, y);
					}
				);

			return fw.is_blocked;

		},

		/**
		 * 怪物前进的道路被阻塞（被建筑包围了）
		 */
		beBlocked: function () {
			if (this.is_blocked) return;

			this.is_blocked = true;
			TD.log("monster be blocked!");
		},

		step: function () {
			if (!this.is_valid || this.is_paused || !this.grid) return;

			if (!this.next_grid) {
				this.getNextGrid();

				/**
				 * 如果依旧找不着下一步可去的格子，说明当前怪物被阻塞了
				 */
				if (!this.next_grid) {
					this.beBlocked();
					return;
				}
			}

			if (this.cx == this.next_grid.cx && this.cy == this.next_grid.cy) {
				this.arrive();
			} else {
				// 移动到 next grid

				var dpx = this.next_grid.cx - this.cx,
					dpy = this.next_grid.cy - this.cy,
					sx = dpx < 0 ? -1 : 1,
					sy = dpy < 0 ? -1 : 1,
					speed = this.speed * TD.global_speed;

				if (Math.abs(dpx) < speed && Math.abs(dpy) < speed) {
					this.cx = this.next_grid.cx;
					this.cy = this.next_grid.cy;
					this._dx = speed - Math.abs(dpx);
					this._dy = speed - Math.abs(dpy);
				} else {
					this.cx += dpx == 0 ? 0 : sx * (speed + this._dx);
					this.cy += dpy == 0 ? 0 : sy * (speed + this._dy);
					this._dx = 0;
					this._dy = 0;
				}
			}

			this.caculatePos();
		},

		onEnter: function () {
			var msg,
				balloontip = this.scene.panel.balloontip;

			if (balloontip.el == this) {
				balloontip.hide();
				balloontip.el = null;
			} else {
				msg = TD._t("monster_info",
					[this.life, this.shield, this.speed, this.damage]);
				balloontip.msg(msg, this);
			}
		},

		onOut: function () {
//			if (this.scene.panel.balloontip.el == this) {
//				this.scene.panel.balloontip.hide();
//			}
		}
	};

	/**
	 * @param id {String}
	 * @param cfg {Object} 配置对象
	 *         至少需要包含以下项：
	 *         {
	 *			 life: 怪物的生命值
	 *			 shield: 怪物的防御值
	 *			 speed: 怪物的速度
	 *		 }
	 */
	TD.Monster = function (id, cfg) {
		cfg.on_events = ["enter", "out"];
		var monster = new TD.Element(id, cfg);
		TD.lang.mix(monster, monster_obj);
		monster._init(cfg);

		return monster;
	};


	/**
	 * 怪物死亡时的爆炸效果对象
	 */
	var explode_obj = {
		_init: function (cfg) {
			cfg = cfg || {};

			var rgb = TD.lang.rgb2Arr(cfg.color);
			this.cx = cfg.cx;
			this.cy = cfg.cy;
			this.r = cfg.r * _TD.retina;
			this.step_level = cfg.step_level;
			this.render_level = cfg.render_level;

			this.rgb_r = rgb[0];
			this.rgb_g = rgb[1];
			this.rgb_b = rgb[2];
			this.rgb_a = 1;

			this.wait = this.wait0 = TD.exp_fps * (cfg.time || 1);

			cfg.scene.addElement(this);
		},
		step: function () {
			if (!this.is_valid) return;

			this.wait--;
			this.r++;

			this.is_valid = this.wait > 0;
			this.rgb_a = this.wait / this.wait0;
		},
		render: function () {
			var ctx = TD.ctx;

			ctx.fillStyle = "rgba(" + this.rgb_r + "," + this.rgb_g + ","
				+ this.rgb_b + "," + this.rgb_a + ")";
			ctx.beginPath();
			ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
		}
	};

	/**
	 * @param id {String}
	 * @param cfg {Object} 配置对象
	 *         {
	 *			// 至少需要包含以下项：
	 * 			 cx: 中心 x 坐标
	 * 			 cy: 中心 y 坐标
	 * 			 r: 半径
	 * 			 color: RGB色彩，形如“#f98723”
	 * 			 scene: Scene 对象
	 * 			 step_level:
	 * 			 render_level:
	 *
	 * 			// 以下项可选：
	 * 			time: 持续时间，默认为 1，单位大致为秒（根据渲染情况而定，不是很精确）
	 *		 }
	 */
	TD.Explode = function (id, cfg) {
//		cfg.on_events = ["enter", "out"];
		var explode = new TD.Element(id, cfg);
		TD.lang.mix(explode, explode_obj);
		explode._init(cfg);

		return explode;
	};

}); // _TD.a.push end


/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	// panel 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var panel_obj = {
		_init: function (cfg) {
			cfg = cfg || {};
			this.x = cfg.x;
			this.y = cfg.y;
			this.scene = cfg.scene;
			this.map = cfg.main_map;

			// make panel map
			var panel_map = new TD.Map("panel-map", TD.lang.mix({
					x: this.x + cfg.map.x,
					y: this.y + cfg.map.y,
					scene: this.scene,
					step_level: this.step_level,
					render_level: this.render_level
				}, cfg.map, false));

			this.addToScene(this.scene, 1, 7);
			panel_map.addToScene(this.scene, 1, 7, panel_map.grids);
			this.scene.panel_map = panel_map;
			this.gameover_obj = new TD.GameOver("panel-gameover", {
				panel: this,
				scene: this.scene,
				step_level: this.step_level,
				is_visiable: false,
				x: 0,
				y: 0,
				width: this.scene.stage.width,
				height: this.scene.stage.height,
				render_level: 9
			});

			this.balloontip = new TD.BalloonTip("panel-balloon-tip", {
				scene: this.scene,
				step_level: this.step_level,
				render_level: 9
			});
			this.balloontip.addToScene(this.scene, 1, 9);

			// make buttons
			// 暂停按钮
			this.btn_pause = new TD.Button("panel-btn-pause", {
				scene: this.scene,
				x: this.x,
				y: this.y + 260 * _TD.retina,
				text: TD._t("button_pause_text"),
				//desc: TD._t("button_pause_desc_0"),
				step_level: this.step_level,
				render_level: this.render_level + 1,
				onClick: function () {
					if (this.scene.state == 1) {
						this.scene.pause();
						this.text = TD._t("button_continue_text");
						this.scene.panel.btn_upgrade.hide();
						this.scene.panel.btn_sell.hide();
						this.scene.panel.btn_restart.show();
						//this.desc = TD._t("button_pause_desc_1");
					} else if (this.scene.state == 2) {
						this.scene.start();
						this.text = TD._t("button_pause_text");
						this.scene.panel.btn_restart.hide();
						if (this.scene.map.selected_building) {
							this.scene.panel.btn_upgrade.show();
							this.scene.panel.btn_sell.show();
						}
						//this.desc = TD._t("button_pause_desc_0");
					}
				}
			});
			// 重新开始按钮
			this.btn_restart = new TD.Button("panel-btn-restart", {
				scene: this.scene,
				x: this.x,
				y: this.y + 300 * _TD.retina,
				is_visiable: false,
				text: TD._t("button_restart_text"),
				step_level: this.step_level,
				render_level: this.render_level + 1,
				onClick: function () {
					setTimeout(function () {
						TD.stage.clear();
						TD.is_paused = true;
						TD.start();
						TD.mouseHand(false);
					}, 0);
				}
			});
			// 建筑升级按钮
			this.btn_upgrade = new TD.Button("panel-btn-upgrade", {
				scene: this.scene,
				x: this.x,
				y: this.y + 300 * _TD.retina,
				is_visiable: false,
				text: TD._t("button_upgrade_text"),
				step_level: this.step_level,
				render_level: this.render_level + 1,
				onClick: function () {
					this.scene.map.selected_building.tryToUpgrade(this);
				}
			});
			// 建筑出售按钮
			this.btn_sell = new TD.Button("panel-btn-sell", {
				scene: this.scene,
				x: this.x,
				y: this.y + 340 * _TD.retina,
				is_visiable: false,
				text: TD._t("button_sell_text"),
				step_level: this.step_level,
				render_level: this.render_level + 1,
				onClick: function () {
					this.scene.map.selected_building.tryToSell(this);
				}
			});
		},
		step: function () {
			if (TD.life_recover) {
				this._life_recover = this._life_recover2 = TD.life_recover;
				this._life_recover_wait = this._life_recover_wait2 = TD.exp_fps * 3;
				TD.life_recover = 0;
			}

			if (this._life_recover && (TD.iframe % TD.exp_fps_eighth == 0)) {
				TD.life ++;
				this._life_recover --;
			}

		},
		render: function () {
			// 画状态文字
			var ctx = TD.ctx;

			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillStyle = "#000";
			ctx.font = "normal " + (12 * _TD.retina) + "px 'Courier New'";
			ctx.beginPath();
			ctx.fillText(TD._t("panel_money_title") + TD.money, this.x, this.y);
			ctx.fillText(TD._t("panel_score_title") + TD.score, this.x, this.y + 20 * _TD.retina);
			ctx.fillText(TD._t("panel_life_title") + TD.life, this.x, this.y + 40 * _TD.retina);
			ctx.fillText(TD._t("panel_building_title") + this.map.buildings.length,
				this.x, this.y + 60 * _TD.retina);
			ctx.fillText(TD._t("panel_monster_title") + this.map.monsters.length,
				this.x, this.y + 80 * _TD.retina);
			ctx.fillText(TD._t("wave_info", [this.scene.wave]), this.x, this.y + 210 * _TD.retina);
			ctx.closePath();

			if (this._life_recover_wait) {
				// 画生命恢复提示
				var a = this._life_recover_wait / this._life_recover_wait2;
				ctx.fillStyle = "rgba(255, 0, 0, " + a + ")";
				ctx.font = "bold " + (12 * _TD.retina) + "px 'Verdana'";
				ctx.beginPath();
				ctx.fillText("+" + this._life_recover2, this.x + 60 * _TD.retina, this.y + 40 * _TD.retina);
				ctx.closePath();
				this._life_recover_wait --;
			}

			// 在右下角画版本信息
			ctx.textAlign = "right";
			ctx.fillStyle = "#666";
			ctx.font = "normal " + (12 * _TD.retina) + "px 'Courier New'";
			ctx.beginPath();
			ctx.fillText("version: " + TD.version + " | oldj.net", TD.stage.width - TD.padding,
				TD.stage.height - TD.padding * 2);
			ctx.closePath();

			// 在左下角画FPS信息
			ctx.textAlign = "left";
			ctx.fillStyle = "#666";
			ctx.font = "normal " + (12 * _TD.retina) + "px 'Courier New'";
			ctx.beginPath();
			ctx.fillText("FPS: " + TD.fps, TD.padding, TD.stage.height - TD.padding * 2);
			ctx.closePath();
		}
	};

	/**
	 * @param id {String}
	 * @param cfg {Object} 配置对象
	 *		 至少需要包含以下项：
	 *		 {
	 *			 life: 怪物的生命值
	 *			 shield: 怪物的防御值
	 *			 speed: 怪物的速度
	 *		 }
	 */
	TD.Panel = function (id, cfg) {
		var panel = new TD.Element(id, cfg);
		TD.lang.mix(panel, panel_obj);
		panel._init(cfg);

		return panel;
	};

	// balloon tip对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var balloontip_obj = {
		_init: function (cfg) {
			cfg = cfg || {};
			this.scene = cfg.scene;
		},
		caculatePos: function () {
			var el = this.el;

			this.x = el.cx + 0.5;
			this.y = el.cy + 0.5;

			if (this.x + this.width > this.scene.stage.width - TD.padding) {
				this.x = this.x - this.width;
			}

			this.px = this.x + 5 * _TD.retina;
			this.py = this.y + 4 * _TD.retina;
		},
		msg: function (txt, el) {
			this.text = txt;
			var ctx = TD.ctx;
			ctx.font = "normal " + (12 * _TD.retina) + "px 'Courier New'";
			this.width = Math.max(
				ctx.measureText(txt).width + 10 * _TD.retina,
				TD.lang.strLen2(txt) * 6 + 10 * _TD.retina
				);
			this.height = 20 * _TD.retina;

			if (el && el.cx && el.cy) {
				this.el = el;
				this.caculatePos();

				this.show();
			}
		},
		step: function () {
			if (!this.el || !this.el.is_valid) {
				this.hide();
				return;
			}

			if (this.el.is_monster) {
				// monster 会移动，所以需要重新计算 tip 的位置
				this.caculatePos();
			}
		},
		render: function () {
			if (!this.el) return;
			var ctx = TD.ctx;

			ctx.lineWidth = _TD.retina;
			ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
			ctx.strokeStyle = "rgba(222, 222, 0, 0.9)";
			ctx.beginPath();
			ctx.rect(this.x, this.y, this.width, this.height);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillStyle = "#000";
			ctx.font = "normal " + (12 * _TD.retina) + "px 'Courier New'";
			ctx.beginPath();
			ctx.fillText(this.text, this.px, this.py);
			ctx.closePath();

		}
	};

	/**
	 * @param id {String}
	 * @param cfg {Object} 配置对象
	 *		 至少需要包含以下项：
	 *		 {
	 *			 scene: scene
	 *		 }
	 */
	TD.BalloonTip = function (id, cfg) {
		var balloontip = new TD.Element(id, cfg);
		TD.lang.mix(balloontip, balloontip_obj);
		balloontip._init(cfg);

		return balloontip;
	};

	// button 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var button_obj = {
		_init: function (cfg) {
			cfg = cfg || {};
			this.text = cfg.text;
			this.onClick = cfg.onClick || TD.lang.nullFunc;
			this.x = cfg.x;
			this.y = cfg.y;
			this.width = cfg.width || 80 * _TD.retina;
			this.height = cfg.height || 30 * _TD.retina;
			this.font_x = this.x + 8 * _TD.retina;
			this.font_y = this.y + 9 * _TD.retina;
			this.scene = cfg.scene;
			this.desc = cfg.desc || "";

			this.addToScene(this.scene, this.step_level, this.render_level);
			this.caculatePos();
		},
		onEnter: function () {
			TD.mouseHand(true);
			if (this.desc) {
				this.scene.panel.balloontip.msg(this.desc, this);
			}
		},
		onOut: function () {
			TD.mouseHand(false);
			if (this.scene.panel.balloontip.el == this) {
				this.scene.panel.balloontip.hide();
			}
		},
		render: function () {
			var ctx = TD.ctx;

			ctx.lineWidth = 2 * _TD.retina;
			ctx.fillStyle = this.is_hover ? "#eee" : "#ccc";
			ctx.strokeStyle = "#999";
			ctx.beginPath();
			ctx.rect(this.x, this.y, this.width, this.height);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillStyle = "#000";
			ctx.font = "normal " + (12 * _TD.retina) + "px 'Courier New'";
			ctx.beginPath();
			ctx.fillText(this.text, this.font_x, this.font_y);
			ctx.closePath();
			ctx.fill();
		}
	};

	/**
	 * @param id {String}
	 * @param cfg {Object} 配置对象
	 *		 至少需要包含以下项：
	 *		 {
	 *			 x:
	 *			 y:
	 *			 text:
	 *			 onClick: function
	 *			 sence:
	 *		 }
	 */
	TD.Button = function (id, cfg) {
		cfg.on_events = ["enter", "out", "click"];
		var button = new TD.Element(id, cfg);
		TD.lang.mix(button, button_obj);
		button._init(cfg);

		return button;
	};


	// gameover 对象的属性、方法。注意属性中不要有数组、对象等
	// 引用属性，否则多个实例的相关属性会发生冲突
	var gameover_obj = {
		_init: function (cfg) {
			this.panel = cfg.panel;
			this.scene = cfg.scene;
			this._score_submitted = false;  // 添加标志，确保只提交一次成绩

			this.addToScene(this.scene, 1, 9);
		},
		render: function () {

			this.panel.btn_pause.hide();
			this.panel.btn_upgrade.hide();
			this.panel.btn_sell.hide();
			this.panel.btn_restart.show();

			var ctx = TD.ctx;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = "#ccc";
			ctx.font = "bold 62px 'Verdana'";
			ctx.beginPath();
			ctx.fillText("GAME OVER", this.width / 2, this.height / 2);
			ctx.closePath();

			// 尝试将成绩通过 postMessage 通知父窗口（若被嵌入在 iframe 中）
			// 仅在第一次渲染时发送，防止重复提交
			if (!this._score_submitted) {
				this._score_submitted = true;
				try {
					var timeSeconds = 0;
					if (typeof TD.startedAt === 'number') {
						timeSeconds = Math.round(((new Date()).getTime() - TD.startedAt) / 1000);
					}
					var wave = (this.scene && typeof this.scene.wave === 'number') ? this.scene.wave : (TD && TD.stage && TD.stage.current_scene ? TD.stage.current_scene.wave : 0);
					var score = typeof TD.score === 'number' ? TD.score : 0;
					if (window && window.parent && window !== window.parent) {
						window.parent.postMessage({
							type: 'tower-defense:complete',
							wave: wave,
							score: score,
							timeSeconds: timeSeconds
						}, '*');
					}
				} catch (e) {
					// 忽略 postMessage 错误
					console.error('Failed to send tower defense score:', e);
				}
			}
			ctx.fillStyle = "#f00";
			ctx.font = "bold 60px 'Verdana'";
			ctx.beginPath();
			ctx.fillText("GAME OVER", this.width / 2, this.height / 2);
			ctx.closePath();

		}
	};

	/**
	 * @param id {String}
	 * @param cfg {Object} 配置对象
	 *		 至少需要包含以下项：
	 *		 {
	 *			 panel:
	 *			 scene:
	 *		 }
	 */
	TD.GameOver = function (id, cfg) {
		var obj = new TD.Element(id, cfg);
		TD.lang.mix(obj, gameover_obj);
		obj._init(cfg);

		return obj;
	};


	/**
	 * 恢复 n 点生命值
	 * @param n
	 */
	TD.recover = function (n) {
//		TD.life += n;
		TD.life_recover = n;
		TD.log("life recover: " + n);
	};

}); // _TD.a.push end

/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * 默认关卡
 */

// _TD.a.push begin
_TD.a.push(function (TD) {

// main stage 初始化方法
	var _stage_main_init = function () {
			var act = new TD.Act(this, "act-1"),
				scene = new TD.Scene(act, "scene-1"),
				cfg = TD.getDefaultStageData("scene_endless");

			this.config = cfg.config;
			TD.life = this.config.life;
			TD.money = this.config.money;
			TD.score = this.config.score;
			TD.difficulty = this.config.difficulty;
			TD.wave_damage = this.config.wave_damage;

			// make map
			var map = new TD.Map("main-map", TD.lang.mix({
				scene: scene,
				is_main_map: true,
				step_level: 1,
				render_level: 2
			}, cfg.map));
			map.addToScene(scene, 1, 2, map.grids);
			scene.map = map;

			// make panel
			scene.panel = new TD.Panel("panel", TD.lang.mix({
				scene: scene,
				main_map: map,
				step_level: 1,
				render_level: 7
			}, cfg.panel));

			this.newWave = cfg.newWave;
			this.map = map;
			this.wait_new_wave = this.config.wait_new_wave;
		},
		_stage_main_step2 = function () {
			//TD.log(this.current_act.current_scene.wave);

			var scene = this.current_act.current_scene,
				wave = scene.wave;
			if ((wave == 0 && !this.map.has_weapon) || scene.state != 1) {
				return;
			}

			if (this.map.monsters.length == 0) {
				if (wave > 0 && this.wait_new_wave == this.config.wait_new_wave - 1) {
					// 一波怪物刚刚走完
					// 奖励生命值

					var wave_reward = 0;
					if (wave % 10 == 0) {
						wave_reward = 10;
					} else if (wave % 5 == 0) {
						wave_reward = 5;
					}
					if (TD.life + wave_reward > 100) {
						wave_reward = 100 - TD.life;
					}
					if (wave_reward > 0) {
						TD.recover(wave_reward);
					}
				}

				if (this.wait_new_wave > 0) {
					this.wait_new_wave--;
					return;
				}

				this.wait_new_wave = this.config.wait_new_wave;
				wave++;
				scene.wave = wave;
				this.newWave({
					map: this.map,
					wave: wave
				});
			}
		};

	TD.getDefaultStageData = function (k) {
		var data = {
			stage_main: {
				width: 640 * _TD.retina, // px
				height: 560 * _TD.retina,
				init: _stage_main_init,
				step2: _stage_main_step2
			},

			scene_endless: {
				// scene 1
				map: {
					grid_x: 16,
					grid_y: 16,
					x: TD.padding,
					y: TD.padding,
					entrance: [0, 0],
					exit: [15, 15],
					grids_cfg: [
						{
							pos: [3, 3],
							//building: "cannon",
							passable_flag: 0
						},
						{
							pos: [7, 15],
							build_flag: 0
						},
						{
							pos: [4, 12],
							building: "wall"
						},
						{
							pos: [4, 13],
							building: "wall"
							//}, {
							//pos: [11, 9],
							//building: "cannon"
							//}, {
							//pos: [5, 2],
							//building: "HMG"
							//}, {
							//pos: [14, 9],
							//building: "LMG"
							//}, {
							//pos: [3, 14],
							//building: "LMG"
						}
					]
				},
				panel: {
					x: TD.padding * 2 + TD.grid_size * 16,
					y: TD.padding,
					map: {
						grid_x: 3,
						grid_y: 3,
						x: 0,
						y: 110 * _TD.retina,
						grids_cfg: [
							{
								pos: [0, 0],
								building: "cannon"
							},
							{
								pos: [1, 0],
								building: "LMG"
							},
							{
								pos: [2, 0],
								building: "HMG"
							},
							{
								pos: [0, 1],
								building: "laser_gun"
							},
							{
								pos: [2, 2],
								building: "wall"
							}
						]
					}
				},
				config: {
					endless: true,
					wait_new_wave: TD.exp_fps * 3, // 经过多少 step 后再开始新的一波
					difficulty: 1.0, // 难度系数
					wave: 0,
					max_wave: -1,
					wave_damage: 0, // 当前一波怪物造成了多少点生命值的伤害
					max_monsters_per_wave: 100, // 每一波最多多少怪物
					money: 500,
					score: 0, // 开局时的积分
					life: 100,
					waves: [ // 这儿只定义了前 10 波怪物，从第 11 波开始自动生成
						[],
						// 第一个参数是没有用的（第 0 波）

						// 第一波
						[
							[1, 0] // 1 个 0 类怪物
						],

						// 第二波
						[
							[1, 0], // 1 个 0 类怪物
							[1, 1] // 1 个 1 类怪物
						],

						// wave 3
						[
							[2, 0], // 2 个 0 类怪物
							[1, 1] // 1 个 1 类怪物
						],

						// wave 4
						[
							[2, 0],
							[1, 1]
						],

						// wave 5
						[
							[3, 0],
							[2, 1]
						],

						// wave 6
						[
							[4, 0],
							[2, 1]
						],

						// wave 7
						[
							[5, 0],
							[3, 1],
							[1, 2]
						],

						// wave 8
						[
							[6, 0],
							[4, 1],
							[1, 2]
						],

						// wave 9
						[
							[7, 0],
							[3, 1],
							[2, 2]
						],

						// wave 10
						[
							[8, 0],
							[4, 1],
							[3, 2]
						]
					]
				},

				/**
				 * 生成第 n 波怪物的方法
				 */
				newWave: function (cfg) {
					cfg = cfg || {};
					var map = cfg.map,
						wave = cfg.wave || 1,
					//difficulty = TD.difficulty || 1.0,
						wave_damage = TD.wave_damage || 0;

					// 自动调整难度系数
					if (wave == 1) {
						//pass
					} else if (wave_damage == 0) {
						// 没有造成伤害
						if (wave < 5) {
							TD.difficulty *= 1.05;
						} else if (TD.difficulty > 30) {
							TD.difficulty *= 1.1;
						} else {
							TD.difficulty *= 1.2;
						}
					} else if (TD.wave_damage >= 50) {
						TD.difficulty *= 0.6;
					} else if (TD.wave_damage >= 30) {
						TD.difficulty *= 0.7;
					} else if (TD.wave_damage >= 20) {
						TD.difficulty *= 0.8;
					} else if (TD.wave_damage >= 10) {
						TD.difficulty *= 0.9;
					} else {
						// 造成了 10 点以内的伤害
						if (wave >= 10)
							TD.difficulty *= 1.05;
					}
					if (TD.difficulty < 1) TD.difficulty = 1;

					TD.log("wave " + wave + ", last wave damage = " + wave_damage + ", difficulty = " + TD.difficulty);

					//map.addMonsters(100, 7);
					//map.addMonsters2([[10, 7], [5, 0], [5, 5]]);
					//
					var wave_data = this.config.waves[wave] ||
							// 自动生成怪物
						TD.makeMonsters(Math.min(
							Math.floor(Math.pow(wave, 1.1)),
							this.config.max_monsters_per_wave
						));
					map.addMonsters2(wave_data);

					TD.wave_damage = 0;
				}
			} // end of scene_endless
		};

		return data[k] || {};
	};

}); // _TD.a.push end


/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * 本文件定义了建筑的参数、属性
 */

// _TD.a.push begin
_TD.a.push(function (TD) {

	/**
	 * 默认的升级规则
	 * @param old_level {Number}
	 * @param old_value {Number}
	 * @return new_value {Number}
	 */
	TD.default_upgrade_rule = function (old_level, old_value) {
		return old_value * 1.2;
	};

	/**
	 * 取得建筑的默认属性
	 * @param building_type {String} 建筑类型
	 */
	TD.getDefaultBuildingAttributes = function (building_type) {

		var building_attributes = {
			// 路障
			"wall": {
				damage: 0,
				range: 0,
				speed: 0,
				bullet_speed: 0,
				life: 100,
				shield: 500,
				cost: 5
			},

			// 炮台
			"cannon": {
				damage: 12,
				range: 4,
				max_range: 8,
				speed: 2,
				bullet_speed: 6,
				life: 100,
				shield: 100,
				cost: 300,
				_upgrade_rule_damage: function (old_level, old_value) {
					return old_value * (old_level <= 10 ? 1.2 : 1.3);
				}
			},

			// 轻机枪
			"LMG": {
				damage: 5,
				range: 5,
				max_range: 10,
				speed: 3,
				bullet_speed: 6,
				life: 100,
				shield: 50,
				cost: 100
			},

			// 重机枪
			"HMG": {
				damage: 30,
				range: 3,
				max_range: 5,
				speed: 3,
				bullet_speed: 5,
				life: 100,
				shield: 200,
				cost: 800,
				_upgrade_rule_damage: function (old_level, old_value) {
					return old_value * 1.3;
				}
			},

			// 激光枪
			"laser_gun": {
				damage: 25,
				range: 6,
				max_range: 10,
				speed: 20,
//				bullet_speed: 10, // laser_gun 的 bullet_speed 属性没有用
				life: 100,
				shield: 100,
				cost: 2000
			}
		};

		return building_attributes[building_type] || {};
	};

}); // _TD.a.push end
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * 本文件定义了怪物默认属性及渲染方法
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	/**
	 * 默认的怪物渲染方法
	 */
	function defaultMonsterRender() {
		if (!this.is_valid || !this.grid) return;
		var ctx = TD.ctx;

		// 画一个圆代表怪物
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1;
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		// 画怪物的生命值
		if (TD.show_monster_life) {
			var s = Math.floor(TD.grid_size / 4),
				l = s * 2 - 2 * _TD.retina;
			ctx.fillStyle = "#000";
			ctx.beginPath();
			ctx.fillRect(this.cx - s, this.cy - this.r - 6, s * 2, 4 * _TD.retina);
			ctx.closePath();
			ctx.fillStyle = "#f00";
			ctx.beginPath();
			ctx.fillRect(this.cx - s + _TD.retina, this.cy - this.r - (6 - _TD.retina), this.life * l / this.life0, 2 * _TD.retina);
			ctx.closePath();
		}
	}

	/**
	 * 取得怪物的默认属性
	 * @param [monster_idx] {Number} 怪物的类型
	 * @return attributes {Object}
	 */
	TD.getDefaultMonsterAttributes = function (monster_idx) {

		var monster_attributes = [
			{
				// idx: 0
				name: "monster 1",
				desc: "最弱小的怪物",
				speed: 3,
				max_speed: 10,
				life: 50,
				damage: 1, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 0,
				money: 5 // 消灭本怪物后可得多少金钱（可选）
			},
			{
				// idx: 1
				name: "monster 2",
				desc: "稍强一些的小怪",
				speed: 6,
				max_speed: 20,
				life: 50,
				damage: 2, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 1
			},
			{
				// idx: 2
				name: "monster speed",
				desc: "速度较快的小怪",
				speed: 12,
				max_speed: 30,
				life: 50,
				damage: 3, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 1
			},
			{
				// idx: 3
				name: "monster life",
				desc: "生命值很强的小怪",
				speed: 5,
				max_speed: 10,
				life: 500,
				damage: 3, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 1
			},
			{
				// idx: 4
				name: "monster shield",
				desc: "防御很强的小怪",
				speed: 5,
				max_speed: 10,
				life: 50,
				damage: 3, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 20
			},
			{
				// idx: 5
				name: "monster damage",
				desc: "伤害值很大的小怪",
				speed: 7,
				max_speed: 14,
				life: 50,
				damage: 10, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 2
			},
			{
				// idx: 6
				name: "monster speed-life",
				desc: "速度、生命都较高的怪物",
				speed: 15,
				max_speed: 30,
				life: 100,
				damage: 3, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 3
			},
			{
				// idx: 7
				name: "monster speed-2",
				desc: "速度很快的怪物",
				speed: 30,
				max_speed: 40,
				life: 30,
				damage: 4, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 1
			},
			{
				// idx: 8
				name: "monster shield-life",
				desc: "防御很强、生命值很高的怪物",
				speed: 3,
				max_speed: 10,
				life: 300,
				damage: 5, // 到达终点后会带来多少点伤害（1 ~ 10）
				shield: 15
			}
		];

		if (typeof monster_idx == "undefined") {
			// 如果只传了一个参数，则只返回共定义了多少种怪物（供 td.js 中使用）
			return monster_attributes.length;
		}

		var attr = monster_attributes[monster_idx] || monster_attributes[0],
			attr2 = {};

		TD.lang.mix(attr2, attr);
		if (!attr2.render) {
			// 如果没有指定当前怪物的渲染方法
			attr2.render = defaultMonsterRender
		}

		return attr2;
	};


	/**
	 * 生成一个怪物列表，
	 * 包含 n 个怪物
	 * 怪物类型在 range 中指定，如未指定，则为随机
	 */
	TD.makeMonsters = function (n, range) {
		var a = [], count = 0, i, c, d, r, l = TD.monster_type_count;
		if (!range) {
			range = [];
			for (i = 0; i < l; i++) {
				range.push(i);
			}
		}

		while (count < n) {
			d = n - count;
			c = Math.min(
				Math.floor(Math.random() * d) + 1,
				3 // 同一类型的怪物一次最多出现 3 个，防止某一波中怪出大量高防御或高速度的怪
			);
			r = Math.floor(Math.random() * l);
			a.push([c, range[r]]);
			count += c;
		}

		return a;
	};


}); // _TD.a.push end
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */

// _TD.a.push begin
_TD.a.push(function (TD) {

	function lineTo2(ctx, x0, y0, x1, y1, len) {
		var x2, y2, a, b, p, xt,
			a2, b2, c2;

		if (x0 == x1) {
			x2 = x0;
			y2 = y1 > y0 ? y0 + len : y0 - len;
		} else if (y0 == y1) {
			y2 = y0;
			x2 = x1 > x0 ? x0 + len : x0 - len;
		} else {
			// 解一元二次方程
			a = (y0 - y1) / (x0 - x1);
			b = y0 - x0 * a;
			a2 = a * a + 1;
			b2 = 2 * (a * (b - y0) - x0);
			c2 = Math.pow(b - y0, 2) + x0 * x0 - Math.pow(len, 2);
			p = Math.pow(b2, 2) - 4 * a2 * c2;
			if (p < 0) {
//				TD.log("ERROR: [a, b, len] = [" + ([a, b, len]).join(", ") + "]");
				return [0, 0];
			}
			p = Math.sqrt(p);
			xt = (-b2 + p) / (2 * a2);
			if ((x1 - x0 > 0 && xt - x0 > 0) ||
				(x1 - x0 < 0 && xt - x0 < 0)) {
				x2 = xt;
				y2 = a * x2 + b;
			} else {
				x2 = (-b2 - p) / (2 * a2);
				y2 = a * x2 + b;
			}
		}

		ctx.lineCap = "round";
		ctx.moveTo(x0, y0);
		ctx.lineTo(x2, y2);

		return [x2, y2];
	}

	var renderFunctions = {
		"cannon": function (b, ctx, map, gs, gs2) {
			var target_position = b.getTargetPosition();

			ctx.fillStyle = "#393";
			ctx.strokeStyle = "#000";
			ctx.beginPath();
			ctx.lineWidth = _TD.retina;
			ctx.arc(b.cx, b.cy, gs2 - 5, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.lineWidth = 3 * _TD.retina;
			ctx.beginPath();
			ctx.moveTo(b.cx, b.cy);
			b.muzzle = lineTo2(ctx, b.cx, b.cy, target_position[0], target_position[1], gs2);
			ctx.closePath();
//			ctx.fill();
			ctx.stroke();

			ctx.lineWidth = _TD.retina;
			ctx.fillStyle = "#060";
			ctx.beginPath();
			ctx.arc(b.cx, b.cy, 7 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#cec";
			ctx.beginPath();
			ctx.arc(b.cx + 2, b.cy - 2, 3 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();

		},
		"LMG": function (b, ctx, map, gs, gs2) {
			var target_position = b.getTargetPosition();

			ctx.fillStyle = "#36f";
			ctx.strokeStyle = "#000";
			ctx.beginPath();
			ctx.lineWidth = _TD.retina;
			ctx.arc(b.cx, b.cy, 7 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.lineWidth = 2 * _TD.retina;
			ctx.beginPath();
			ctx.moveTo(b.cx, b.cy);
			b.muzzle = lineTo2(ctx, b.cx, b.cy, target_position[0], target_position[1], gs2);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.lineWidth = _TD.retina;
			ctx.fillStyle = "#66c";
			ctx.beginPath();
			ctx.arc(b.cx, b.cy, 5 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#ccf";
			ctx.beginPath();
			ctx.arc(b.cx + 1, b.cy - 1, 2 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();

		},
		"HMG": function (b, ctx, map, gs, gs2) {
			var target_position = b.getTargetPosition();

			ctx.fillStyle = "#933";
			ctx.strokeStyle = "#000";
			ctx.beginPath();
			ctx.lineWidth = _TD.retina;
			ctx.arc(b.cx, b.cy, gs2 - 2, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.lineWidth = 5 * _TD.retina;
			ctx.beginPath();
			ctx.moveTo(b.cx, b.cy);
			b.muzzle = lineTo2(ctx, b.cx, b.cy, target_position[0], target_position[1], gs2);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.lineWidth = _TD.retina;
			ctx.fillStyle = "#630";
			ctx.beginPath();
			ctx.arc(b.cx, b.cy, gs2 - 5 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#960";
			ctx.beginPath();
			ctx.arc(b.cx + 1, b.cy - 1, 8 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#fcc";
			ctx.beginPath();
			ctx.arc(b.cx + 3, b.cy - 3, 4 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();

		},
		"wall": function (b, ctx, map, gs, gs2) {
			ctx.lineWidth = _TD.retina;
			ctx.fillStyle = "#666";
			ctx.strokeStyle = "#000";
			ctx.fillRect(b.cx - gs2 + 1, b.cy - gs2 + 1, gs - 1, gs - 1);
			ctx.beginPath();
			ctx.moveTo(b.cx - gs2 + 0.5, b.cy - gs2 + 0.5);
			ctx.lineTo(b.cx - gs2 + 0.5, b.cy + gs2 + 0.5);
			ctx.lineTo(b.cx + gs2 + 0.5, b.cy + gs2 + 0.5);
			ctx.lineTo(b.cx + gs2 + 0.5, b.cy - gs2 + 0.5);
			ctx.lineTo(b.cx - gs2 + 0.5, b.cy - gs2 + 0.5);
			ctx.moveTo(b.cx - gs2 + 0.5, b.cy + gs2 + 0.5);
			ctx.lineTo(b.cx + gs2 + 0.5, b.cy - gs2 + 0.5);
			ctx.moveTo(b.cx - gs2 + 0.5, b.cy - gs2 + 0.5);
			ctx.lineTo(b.cx + gs2 + 0.5, b.cy + gs2 + 0.5);
			ctx.closePath();
			ctx.stroke();
		},
		"laser_gun": function (b, ctx/*, map, gs, gs2*/) {
//			var target_position = b.getTargetPosition();

			ctx.fillStyle = "#f00";
			ctx.strokeStyle = "#000";
			ctx.beginPath();
			ctx.lineWidth = _TD.retina;
//			ctx.arc(b.cx, b.cy, gs2 - 5, 0, Math.PI * 2, true);
			ctx.moveTo(b.cx, b.cy - 10 * _TD.retina);
			ctx.lineTo(b.cx - 8.66 * _TD.retina, b.cy + 5 * _TD.retina);
			ctx.lineTo(b.cx + 8.66 * _TD.retina, b.cy + 5 * _TD.retina);
			ctx.lineTo(b.cx, b.cy - 10 * _TD.retina);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#60f";
			ctx.beginPath();
			ctx.arc(b.cx, b.cy, 7 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#000";
			ctx.beginPath();
			ctx.arc(b.cx, b.cy, 3 * _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#666";
			ctx.beginPath();
			ctx.arc(b.cx + 1, b.cy - 1, _TD.retina, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();

			ctx.lineWidth = 3 * _TD.retina;
			ctx.beginPath();
			ctx.moveTo(b.cx, b.cy);
//			b.muzzle = lineTo2(ctx, b.cx, b.cy, target_position[0], target_position[1], gs2);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	};

	TD.renderBuilding = function (building) {
		var ctx = TD.ctx,
			map = building.map,
			gs = TD.grid_size,
			gs2 = TD.grid_size / 2;

		(renderFunctions[building.type] || renderFunctions["wall"])(
			building, ctx, map, gs, gs2
		);
	}

}); // _TD.a.push end
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	TD._msg_texts = {
		"_cant_build": "不能在这儿修建",
		"_cant_pass": "怪物不能通过这儿",
		"entrance": "起点",
		"exit": "终点",
		"not_enough_money": "金钱不足，需要 $${0}！",
		"wave_info": "第 ${0} 波",
		"panel_money_title": "金钱: ",
		"panel_score_title": "积分: ",
		"panel_life_title": "生命: ",
		"panel_building_title": "建筑: ",
		"panel_monster_title": "怪物: ",
		"building_name_wall": "路障",
		"building_name_cannon": "炮台",
		"building_name_LMG": "轻机枪",
		"building_name_HMG": "重机枪",
		"building_name_laser_gun": "激光炮",
		"building_info": "${0}: 等级 ${1}，攻击 ${2}，速度 ${3}，射程 ${4}，战绩 ${5}",
		"building_info_wall": "${0}",
		"building_intro_wall": "路障 可以阻止怪物通过 ($${0})",
		"building_intro_cannon": "炮台 射程、杀伤力较为平衡 ($${0})",
		"building_intro_LMG": "轻机枪 射程较远，杀伤力一般 ($${0})",
		"building_intro_HMG": "重机枪 快速射击，威力较大，射程一般 ($${0})",
		"building_intro_laser_gun": "激光枪 伤害较大，命中率 100% ($${0})",
		"click_to_build": "左键点击建造 ${0} ($${1})",
		"upgrade": "升级 ${0} 到 ${1} 级，需花费 $${2}。",
		"sell": "出售 ${0}，可获得 $${1}",
		"upgrade_success": "升级成功，${0} 已升级到 ${1} 级！下次升级需要 $${2}。",
		"monster_info": "怪物: 生命 ${0}，防御 ${1}，速度 ${2}，伤害 ${3}",
		"button_upgrade_text": "升级",
		"button_sell_text": "出售",
		"button_start_text": "开始",
		"button_restart_text": "重新开始",
		"button_pause_text": "暂停",
		"button_continue_text": "继续",
		"button_pause_desc_0": "游戏暂停",
		"button_pause_desc_1": "游戏继续",
		"blocked": "不能在这儿修建建筑，起点与终点之间至少要有一条路可到达！",
		"monster_be_blocked": "不能在这儿修建建筑，有怪物被围起来了！",
		"entrance_or_exit_be_blocked": "不能在起点或终点处修建建筑！",
		"_": "ERROR"
	};

	TD._t = TD.translate = function (k, args) {
		args = (typeof args == "object" && args.constructor == Array) ? args : [];
		var msg = this._msg_texts[k] || this._msg_texts["_"],
			i,
			l = args.length;
		for (i = 0; i < l; i++) {
			msg = msg.replace("${" + i + "}", args[i]);
		}

		return msg;
	};


}); // _TD.a.push end
/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	/**
	 * 使用 A* 算法（Dijkstra算法？）寻找从 (x1, y1) 到 (x2, y2) 最短的路线
	 *
	 */
	TD.FindWay = function (w, h, x1, y1, x2, y2, f_passable) {
		this.m = [];
		this.w = w;
		this.h = h;
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
		this.way = [];
		this.len = this.w * this.h;
		this.is_blocked = this.is_arrived = false;
		this.fPassable = typeof f_passable == "function" ? f_passable : function () {
			return true;
		};

		this._init();
	};

	TD.FindWay.prototype = {
		_init: function () {
			if (this.x1 == this.x2 && this.y1 == this.y2) {
				// 如果输入的坐标已经是终点了
				this.is_arrived = true;
				this.way = [
					[this.x1, this.y1]
				];
				return;
			}

			for (var i = 0; i < this.len; i++)
				this.m[i] = -2; // -2 表示未探索过，-1 表示不可到达

			this.x = this.x1;
			this.y = this.y1;
			this.distance = 0;
			this.current = [
				[this.x, this.y]
			]; // 当前一步探索的格子

			this.setVal(this.x, this.y, 0);

			while (this.next()) {
			}
		},
		getVal: function (x, y) {
			var p = y * this.w + x;
			return p < this.len ? this.m[p] : -1;
		},
		setVal: function (x, y, v) {
			var p = y * this.w + x;
			if (p > this.len) return false;
			this.m[p] = v;
		},
		/**
		 * 得到指定坐标的邻居，即从指定坐标出发，1 步之内可以到达的格子
		 * 目前返回的是指定格子的上、下、左、右四个邻格
		 * @param x {Number}
		 * @param y {Number}
		 */
		getNeighborsOf: function (x, y) {
			var nbs = [];
			if (y > 0) nbs.push([x, y - 1]);
			if (x < this.w - 1) nbs.push([x + 1, y]);
			if (y < this.h - 1) nbs.push([x, y + 1]);
			if (x > 0) nbs.push([x - 1, y]);

			return nbs;
		},
		/**
		 * 取得当前一步可到达的 n 个格子的所有邻格
		 */
		getAllNeighbors: function () {
			var nbs = [], nb1, i, c, l = this.current.length;
			for (i = 0; i < l; i++) {
				c = this.current[i];
				nb1 = this.getNeighborsOf(c[0], c[1]);
				nbs = nbs.concat(nb1);
			}
			return nbs;
		},
		/**
		 * 从终点倒推，寻找从起点到终点最近的路径
		 * 此处的实现是，从终点开始，从当前格子的邻格中寻找值最低（且大于 0）的格子，
		 * 直到到达起点。
		 * 这个实现需要反复地寻找邻格，有时邻格中有多个格子的值都为最低，这时就从中
		 * 随机选取一个。还有一种实现方式是在一开始的遍历中，给每一个到达过的格子添加
		 * 一个值，指向它的来时的格子（父格子）。
		 */
		findWay: function () {
			var x = this.x2,
				y = this.y2,
				nb, max_len = this.len,
				nbs_len,
				nbs, i, l, v, min_v = -1,
				closest_nbs;

			while ((x != this.x1 || y != this.y1) && min_v != 0 &&
			this.way.length < max_len) {

				this.way.unshift([x, y]);

				nbs = this.getNeighborsOf(x, y);
				nbs_len = nbs.length;
				closest_nbs = [];

				// 在邻格中寻找最小的 v
				min_v = -1;
				for (i = 0; i < nbs_len; i++) {
					v = this.getVal(nbs[i][0], nbs[i][1]);
					if (v < 0) continue;
					if (min_v < 0 || min_v > v)
						min_v = v;
				}
				// 找出所有 v 最小的邻格
				for (i = 0; i < nbs_len; i++) {
					nb = nbs[i];
					if (min_v == this.getVal(nb[0], nb[1])) {
						closest_nbs.push(nb);
					}
				}

				// 从 v 最小的邻格中随机选取一个作为当前格子
				l = closest_nbs.length;
				i = l > 1 ? Math.floor(Math.random() * l) : 0;
				nb = closest_nbs[i];

				x = nb[0];
				y = nb[1];
			}
		},
		/**
		 * 到达终点
		 */
		arrive: function () {
			this.current = [];
			this.is_arrived = true;

			this.findWay();
		},
		/**
		 * 道路被阻塞
		 */
		blocked: function () {
			this.current = [];
			this.is_blocked = true;
		},
		/**
		 * 下一次迭代
		 * @return {Boolean} 如果返回值为 true ，表示未到达终点，并且道路
		 *      未被阻塞，可以继续迭代；否则表示不必继续迭代
		 */
		next: function () {
			var neighbors = this.getAllNeighbors(), nb,
				l = neighbors.length,
				valid_neighbors = [],
				x, y,
				i, v;

			this.distance++;

			for (i = 0; i < l; i++) {
				nb = neighbors[i];
				x = nb[0];
				y = nb[1];
				if (this.getVal(x, y) != -2) continue; // 当前格子已探索过
				//grid = this.map.getGrid(x, y);
				//if (!grid) continue;

				if (this.fPassable(x, y)) {
					// 可通过

					/**
					 * 从起点到当前格子的耗费
					 * 这儿只是简单地把从起点到当前格子需要走几步作为耗费
					 * 比较复杂的情况下，可能还需要考虑不同的路面耗费也会不同，
					 * 比如沼泽地的耗费比平地要多。不过现在的版本中路况没有这么复杂，
					 * 先不考虑。
					 */
					v = this.distance;

					valid_neighbors.push(nb);
				} else {
					// 不可通过或有建筑挡着
					v = -1;
				}

				this.setVal(x, y, v);

				if (x == this.x2 && y == this.y2) {
					this.arrive();
					return false;
				}
			}

			if (valid_neighbors.length == 0) {
				this.blocked();
				return false
			}
			this.current = valid_neighbors;

			return true;
		}
	};

}); // _TD.a.push end


