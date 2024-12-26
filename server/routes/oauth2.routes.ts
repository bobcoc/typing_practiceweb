import { Router } from 'express';
import { OAuth2Controller } from './oauth2.controller';

const router = Router();
const oauth2Controller = new OAuth2Controller();

// OAuth2 路由定义
router.get('/authorize', oauth2Controller.authorize);
router.post('/token', oauth2Controller.token);
router.get('/userinfo', oauth2Controller.userinfo);

export default router; 