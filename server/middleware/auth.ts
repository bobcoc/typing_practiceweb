// server/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// 用户接口
interface UserPayload {
  _id: string;
  username: string;
  fullname: string;
  email: string;
  isAdmin: boolean;
  exp?: number;
}

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      token?: string;
    }
  }
}

// 认证错误类
class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'AUTH_ERROR' 
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 验证并解析 JWT token
 * @param token JWT token
 * @returns 解析后的用户信息
 */
const verifyToken = (token: string): UserPayload => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as UserPayload;
    
    console.debug('Token verification:', {
      userId: decoded._id,
      username: decoded.username,
      expiresIn: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown'
    });
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.debug('Token expired:', { error: error.message, expiredAt: error.expiredAt });
      throw new AuthError('认证令牌已过期', 401, 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.debug('Invalid token:', { error: error.message });
      throw new AuthError('无效的认证令牌', 401, 'INVALID_TOKEN');
    }
    console.error('Unexpected token verification error:', error);
    throw new AuthError('认证失败', 401, 'AUTH_FAILED');
  }
};

/**
 * 认证中间件
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        error: '未提供认证令牌',
        code: 'NO_TOKEN'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '认证令牌格式无效',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({
        error: '认证令牌为空',
        code: 'EMPTY_TOKEN'
      });
    }

    try {
      const decoded = verifyToken(token);

      if (!decoded._id || !decoded.username) {
        return res.status(401).json({
          error: '认证令牌信息不完整',
          code: 'INCOMPLETE_TOKEN'
        });
      }

      if (decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = decoded.exp - now;
        if (timeLeft < 300) {
          console.debug('Token expiring soon:', {
            timeLeft: `${timeLeft}s`,
            expireAt: new Date(decoded.exp * 1000).toISOString()
          });
        }
      }

      req.user = decoded;
      req.token = token;

      console.debug('Auth successful:', {
        userId: decoded._id,
        username: decoded.username,
        path: req.path
      });

      next();
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      error: '认证失败',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * 可选认证中间件
 * 不强制要求认证，但如果提供了有效的 token 则解析用户信息
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      console.debug('Optional auth: token present');
      const decoded = verifyToken(token);
      req.user = decoded;
      req.token = token;
    } else {
      console.debug('Optional auth: no token');
    }
    next();
  } catch (error) {
    console.debug('Optional auth failed:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof AuthError ? error.code : 'OPTIONAL_AUTH_FAILED'
    });
    next();
  }
};

/**
 * 管理员认证中间件
 */
export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await auth(req, res, () => {
      if (!req.user || !req.user.isAdmin) {
        console.debug('Admin auth failed:', {
          userId: req.user?._id,
          username: req.user?.username,
          isAdmin: req.user?.isAdmin
        });
        return res.status(403).json({
          error: '需要管理员权限',
          code: 'ADMIN_REQUIRED'
        });
      }
      console.debug('Admin auth successful:', {
        userId: req.user._id,
        username: req.user.username
      });
      next();
    });
  } catch (error) {
    console.error('Admin auth unexpected error:', error);
    res.status(500).json({
      error: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 导出类型和错误类
export type { UserPayload };
export { AuthError };