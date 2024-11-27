// server/routes/system.ts
import express from 'express';
const router = express.Router();

router.get('/server-time', (req, res) => {
  res.json({
    serverTime: Date.now()
  });
});

export default router;