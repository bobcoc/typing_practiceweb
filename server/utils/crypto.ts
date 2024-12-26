import crypto from 'crypto';

/**
 * 生成指定长度的随机字符串
 * @param length 要生成的字符串长度
 * @returns 随机字符串
 */
export function generateRandomString(length: number): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
} 