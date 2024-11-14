import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../server/config';

// 定义用户接口
interface IUser extends Document {
  username: string;
  password: string;
  email: string;
  isAdmin: boolean;
  created: Date;
  lastLogin: Date;
}

// 创建 Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  isAdmin: { type: Boolean, default: false },
  created: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// 使用相同的方式创建模型
const User = mongoose.model<IUser>('User', userSchema);

async function migratePasswords() {
  try {
    // 连接数据库并等待连接完成
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('数据库连接成功: ' + config.MONGODB_URI);

    // 使用 User 模型查询
    const users = await User.find({}).exec();
    console.log(`找到 ${users.length} 个用户需要迁移`);

    // 记录成功和失败的数量
    let successCount = 0;
    let failCount = 0;

    // 遍历所有用户
    for (const user of users) {
      try {
        console.log('处理用户:', user.username);
        
        // 检查密码是否已经是哈希形式
        if (user.password && user.password.length === 60 && user.password.startsWith('$2b$')) {
          console.log(`用户 ${user.username} 的密码已经是加密格式`);
          continue;
        }

        // 获取原始密码
        const originalPassword = user.password;

        if (!originalPassword) {
          console.log(`用户 ${user.username} 没有密码，跳过`);
          continue;
        }

        // 生成加密密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(originalPassword, salt);

        // 更新用户密码
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );

        console.log(`用户 ${user.username} 密码迁移成功`);
        successCount++;
      } catch (error) {
        console.error(`用户 ${user.username} 密码迁移失败:`, error);
        failCount++;
      }
    }

    console.log('\n迁移完成统计:');
    console.log(`总用户数: ${users.length}`);
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${failCount}`);

  } catch (error) {
    console.error('迁移过程出错:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行迁移
migratePasswords().then(() => {
  console.log('迁移脚本执行完成');
  process.exit(0);
}).catch((error) => {
  console.error('迁移脚本执行失败:', error);
  process.exit(1);
});