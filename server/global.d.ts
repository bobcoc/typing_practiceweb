import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user: {
        _id: string;
        username: string;
        fullname?: string;
        isAdmin?: boolean;
      };
    }
  }
}

// 解决TypeScript类型错误
declare module 'express-serve-static-core' {
  interface Router {
    get: any;
    post: any;
    put: any;
    delete: any;
  }
}

export {}; 