import React from 'react';

const Footer = () => (
    <footer style={{ textAlign: 'center', marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderTop: '1px solid #e9ecef' }}>
    <p style={{ margin: '10px 0', fontSize: '14px', color: '#6c757d' }}>
      本项目开源免费，
      <a href="https://github.com/bobcoc/typing_practiceweb" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: '#007bff', textDecoration: 'none' }}>
        开源项目网址
      </a>
      <span style={{ margin: '0 8px' }}> | </span>
      感谢
      <a href="https://www.21cnjy.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: '#007bff', textDecoration: 'none' }}>
        深圳市二一教育科技有限责任公司
      </a> 
      提供赞助。
    </p>
    <p style={{ margin: '10px 0', fontSize: '14px', color: '#6c757d' }}>二一教育是深圳的一家高科技公司，旗下有众多教学资源网站，开发了多条教育信息化产品线以及学校教育人工智能辅助解决方案等多种高科技产品。
    </p>
    <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
      联系邮箱: 
      <a href="mailto:smshine@qq.com" style={{ color: '#007bff', textDecoration: 'none' }}>
        smshine@qq.com
      </a>
    </p>
  </footer>
);

export default Footer;