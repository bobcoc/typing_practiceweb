import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 添加全局错误处理
window.addEventListener('unhandledrejection', (event) => {
  // 阻止默认行为（防止页面刷新）
  event.preventDefault();
  // 记录错误信息
  console.error('Unhandled promise rejection:', {
    error: event.reason,
    message: event.reason?.message,
    stack: event.reason?.stack
  });
});

// 添加全局错误边界
window.addEventListener('error', (event) => {
  // 阻止默认行为
  event.preventDefault();
  // 记录错误信息
  console.error('Global error:', {
    error: event.error,
    message: event.message,
    stack: event.error?.stack
  });
});

// 在开发环境下启用详细的错误报告
if (process.env.NODE_ENV === 'development') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global onerror:', {
      message,
      source,
      lineno,
      colno,
      error
    });
    // 返回 true 表示错误已被处理
    return true;
  };
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);