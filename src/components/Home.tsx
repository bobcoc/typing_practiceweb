import React from 'react';
import LandingPage from './LandingPage';

/**
 * Home组件
 * 
 * 这个组件实际上只是LandingPage组件的包装器
 * 为了保持代码一致性，我们将继续使用LandingPage作为首页内容
 */
const Home: React.FC = () => {
  return <LandingPage />;
};

export default Home; 