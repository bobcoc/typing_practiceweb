const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

// 配置
const MONGODB_URI = 'mongodb://localhost:27017/typeskill';
const USERNAME = 'bobcoc';
const NEW_PASSWORD = 'Admin123'; // 新密码
const SALT_ROUNDS = 10;

async function resetPassword() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const users = db.collection('users');
    
    // 查找用户
    const user = await users.findOne({ username: USERNAME });
    
    if (!user) {
      console.error(`用户 "${USERNAME}" 不存在`);
      return;
    }
    
    // 生成新的密码哈希
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
    
    // 更新用户密码
    const result = await users.updateOne(
      { username: USERNAME },
      { $set: { password: passwordHash } }
    );
    
    if (result.modifiedCount === 1) {
      console.log(`已成功重置 "${USERNAME}" 的密码为 "${NEW_PASSWORD}"`);
      
      // 输出用户信息
      const updatedUser = await users.findOne({ username: USERNAME });
      console.log('用户信息:', {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        updatedAt: updatedUser.updatedAt
      });
    } else {
      console.log('密码重置失败，请重试');
    }
  } catch (error) {
    console.error('重置密码时出错:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB 连接已关闭');
    }
  }
}

// 执行密码重置
resetPassword(); 