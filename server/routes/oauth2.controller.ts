import { Request, Response } from 'express';
import { OAuth2Client, OAuth2AuthorizationCode, OAuth2AccessToken } from '../models/oauth2';
import { User } from '../models/User';
import { generateRandomString } from '../utils/crypto';
import { Session } from 'express-session';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// JWT Payload 类型定义
interface UserPayload {
  _id: string;
  username: string;
  fullname: string;
  email: string;
  isAdmin: boolean;
}

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
      // 调试日志：输出请求信息
      console.log('--- OAuth2 authorize 调试信息 ---');
      console.log('req.headers:', req.headers);
      console.log('req.originalUrl:', req.originalUrl);

      const { client_id, redirect_uri, scope, response_type, state } = req.query;

      // 统一使用 JWT 认证，从多个来源获取 token
      let token: string | undefined;
      let currentUser: UserPayload | null = null;

      // 1. 检查 Authorization 头
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      
      // 2. 检查 cookie（如果存在）
      if (!token && req.headers.cookie) {
        const cookies: Record<string, string> = {};
        req.headers.cookie.split(';').forEach(cookie => {
          const parts = cookie.trim().split('=');
          if (parts.length === 2) {
            cookies[parts[0]] = parts[1];
          }
        });
        
        // 尝试从 cookie 中获取 token
        if (cookies.token) {
          token = cookies.token;
        }
      }

      // 3. 验证 token 并获取用户信息
      if (token) {
        try {
          const decoded = jwt.verify(token, config.JWT_SECRET);
          if (typeof decoded === 'object' && decoded !== null && '_id' in decoded) {
            // 伪造session，让后续逻辑认为已登录
            req.session.userId = decoded._id as string;
            req.session.isAuthenticated = true;
            currentUser = decoded as UserPayload;
            console.log('JWT验证成功，用户信息:', {
              userId: currentUser._id,
              username: currentUser.username
            });
          }
        } catch (error) {
          console.log('JWT验证失败:', error);
        }
      }

      // 如果用户未登录，重定向到登录页面
      if (!currentUser) {
        console.log('用户未登录，重定向到登录页');
        const redirectPath = '/api' + req.originalUrl;
        const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;
        return res.redirect(loginUrl);
      }

      // 用户已登录，继续OAuth2授权流程
      console.log('用户已登录，继续OAuth2授权流程');

      // 从数据库中获取完整用户信息
      const user = await User.findById(currentUser._id);
      if (!user) {
        console.log('数据库中未找到用户:', currentUser._id);
        return res.status(401).json({ error: 'user_not_found' });
      }

      // 验证客户端
      const client = await OAuth2Client.findOne({ clientId: client_id });
      if (!client) {
        return res.status(400).json({ error: 'invalid_client' });
      }

      console.log('OAuth2 authorize start:', {
        user: user.username,
        clientId: client_id
      });

      // 查找现有的用户关联
      const existingLink = await OAuth2Client.findOne({
        clientId: client_id,
        'linkedUsers.username': user.username
      });

      console.log('OAuth2 link check:', {
        username: user.username,
        exists: !!existingLink,
        linkDetails: existingLink
      });

      // 只在没有现有关联时创建新的关联
      if (!existingLink) {
        console.log('Creating new OAuth link');
        await OAuth2Client.updateOne(
          { clientId: client_id },
          {
            $addToSet: {
              linkedUsers: {
                userId: user._id,
                username: user.username,
                email: user.email
              }
            }
          }
        );
      } else {
        console.log('Using existing OAuth link - proceeding with authorization');
      }

      // 生成授权码
      const code = generateRandomString(32);
      const authCode = new OAuth2AuthorizationCode({
        code,
        clientId: client_id,
        userId: user._id,
        redirectUri: redirect_uri,
        scope: (typeof scope === 'string' ? scope.split(' ') : []) || [],
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });

      await authCode.save();
      console.log('Generated auth code:', { code, userId: user._id });

      // 重定向回客户端
      if (!redirect_uri || typeof redirect_uri !== 'string') {
        return res.status(400).json({ error: 'invalid_redirect_uri' });
      }

      const redirectUrl = new URL(redirect_uri);
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
      console.log('最终返回的 userInfo:', userInfo);
      res.json(userInfo);
    } catch (error) {
      res.status(500).json({ error: 'server_error6' });
    }
  }

  async getMoodleSesskey(req: Request, res: Response) {
    console.log('Received request for moodle-sesskey');  // 请求开始日志
    
    try {
      console.log('Fetching Moodle login page...');
      const response = await fetch('https://m.d1kt.cn/login/index.php');
      const html = await response.text();
      console.log('Moodle response received, length:', html.length);  // 检查是否获取到响应
      
      const sesskeyMatch = html.match(/sesskey":"([^"]+)/);
      console.log('Sesskey match result:', sesskeyMatch);  // 检查正则匹配结果
      
      const sesskey = sesskeyMatch ? sesskeyMatch[1] : '';
      
      if (!sesskey) {
        console.log('No sesskey found in response');  // 未找到 sesskey
        return res.status(500).json({ error: 'Failed to get sesskey' });
      }

      console.log('Successfully got sesskey:', sesskey);  // 成功获取 sesskey
      res.json({ sesskey });
    } catch (error) {
      console.error('Get sesskey error:', error);  // 详细的错误信息
      res.status(500).json({ error: 'Failed to get sesskey' });
    }
  }
} 