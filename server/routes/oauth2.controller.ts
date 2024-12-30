import { Request, Response } from 'express';
import { OAuth2Client, OAuth2AuthorizationCode, OAuth2AccessToken } from '../models/oauth2';
import { User } from '../models/User';
import { generateRandomString } from '../utils/crypto';
import { Session } from 'express-session';

// 添加 session 接口声明
interface CustomSession extends Session {
  userId?: string;
  isAuthenticated?: boolean;
}

// 扩展 Request 类型
interface CustomRequest extends Request {
  session: CustomSession;
}

export class OAuth2Controller {
  // 授权端点
  async authorize(req: CustomRequest, res: Response) {
    try {
      const { client_id, redirect_uri, scope, response_type, state } = req.query;
      const user = req.user;

      // 验证客户端
      const client = await OAuth2Client.findOne({ clientId: client_id });
      if (!client) {
        return res.status(400).json({ error: 'invalid_client' });
      }

      // 查找现有的用户关联
      const existingLink = await OAuth2Client.findOne({
        clientId: client_id,
        'linkedUsers.email': user!.email
      });

      console.log('OAuth2 authorize check:', {
        clientId: client_id,
        userEmail: user!.email,
        existingLink: !!existingLink
      });

      // 如果没有关联，创建新的关联
      if (!existingLink) {
        await OAuth2Client.updateOne(
          { clientId: client_id },
          {
            $addToSet: {
              linkedUsers: {
                userId: user!._id,
                username: user!.username,
                email: user!.email
              }
            }
          }
        );
      }

      // 生成授权码
      const code = generateRandomString(32);
      const authCode = new OAuth2AuthorizationCode({
        code,
        clientId: client_id,
        userId: user!._id,
        redirectUri: redirect_uri,
        scope: (typeof scope === 'string' ? scope.split(' ') : []) || [],
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });

      await authCode.save();
      console.log('Generated auth code:', { code, userId: user!._id });

      // 重定向回 Moodle
      const redirectUrl = new URL(redirect_uri as string);
      redirectUrl.searchParams.set('code', code);
      redirectUrl.searchParams.set('state', state?.toString() || '');

      console.log('Redirecting to:', redirectUrl.toString());
      return res.redirect(redirectUrl.toString());

    } catch (error: any) {
      console.error('OAuth2 authorize error:', error);
      throw error;
    }
  }

  // 令牌端点
  async token(req: Request, res: Response) {
    try {
      console.log('=== OAuth2 Token Debug Info ===');
      console.log('Token request body:', req.body);

      const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

      // 验证客户端
      const client = await OAuth2Client.findOne({ 
        clientId: client_id
      });

      if (!client) {
        console.log('Client not found:', client_id);
        return res.status(401).json({ error: 'invalid_client' });
      }

      if (grant_type === 'authorization_code') {
        // 查找授权码
        const authCode = await OAuth2AuthorizationCode.findOne({ code });
        console.log('Found auth code:', authCode);

        if (!authCode || authCode.expiresAt < new Date()) {
          console.log('Invalid or expired auth code');
          return res.status(400).json({ error: 'invalid_grant' });
        }

        // 生成访问令牌
        const accessToken = generateRandomString(32);
        const token = new OAuth2AccessToken({
          accessToken,
          clientId: client_id,
          userId: authCode.userId,
          scope: authCode.scope,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });

        await token.save();
        console.log('Generated access token:', accessToken);

        // 返回令牌响应
        return res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: authCode.scope.join(' ')
        });
      }

      return res.status(400).json({ error: 'unsupported_grant_type' });

    } catch (error: any) {
      console.error('OAuth2 Token Error:', {
        message: error.message,
        stack: error.stack,
        body: req.body
      });
      return res.status(500).json({ 
        error: 'server_error',
        error_description: error.message
      });
    }
  }

  // 用户信息端点
  async userinfo(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const accessToken = authHeader.substring(7);

    try {
      const token = await OAuth2AccessToken.findOne({ 
        accessToken,
        expiresAt: { $gt: new Date() }
      });

      if (!token) {
        return res.status(401).json({ error: 'invalid_token' });
      }

      // 查找已关联的用户
      const linkedUser = await OAuth2Client.findOne({
        clientId: token.clientId,
        'linkedUsers.userId': token.userId
      });

      const user = await User.findById(token.userId);
      if (!user) {
        return res.status(401).json({ error: 'user_not_found' });
      }

      // 根据scope返回用户信息
      const userInfo: any = {};
      if (token.scope.includes('openid')) {
        userInfo.sub = user._id;
      }
      if (token.scope.includes('profile')) {
        userInfo.name = user.username;
        userInfo.fullname = user.fullname;
      }
      if (token.scope.includes('email')) {
        userInfo.email = user.email;
      }
      if (token.scope.includes('firstname')) {
        userInfo.firstname = user.username;
      }
      if (token.scope.includes('lastname')) {
        userInfo.lastname = user.fullname;
      }
      if (token.scope.includes('username')) {
        userInfo.username = user.username;
      }
      console.log('user', user);
      console.log('userInfo', userInfo);

      console.log('Token scopes:', token.scope);

      res.json(userInfo);
    } catch (error) {
      res.status(500).json({ error: 'server_error6' });
    }
  }
} 