import express from 'express';

const router = express.Router();

// 获取访问者IP地址
router.get('/ip', (req, res) => {
  try {
    // 获取X-Forwarded-For头信息（如果通过代理）
    const forwardedIp = req.headers['x-forwarded-for'];
    
    // 如果存在X-Forwarded-For，则使用第一个IP（最接近用户的代理）
    // 否则使用直接连接的IP
    const ip = forwardedIp 
      ? (typeof forwardedIp === 'string' ? forwardedIp.split(',')[0].trim() : forwardedIp[0])
      : req.ip || req.connection.remoteAddress;
    
    res.json({ ip });
  } catch (error) {
    console.error('获取IP地址错误:', error);
    res.status(500).json({ message: '获取IP地址失败' });
  }
});

export default router; 