import React from 'react';
import './VirtualKeyboard.css';

interface VirtualKeyboardProps {
  activeKey: string | null;
  lastKey: string | null;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ activeKey, lastKey }) => {
  // 定义键盘布局
  const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
    ['LeftShift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'RightShift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Menu', 'Ctrl']
  ];

  // 定义手指分配
  const fingerMap: { [key: string]: string } = {
    '`': 'L-ring', '1': 'L-pinky', '2': 'L-ring', '3': 'L-middle', '4': 'L-index',
    '5': 'L-index', '6': 'R-index', '7': 'R-index', '8': 'R-middle', '9': 'R-ring',
    '0': 'R-ring', '-': 'R-ring', '=': 'R-ring',
    'q': 'L-pinky', 'w': 'L-ring', 'e': 'L-middle', 'r': 'L-index',
    't': 'L-index', 'y': 'R-index', 'u': 'R-index', 'i': 'R-middle',
    'o': 'R-ring', 'p': 'R-pinky', '[': 'R-pinky', ']': 'R-pinky', '\\': 'R-pinky',
    'a': 'L-pinky', 's': 'L-ring', 'd': 'L-middle', 'f': 'L-index',
    'g': 'L-index', 'h': 'R-index', 'j': 'R-index', 'k': 'R-middle',
    'l': 'R-ring', ';': 'R-pinky', '\'': 'R-pinky',
    'z': 'L-pinky', 'x': 'L-ring', 'c': 'L-middle', 'v': 'L-index',
    'b': 'L-index', 'n': 'R-index', 'm': 'R-index', ',': 'R-middle',
    '.': 'R-ring', '/': 'R-pinky',
    'leftshift': 'L-pinky',
    'rightshift': 'R-pinky',
  };

  // 添加符号映射
  const shiftSymbols: { [key: string]: string } = {
    '`': '~',
    '1': '!',
    '2': '@',
    '3': '#',
    '4': '$',
    '5': '%',
    '6': '^',
    '7': '&',
    '8': '*',
    '9': '(',
    '0': ')',
    '-': '_',
    '=': '+',
    '[': '{',
    ']': '}',
    '\\': '|',
    ';': ':',
    '\'': '"',
    ',': '<',
    '.': '>',
    '/' : '?'
  };

  // 扩展特殊键的映射
  const getFingerForKey = (key: string): string => {
    const lowerKey = key.toLowerCase();
    
    // 特殊键映射
    const specialKeyMap: { [key: string]: string } = {
      'shift': 'L-pinky',
      'caps': 'L-pinky',
      'tab': 'L-pinky',
      'backspace': 'R-ring',
      'enter': 'R-pinky',
      'space': 'R-thumb',
    };

    return specialKeyMap[lowerKey] || fingerMap[lowerKey] || '';
  };

  // 修改判断 Shift 是否按下的逻辑
  const isShiftActive = (): boolean => {
    // 只有当 Shift 键实际被按下时才返回 true
    return activeKey === 'leftshift' || activeKey === 'rightshift';
  };

  // 修改 isKeyActive 函数
  const isKeyActive = (key: string): boolean => {
    const lowerKey = key.toLowerCase();
    if (activeKey !== null) {
      if (key === 'LeftShift') return activeKey === 'leftshift';
      if (key === 'RightShift') return activeKey === 'rightshift';
      return lowerKey === activeKey.toLowerCase();
    }
    if (key === 'LeftShift') return lastKey === 'leftshift';
    if (key === 'RightShift') return lastKey === 'rightshift';
    return lowerKey === lastKey?.toLowerCase();
  };

  // 修改手指激活状态的判断逻辑
  const isFingerActive = (fingerType: string): boolean => {
    if (activeKey !== null) {
      return getFingerForKey(activeKey) === fingerType;
    }
    return lastKey !== null && getFingerForKey(lastKey) === fingerType;
  };

  // 修改 getKeyDisplay 函数
  const getKeyDisplay = (key: string): string => {
    // 只在 Shift 实际按下时显示shifted状态
    const shouldShowShifted = isShiftActive();

    switch (key) {
      case 'LeftShift':
      case 'RightShift':
        return 'Shift';
      default:
        if (shouldShowShifted) {
          // 处理数字和符号
          if (shiftSymbols[key]) {
            return shiftSymbols[key];
          }
          // 处理字母
          if (key.length === 1 && key.match(/[a-z]/i)) {
            return key.toUpperCase();
          }
        }
        return key;
    }
  };

  return (
    <div className="virtual-keyboard">
      <div className="hands">
        <div className="hand left-hand">
          <div className="fingers">
            <div className={`finger pinky ${isFingerActive('L-pinky') ? 'active' : ''}`}>小指</div>
            <div className={`finger ring ${isFingerActive('L-ring') ? 'active' : ''}`}>无名指</div>
            <div className={`finger middle ${isFingerActive('L-middle') ? 'active' : ''}`}>中指</div>
            <div className={`finger index ${isFingerActive('L-index') ? 'active' : ''}`}>食指</div>
            <div className={`finger thumb ${isFingerActive('L-thumb') ? 'active' : ''}`}>拇指</div>
          </div>
          <div className="hand-label">左手</div>
        </div>
        <div className="hand right-hand">
          <div className="fingers">
            <div className={`finger thumb ${isFingerActive('R-thumb') ? 'active' : ''}`}>拇指</div>
            <div className={`finger index ${isFingerActive('R-index') ? 'active' : ''}`}>食指</div>
            <div className={`finger middle ${isFingerActive('R-middle') ? 'active' : ''}`}>中指</div>
            <div className={`finger ring ${isFingerActive('R-ring') ? 'active' : ''}`}>无名指</div>
            <div className={`finger pinky ${isFingerActive('R-pinky') ? 'active' : ''}`}>小指</div>
          </div>
          <div className="hand-label">右手</div>
        </div>
      </div>
      <div className="keyboard">
        {keyboardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((key, keyIndex) => (
              <div
                key={keyIndex}
                className={`key 
                  ${isKeyActive(key) ? 'active' : ''} 
                  ${key.length > 1 ? 'special-key' : ''} 
                  ${getFingerForKey(key.toLowerCase())}
                  ${isShiftActive() ? 'shifted' : ''}`}
              >
                {getKeyDisplay(key)}
                {shiftSymbols[key] && (
                  <span className="original-char">{key}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualKeyboard; 