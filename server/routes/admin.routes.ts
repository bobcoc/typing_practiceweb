import { Router } from 'express';
import { AdminController } from './admin.controller';

const router = Router();
const adminController = new AdminController();

// OAuth2客户端管理路由
router.post('/oauth2/clients', adminController.createOAuth2Client);
router.get('/oauth2/clients', adminController.listOAuth2Clients);
router.get('/oauth2/clients/:id', adminController.getOAuth2Client);
router.put('/oauth2/clients/:id', adminController.updateOAuth2Client);
router.delete('/oauth2/clients/:id', adminController.deleteOAuth2Client);

export default router;