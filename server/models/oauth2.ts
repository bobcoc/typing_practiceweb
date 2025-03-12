import { Schema, model } from 'mongoose';

// OAuth2客户端应用
const OAuth2ClientSchema = new Schema({
  clientId: { type: String, required: true, unique: true },
  clientSecret: { type: String, required: true },
  name: { type: String, required: true },
  redirectUris: [{ type: String }],
  grants: [{ type: String }],
  scope: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  linkedUsers: [{
    userId: String,
    username: String,
    email: String
  }]
});

// OAuth2授权码
const OAuth2AuthorizationCodeSchema = new Schema({
  code: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scope: [{ type: String }],
  redirectUri: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// OAuth2访问令牌
const OAuth2AccessTokenSchema = new Schema({
  accessToken: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scope: [{ type: String }],
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  sessionId: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

// 添加用户会话跟踪模型
const UserSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentSessionId: { type: String, required: true },
  lastLoginAt: { type: Date, default: Date.now }
});

export const OAuth2Client = model('OAuth2Client', OAuth2ClientSchema);
export const OAuth2AuthorizationCode = model('OAuth2AuthorizationCode', OAuth2AuthorizationCodeSchema);
export const OAuth2AccessToken = model('OAuth2AccessToken', OAuth2AccessTokenSchema);
export const UserSession = model('UserSession', UserSessionSchema); 