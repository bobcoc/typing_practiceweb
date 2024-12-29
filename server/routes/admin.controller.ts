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
      res.status(500).json({ error: 'server_error1' });
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
      res.status(500).json({ error: 'server_error2' });
    }
  }

  // 获取单个OAuth2客户端
  async getOAuth2Client(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const client = await OAuth2Client.findOne({ clientId: id }, {
        clientSecret: 0
      });

      if (!client) {
        return res.status(404).json({ error: 'client_not_found' });
      }

      res.json(client);
    } catch (error) {
      res.status(500).json({ error: 'server_error9' });
    }
  }

  // 更新OAuth2客户端
  async updateOAuth2Client(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, redirectUris, scope } = req.body;

      const client = await OAuth2Client.findOne({ clientId: id });
      if (!client) {
        return res.status(404).json({ error: 'client_not_found' });
      }

      const updateData = {
        name,
        redirectUris,
        scope: scope.split(' ')
      };

      await OAuth2Client.updateOne({ clientId: id }, updateData);
      res.json({ ...updateData, clientId: id });
    } catch (error) {
      res.status(500).json({ error: 'server_error3' });
    }
  }

  // 删除OAuth2客户端
  async deleteOAuth2Client(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await OAuth2Client.deleteOne({ clientId: id });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'client_not_found' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'server_error4' });
    }
  }
} 