// VirtualKeyboard.tsx
import React from 'react';
import './VirtualKeyboard.css';

interface VirtualKeyboardProps {
  activeKey: string | null;
  lastKey: string | null;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ activeKey, lastKey }) => {
  // 定义键盘布局
  const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BKS'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Menu', 'Ctrl']
  ];

  // 定义手指分配
  const fingerMap: { [key: string]: string } = {
    '`': 'L-ring', '1': 'L-ring', '2': 'L-ring', '3': 'L-middle', '4': 'L-index',
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
    'shift': 'L-pinky',
    'rightshift': 'R-pinky',
  };

  // 添加符号映射
  const shiftSymbols: { [key: string]: string } = {
    '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')', '-': '_',
    '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', '\'': '"',
    ',': '<', '.': '>', '/': '?'
  };

  // 扩展特殊键的映射
  const getFingerForKey = (key: string): string => {
    const lowerKey = key.toLowerCase();
    
    const specialKeyMap: { [key: string]: string } = {
      'shift': 'L-pinky',
      'caps': 'L-pinky',
      'tab': 'L-pinky',
      'bks': 'R-ring',
      'enter': 'R-pinky',
      'space': 'R-thumb',
    };

    return specialKeyMap[lowerKey] || fingerMap[lowerKey] || '';
  };

  const isShiftActive = (): boolean => {
    return activeKey === 'leftshift' || activeKey === 'rightshift';
  };

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

  const isFingerActive = (fingerType: string): boolean => {
    if (activeKey !== null) {
      return getFingerForKey(activeKey) === fingerType;
    }
    return lastKey !== null && getFingerForKey(lastKey) === fingerType;
  };

  const getKeyClassName = (key: string): string => {
    const fingerType = getFingerForKey(key.toLowerCase());
    let colorClass = '';
    
    switch (fingerType) {
      case 'L-pinky':
      case 'R-pinky':
        colorClass = 'pink-key';
        break;
      case 'L-ring':
      case 'R-ring':
        colorClass = 'beige-key';
        break;
      case 'L-middle':
      case 'R-middle':
        colorClass = 'green-key';
        break;
      case 'L-index':
      case 'R-index':
        colorClass = 'blue-key';
        break;
      default:
        colorClass = 'default-key';
    }
    
    return colorClass;
  };

  const renderKey = (key: string) => {
    const isSpecial = key.length > 1;
    const hasShiftSymbol = shiftSymbols[key];
    const shifted = isShiftActive();

    if (isSpecial) {
      return <span className="main-char">{key}</span>;
    }

    if (hasShiftSymbol) {
      return (
        <div className="key-content">
          <span className={`upper-char ${shifted ? 'active' : ''}`}>
            {shiftSymbols[key]}
          </span>
          <span className={`lower-char ${!shifted ? 'active' : ''}`}>
            {key}
          </span>
        </div>
      );
    }

    if (key.match(/[a-z]/i)) {
      return <span className="main-char">{shifted ? key.toUpperCase() : key}</span>;
    }

    return <span className="main-char">{key}</span>;
  };

  return (
    <div className="virtual-keyboard">
<div className="hands">
  <div className="hand left-hand">
    <div className="hand-label">左手</div>
    <div className="fingers">
      <div className={`finger pinky ${isFingerActive('L-pinky') ? 'active' : ''}`}>小指</div>
      <div className={`finger ring ${isFingerActive('L-ring') ? 'active' : ''}`}>无名指</div>
      <div className={`finger middle ${isFingerActive('L-middle') ? 'active' : ''}`}>中指</div>
      <div className={`finger index ${isFingerActive('L-index') ? 'active' : ''}`}>食指</div>
      <div className={`finger thumb ${isFingerActive('L-thumb') ? 'active' : ''}`}>拇指</div>
    </div>
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
                  ${getKeyClassName(key)}
                  ${isShiftActive() ? 'shifted' : ''}`}
              >
                {renderKey(key)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualKeyboard;