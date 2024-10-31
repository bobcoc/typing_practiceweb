// server/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// 用户接口
interface UserPayload {
  _id: string;
  username: string;
  iat?: number;
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
    public statusCode: number = 401
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
    return jwt.verify(token, config.JWT_SECRET) as UserPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('认证令牌已过期');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('无效的认证令牌');
    }
    throw new AuthError('认证失败');
  }
};

/**
 * 认证中间件
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 获取并验证 Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      throw new AuthError('未提供认证令牌');
    }

    // 验证 token 格式
    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthError('认证令牌格式无效');
    }

    // 提取并验证 token
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      throw new AuthError('认证令牌为空');
    }

    // 验证并解析 token
    const decoded = verifyToken(token);

    // 验证必要的用户信息
    if (!decoded._id || !decoded.username) {
      throw new AuthError('认证令牌信息不完整');
    }

    // 将用户信息和 token 添加到请求对象
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: 'AUTH_ERROR'
      });
    }

    // 处理其他未预期的错误
    console.error('认证中间件错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      code: 'SERVER_ERROR'
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
      const decoded = verifyToken(token);
      req.user = decoded;
      req.token = token;
    }
    next();
  } catch (error) {
    // 即使认证失败也继续处理请求
    next();
  }
};

/**
 * 管理员认证中间件
 * 需要在用户模型中添加 isAdmin 字段
 */
export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 首先进行普通认证
    await auth(req, res, () => {
      // 检查用户是否为管理员
      if (!req.user || !(req.user as UserPayload & { isAdmin?: boolean }).isAdmin) {
        throw new AuthError('需要管理员权限', 403);
      }
      next();
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: 'ADMIN_AUTH_ERROR'
      });
    }
    res.status(500).json({
      error: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 导出类型
export type { UserPayload };