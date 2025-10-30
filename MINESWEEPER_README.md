# 扫雷游戏功能说明

## 功能概述

已成功添加经典Windows扫雷游戏到项目中,支持三种难度级别,并提供排行榜功能。

## 新增文件

### 后端文件
1. **`server/models/MinesweeperRecord.ts`** - 扫雷游戏记录数据模型
2. **`server/routes/minesweeper.ts`** - 扫雷游戏API路由

### 前端文件
1. **`src/components/MinesweeperGame.tsx`** - 扫雷游戏主界面组件
2. **`src/components/MinesweeperLeaderboard.tsx`** - 扫雷排行榜组件

### 修改的文件
1. **`server/server.ts`** - 添加扫雷路由注册
2. **`src/App.tsx`** - 添加扫雷游戏路由
3. **`src/components/Navbar.tsx`** - 添加扫雷游戏菜单

## 功能特性

### 1. 三种难度级别
- **初级 (9×9, 10雷)**: 适合新手玩家
- **中级 (16×16, 40雷)**: 适合有经验的玩家
- **高级 (16×30, 99雷)**: 适合专家级玩家

### 2. 游戏功能
- ✅ 经典扫雷游戏规则
- ✅ 左键点击揭开格子,右键点击插旗
- ✅ 首次点击保护(首次点击位置及周围不会有雷)
- ✅ 自动展开无雷区域
- ✅ 计时功能
- ✅ 剩余旗帜数量显示
- ✅ 游戏胜利/失败判定
- ✅ 个人最佳成绩显示

### 3. 排行榜功能
- ✅ 按难度分类排行
- ✅ 显示最佳时间、总游戏次数、获胜次数、胜率
- ✅ 前三名特殊标记(🥇🥈🥉)
- ✅ 分页显示
- ✅ 只统计获胜记录
- ✅ 实时更新

### 4. 数据统计
- ✅ 自动保存游戏记录(需登录)
- ✅ 个人最佳成绩追踪
- ✅ 游戏统计数据

## 访问路径

### 游戏页面
- **路径**: `/minesweeper`
- **说明**: 扫雷游戏主界面,可选择难度开始游戏

### 排行榜页面
- **路径**: `/minesweeper/leaderboard`
- **说明**: 查看各难度级别的排行榜

## 导航菜单

在顶部导航栏中新增"扫雷游戏"菜单,包含两个子菜单:
- 开始游戏
- 排行榜

## API端点

### 后端API

#### 1. 提交游戏记录
- **URL**: `POST /api/minesweeper/record`
- **需要登录**: 是
- **参数**:
  ```json
  {
    "difficulty": "beginner|intermediate|expert",
    "timeSeconds": 123,
    "won": true
  }
  ```

#### 2. 获取排行榜
- **URL**: `GET /api/minesweeper/leaderboard/:difficulty?page=1&limit=10`
- **需要登录**: 否
- **示例**: `/api/minesweeper/leaderboard/beginner?page=1&limit=10`

#### 3. 获取个人最佳成绩
- **URL**: `GET /api/minesweeper/personal-best/:difficulty`
- **需要登录**: 是
- **示例**: `/api/minesweeper/personal-best/beginner`

#### 4. 获取游戏统计
- **URL**: `GET /api/minesweeper/stats`
- **需要登录**: 是

## 数据库集合

### MinesweeperRecord
存储所有游戏记录,字段包括:
- `userId`: 用户ID
- `username`: 用户名
- `fullname`: 姓名
- `difficulty`: 难度级别
- `timeSeconds`: 完成时间(秒)
- `won`: 是否获胜
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 使用说明

### 游戏规则
1. 点击格子揭开,数字表示周围8个格子中地雷的数量
2. 右键点击插旗标记可能的地雷位置
3. 揭开所有非地雷格子即可获胜
4. 点到地雷则游戏失败

### 登录与记录
- 游客可以玩游戏,但不会保存记录
- 登录用户的游戏记录会自动保存
- 只有获胜的记录才会计入排行榜
- 排行榜按最佳完成时间排序

### 个人最佳
- 登录用户可以在游戏界面看到个人最佳成绩
- 打破个人记录时会有特殊提示

## 技术实现

### 前端技术
- React + TypeScript
- Material-UI组件库
- 状态管理: useState, useEffect, useCallback
- 游戏逻辑: 纯客户端实现

### 后端技术
- Express路由
- MongoDB数据存储
- Mongoose聚合查询
- JWT认证(可选,支持游客模式)

### 游戏算法
- 随机地雷生成(避开首次点击区域)
- 深度优先搜索展开无雷区域
- 周围地雷数量计算

## 性能优化

1. **索引优化**: 在`userId`和`difficulty`字段上创建索引
2. **聚合查询**: 使用MongoDB聚合管道高效计算排行榜
3. **分页加载**: 排行榜支持分页,默认每页10条记录
4. **客户端渲染**: 游戏逻辑完全在客户端运行,不占用服务器资源

## 未来扩展建议

1. 添加游戏暂停/继续功能
2. 支持键盘快捷键操作
3. 添加音效和动画效果
4. 支持自定义皮肤主题
5. 添加每日挑战模式
6. 支持好友对战功能
7. 添加成就系统

## 注意事项

1. 游戏记录只在登录状态下保存
2. 排行榜只统计获胜的记录
3. 首次点击位置及周围不会有地雷(防止首次点击即失败)
4. 右键菜单被劫持用于插旗,如需访问浏览器右键菜单,请在游戏区域外点击
