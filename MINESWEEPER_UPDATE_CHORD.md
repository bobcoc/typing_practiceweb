# 扫雷游戏更新 - 弦操作功能

## 🎮 新增功能：双键同时按下自动揭开

### 功能说明

添加了经典扫雷游戏中的**弦操作(Chording)**功能：

- **操作方法**: 在已揭开的数字格子上同时按下左键和右键
- **触发条件**: 周围插旗数量等于该格子显示的数字
- **效果**: 自动揭开周围所有未插旗的格子
- **安全检查**: 如果有错误插旗导致点到地雷，游戏会结束

### 使用场景示例

假设有一个格子显示数字"1"，周围已经插了1个旗：

```
[ ] [ ] [ ]
[ ] [1] [ ]
[ ] [🚩] [ ]
```

在数字"1"上同时按下左右键，会自动揭开周围其他7个格子（除了插旗的格子）。

### 优势

1. **提高效率**: 减少重复点击，加快游戏速度
2. **经典体验**: 符合Windows经典扫雷的操作习惯
3. **安全提示**: 如果插旗错误会立即发现

### 技术实现

#### 核心逻辑

1. **状态追踪**: 使用 `isMouseDown` 状态追踪左右键按下状态
2. **事件处理**: 
   - `handleMouseDown`: 记录按键状态
   - `handleMouseUp`: 检查双键状态并执行相应操作
3. **弦操作函数**: `chordReveal` 实现自动揭开逻辑

#### 代码片段

```typescript
// 双键同时按下自动揭开功能（弦操作）
const chordReveal = useCallback((row: number, col: number) => {
  // 只有已揭开且有数字的格子才能进行弦操作
  if (!cell.isRevealed || cell.neighborMines === 0) return;
  
  // 统计周围插旗数量
  let flagCount = 0;
  // ... 计算flagCount
  
  // 如果插旗数量等于地雷数量，自动揭开周围未插旗的格子
  if (flagCount === cell.neighborMines) {
    // ... 揭开周围格子
  }
}, [board, gameStatus, firstClick, config]);
```

#### 事件绑定

```typescript
<Box
  onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
  onMouseUp={(e) => handleMouseUp(rowIndex, colIndex, e)}
  onContextMenu={(e) => {
    e.preventDefault();
    toggleFlag(rowIndex, colIndex, e);
  }}
  style={getCellStyle(cell)}
>
```

### 修改的文件

- [src/components/MinesweeperGame.tsx](file:///Users/liushuming/projects/LibreChat/old%20openid/typing_practiceweb/src/components/MinesweeperGame.tsx)
  - 新增 `isMouseDown` 状态
  - 新增 `chordReveal` 函数
  - 新增 `handleMouseDown` 函数
  - 新增 `handleMouseUp` 函数
  - 新增全局鼠标释放监听
  - 更新格子事件绑定
  - 更新游戏说明

### 使用提示

1. **确保准确插旗**: 弦操作依赖于正确的插旗位置
2. **观察数字**: 只有插旗数量等于数字时才会触发
3. **快速操作**: 熟练后可以大幅提升游戏速度

### 操作演示

**场景1: 安全使用**
```
已揭开区域：
[ ] [1] [1]
[🚩] [1] [ ]
[ ] [1] [ ]
```
在任意数字"1"上双键操作，会安全揭开周围格子。

**场景2: 错误插旗**
```
已揭开区域：
[ ] [1] [ ]
[🚩] [1] [ ]  <- 🚩位置错误（不是地雷）
[ ] [ ] [💣] <- 实际地雷在这里
```
在数字"1"上双键操作，会触发地雷，游戏结束。

### 注意事项

1. 弦操作只在已揭开的数字格子上生效
2. 数字为0的格子不能进行弦操作
3. 未揭开的格子无法进行弦操作
4. 必须同时按下左右键才能触发

### 兼容性

- ✅ 支持所有现代浏览器
- ✅ 不影响原有的左键揭开、右键插旗功能
- ✅ 与难度选择、计时等功能完全兼容

### 性能优化

- 使用 `useCallback` 优化函数创建
- 高效的格子遍历算法
- 避免不必要的状态更新

---

**更新日期**: 2025-10-30  
**版本**: v1.1  
**功能**: 双键弦操作支持
