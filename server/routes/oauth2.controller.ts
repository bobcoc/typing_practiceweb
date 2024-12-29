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
    const { client_id, redirect_uri, scope, response_type, state } = req.query;
    
    try {
      // 添加请求信息的详细日志
      console.log('Full request session:', req.session);
      console.log('Full request query:', req.query);
      
      // 验证客户端
      console.log('client_id', client_id);
      const client = await OAuth2Client.findOne({ clientId: client_id });
      if (!client) {
        return res.status(400).json({ error: 'invalid_client' });
      }

      // 验证redirect_uri
      if (!client.redirectUris.includes(redirect_uri as string)) {
        return res.status(400).json({ error: 'invalid_redirect_uri' });
      }

      // 检查 session 和 userId
      if (!req.session) {
        console.log('Session is undefined');
        return res.status(500).json({ error: 'session_not_found' });
      }

      console.log('Session userId:', req.session.userId);
      if (!req.session.userId) {
        const loginUrl = `/login?redirect=${encodeURIComponent(req.url)}`;
        console.log('User not logged in. Redirecting to:', loginUrl);
        return res.redirect(loginUrl);
      }

      // 确保检查 session 中的认证状态
      if (!req.session || !req.session.isAuthenticated) {
        const loginUrl = `/login?redirect=${encodeURIComponent(req.originalUrl)}`;
        return res.redirect(loginUrl);
      }

      // 获取用户信息并创建字段映射
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'user_not_found' });
      }

      // 根据请求的 scope 创建用户信息映射
      const scopeMapping = {
        openid: user._id,
        profile: {
          name: user.username
        },
        email: user.email,
        username: user.username
      };

      // 生成授权码
      const code = generateRandomString(32);
      const authCode = new OAuth2AuthorizationCode({
        code,
        clientId: client_id,
        userId: req.session.userId,
        scope: (scope as string)?.split(' ') || [],
        scopeMapping: scopeMapping,  // 保存字段映射
        redirectUri: redirect_uri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await authCode.save();

      // 构建重定向URL
      const redirectUrl = new URL(redirect_uri as string);
      redirectUrl.searchParams.set('code', code);
      if (state) {
        redirectUrl.searchParams.set('state', state as string);
      }

      return res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: 'server_error' });
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
      console.log('eeeeclient', client);
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
      res.status(500).json({ error: 'server_error7' });
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
      res.status(500).json({ error: 'server_error6' });
    }
  }
} 