import { Request, Response } from 'express';
import { OAuth2Client, OAuth2AuthorizationCode, OAuth2AccessToken } from '../models/oauth2';
import { User } from '../models/User';
import { generateRandomString } from '../utils/crypto';
import { Session } from 'express-session';

// 添加 session 接口声明
interface CustomSession extends Session {
  userId?: string;
}

// 扩展 Request 类型
interface CustomRequest extends Request {
  session: CustomSession;
}

export class OAuth2Controller {
  // 授权端点
  async authorize(req: CustomRequest, res: Response) {
    const { client_id, redirect_uri, scope, response_type, state } = req.query;
    
    try {
      // 验证客户端
      const client = await OAuth2Client.findOne({ clientId: client_id });
      if (!client) {
        return res.status(400).json({ error: 'invalid_client' });
      }

      // 验证redirect_uri
      if (!client.redirectUris.includes(redirect_uri as string)) {
        return res.status(400).json({ error: 'invalid_redirect_uri' });
      }

      // 如果用户未登录,重定向到登录页面
      if (!req.session.userId) {
        return res.redirect(`/login?redirect=${encodeURIComponent(req.url)}`);
      }

      // 生成授权码
      const code = generateRandomString(32);
      const authCode = new OAuth2AuthorizationCode({
        code,
        clientId: client_id,
        userId: req.session.userId,
        scope: (scope as string)?.split(' '),
        redirectUri: redirect_uri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟有效期
      });
      await authCode.save();

      // 重定向回客户端
      const redirectUrl = new URL(redirect_uri as string);
      redirectUrl.searchParams.set('code', code);
      if (state) {
        redirectUrl.searchParams.set('state', state as string);
      }
      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(500).json({ error: 'server_error' });
    }
  }

  // 令牌端点
  async token(req: Request, res: Response) {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

    try {
      // 验证客户端
      const client = await OAuth2Client.findOne({ 
        clientId: client_id,
        clientSecret: client_secret
      });
      if (!client) {
        return res.status(400).json({ error: 'invalid_client' });
      }

      if (grant_type === 'authorization_code') {
        // 验证授权码
        const authCode = await OAuth2AuthorizationCode.findOne({ 
          code,
          clientId: client_id,
          redirectUri: redirect_uri
        });

        if (!authCode || authCode.expiresAt < new Date()) {
          return res.status(400).json({ error: 'invalid_grant' });
        }

        // 生成访问令牌
        const accessToken = generateRandomString(32);
        const token = new OAuth2AccessToken({
          accessToken,
          clientId: client_id,
          userId: authCode.userId,
          scope: authCode.scope,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时有效期
        });
        await token.save();

        // 删除使用过的授权码
        await authCode.deleteOne();

        res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: authCode.scope.join(' ')
        });
      } else {
        res.status(400).json({ error: 'unsupported_grant_type' });
      }
    } catch (error) {
      res.status(500).json({ error: 'server_error' });
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

      const user = await User.findById(token.userId);
      if (!user) {
        return res.status(404).json({ error: 'user_not_found' });
      }

      // 根据scope返回用户信息
      const userInfo: any = {};
      if (token.scope.includes('profile')) {
        userInfo.name = user.username;
      }
      if (token.scope.includes('email')) {
        userInfo.email = user.email;
      }

      res.json(userInfo);
    } catch (error) {
      res.status(500).json({ error: 'server_error' });
    }
  }
} 