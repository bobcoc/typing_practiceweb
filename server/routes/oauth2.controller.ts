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
        return res.status(400).json({ error: 'invalid_client1' });
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
        firstname: user.username,
        lastname: user.fullname,
        username: user.username
      };

      // 检查该用户是否已经关联了其他 OAuth 账号
      const existingOAuthUser = await OAuth2Client.findOne({
        clientId: client_id,
        'linkedUsers.userId': user._id
      });

      // 如果已经关联，直接生成新的授权码
      if (existingOAuthUser) {
        console.log('User already linked, proceeding with login');
        // 继续授权流程，而不是返回错误
      }

      // 如果是首次关联，添加关联关系
      if (!existingOAuthUser) {
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
      }

      // 生成授权码
      const code = generateRandomString(32);
      const authCode = new OAuth2AuthorizationCode({
        code,
        clientId: client_id,
        userId: req.session.userId,
        scope: (scope as string)?.split(' ') || ['openid', 'profile', 'email', 'firstname', 'lastname', 'username'],
        scopeMapping: scopeMapping,
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
    try {
      // 添加请求体调试日志
      console.log('Request Content-Type:', req.headers['content-type']);
      console.log('Full request body:', req.body);
      
      const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

      // 验证所需参数是否存在
      if (!client_id || !client_secret) {
        console.log('Missing credentials:', { client_id, client_secret });
        return res.status(400).json({ error: 'invalid_request', message: 'Missing client credentials' });
      }

      // 验证客户端
      const client = await OAuth2Client.findOne({ 
        clientId: client_id
      });

      if (!client) {
        console.log('Client authentication failed for:', { client_id, client_secret });
        return res.status(401).json({ error: 'invalid_client2' });
      }

      if (grant_type === 'authorization_code') {
        // 打印完整的请求参数
        console.log('Token request parameters:', {
          grant_type,
          code,
          client_id,
          client_secret,
          redirect_uri
        });
        
        // 先只用code查询，看看记录是否存在
        const codeRecord = await OAuth2AuthorizationCode.findOne({ code });
        console.log('Found record by code:', codeRecord);
        
        // 如果找到记录，比对其他字段
        if (codeRecord) {
          console.log('Comparing values:', {
            'Request clientId': client_id,
            'DB clientId': codeRecord.clientId,
            'Request redirectUri': redirect_uri,
            'DB redirectUri': codeRecord.redirectUri,
            'Expired?': codeRecord.expiresAt < new Date()
          });
        }

        const authCode = await OAuth2AuthorizationCode.findOne({ 
          code,
          clientId: client_id,
          redirectUri: redirect_uri
        });
        console.log('authCode', authCode);

        if (!authCode || authCode.expiresAt < new Date()) {
          return res.status(400).json({ error: 'invalid_grant' });
        }

        // 查找已关联的用户
        const linkedUser = await OAuth2Client.findOne({
          clientId: client_id,
          'linkedUsers.userId': authCode.userId
        });

        // 生成访问令牌
        const accessToken = generateRandomString(32);
        const token = new OAuth2AccessToken({
          accessToken,
          clientId: client_id,
          userId: authCode.userId,
          scope: authCode.scope,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          // 添加关联用户信息
          linkedUser: linkedUser ? {
            userId: authCode.userId,
            isLinked: true
          } : null
        });
        await token.save();

        // 在响应中包含用户关联状态
        res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: authCode.scope.join(' '),
          // 添加用户关联信息
          account_status: linkedUser ? 'linked' : 'new',
          user_id: authCode.userId
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

      // 查找已关联的用户
      const linkedUser = await OAuth2Client.findOne({
        clientId: token.clientId,
        'linkedUsers.userId': token.userId
      });

      const user = await User.findById(token.userId);
      if (!user) {
        return res.status(404).json({ error: 'user_not_found' });
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