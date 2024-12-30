import { Router } from 'express';
import { OAuth2Controller } from './oauth2.controller';

const router = Router();
const oauth2Controller = new OAuth2Controller();

// OAuth2 路由定义
router.get('/authorize', oauth2Controller.authorize);
router.post('/token', oauth2Controller.token);
router.get('/userinfo', oauth2Controller.userinfo);
router.get('/moodle-sesskey', (req, res, next) => {
  console.log('OAuth2 route: /moodle-sesskey accessed');
  oauth2Controller.getMoodleSesskey(req, res);
});

export default router; 