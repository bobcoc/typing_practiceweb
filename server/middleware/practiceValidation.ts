// server/middleware/practiceValidation.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
export const validatePracticeSubmission = async (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => {
    try {
      const { signature, timestamp, ...practiceData } = req.body;
      const currentServerTime = Date.now();
  
      // 1. 验证时间戳
      if (Math.abs(currentServerTime - timestamp) > 2000) {
        return res.status(400).json({
          error: '提交时间异常',
          code: 'INVALID_TIMESTAMP'
        });
      }
  
      // 2. 使用相同的方式序列化数据
      const orderedData = JSON.stringify(practiceData, Object.keys(practiceData).sort());
      
      // 3. 验证签名
      const expectedSignature = crypto
        .createHash('sha256')
        .update(orderedData + timestamp)
        .digest('hex');
  
      console.log('Debug info:', {
        receivedSignature: signature,
        expectedSignature: expectedSignature,
        data: orderedData,
        timestamp: timestamp
      });
  
      if (signature !== expectedSignature) {
        return res.status(400).json({
          error: '数据签名无效',
          code: 'INVALID_SIGNATURE',
          debug: {
            received: signature,
            expected: expectedSignature
          }
        });
      }
  
      // ... 其他验证代码保持不变
  
      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(400).json({
        error: '数据验证失败',
        code: 'VALIDATION_ERROR'
      });
    }
  };