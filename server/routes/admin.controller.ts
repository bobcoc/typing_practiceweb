import { Request, Response } from 'express';
import { OAuth2Client } from '../models/oauth2';
import { generateRandomString } from '../utils/crypto';

export class AdminController {
  // 创建OAuth2客户端
  async createOAuth2Client(req: Request, res: Response) {
    const { name, redirectUris, scope } = req.body;

    try {
      const clientId = generateRandomString(24);
      const clientSecret = generateRandomString(32);

      const client = new OAuth2Client({
        name,
        clientId,
        clientSecret,
        redirectUris,
        scope: scope.split(' '),
        grants: ['authorization_code']
      });

      await client.save();

      res.json({
        clientId,
        clientSecret,
        name,
        redirectUris,
        scope
      });
    } catch (error) {
      res.status(500).json({ error: 'server_error' });
    }
  }

  // 获取OAuth2客户端列表
  async listOAuth2Clients(req: Request, res: Response) {
    try {
      const clients = await OAuth2Client.find({}, {
        clientSecret: 0
      });
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: 'server_error' });
    }
  }
} 