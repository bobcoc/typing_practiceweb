/**
 * 塔防游戏成绩提交端到端测试
 * 测试流程：登录 -> 模拟成绩提交 -> 验证数据库存储 -> 检查排行榜
 */
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5001';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass123';

let token = null;
let userId = null;
let sessionCookie = null;

async function request(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
    return { status: res.status, data };
  } catch (e) {
    console.error(`Request error (${method} ${path}):`, e.message);
    return { status: 0, data: null };
  }
}

async function test() {
  console.log('🎮 Tower Defense E2E Test Started\n');

  // 1. 尝试注册或登录
  console.log('1️⃣  Registering/logging in...');
  const registerRes = await request('POST', '/api/auth/register', {
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
    email: 'testuser@example.com',
    fullname: 'Test User',
  });

  if (registerRes.status !== 201 && registerRes.status !== 409) {
    console.error('❌ Register failed:', registerRes);
    return;
  }

  // 2. 登录
  const loginRes = await request('POST', '/api/auth/login', {
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
  });

  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', loginRes);
    return;
  }

  token = loginRes.data?.token;
  userId = loginRes.data?.user?._id;
  console.log(`✅ Logged in. Token: ${token?.substring(0, 20)}... UserId: ${userId}`);

  // 3. 提交成绩
  console.log('\n2️⃣  Submitting tower defense score...');
  const score = Math.floor(Math.random() * 5000) + 1000;
  const wave = Math.floor(Math.random() * 10) + 1;
  const timeSeconds = Math.floor(Math.random() * 300) + 60;

  const submitRes = await request('POST', '/api/tower-defense/record', 
    { wave, score, timeSeconds },
    { Authorization: `Bearer ${token}` }
  );

  if (submitRes.status !== 201) {
    console.error('❌ Score submission failed:', submitRes);
    return;
  }

  console.log(`✅ Score submitted: wave=${wave}, score=${score}, time=${timeSeconds}s`);
  console.log(`   Response:`, submitRes.data);

  // 4. 获取个人最佳
  console.log('\n3️⃣  Fetching personal best...');
  const bestRes = await request('GET', '/api/tower-defense/personal-best', null, {
    Authorization: `Bearer ${token}`,
  });

  if (bestRes.status === 200 && bestRes.data?.hasBest) {
    console.log(`✅ Personal best found: score=${bestRes.data.bestScore}, wave=${bestRes.data.bestWave}`);
  } else {
    console.error('⚠️  No personal best found:', bestRes);
  }

  // 5. 获取排行榜
  console.log('\n4️⃣  Fetching leaderboard...');
  const leaderRes = await request('GET', '/api/tower-defense/leaderboard?page=1&limit=10');

  if (leaderRes.status === 200 && leaderRes.data?.records?.length > 0) {
    console.log(`✅ Leaderboard retrieved (${leaderRes.data.records.length} records)`);
    console.log('   Top 3:');
    leaderRes.data.records.slice(0, 3).forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.fullname}: score=${rec.bestScore}, wave=${rec.bestWave}, games=${rec.totalGames}`);
    });
    
    // 检查我们的用户是否在榜单中
    const found = leaderRes.data.records.some(r => String(r.userId) === String(userId));
    if (found) {
      console.log(`✅ Current user found in leaderboard!`);
    } else {
      console.log(`⚠️  Current user NOT found in leaderboard (may be filtered or paginated)`);
    }
  } else {
    console.error('❌ Leaderboard fetch failed:', leaderRes);
  }

  console.log('\n✅ E2E Test Complete!\n');
}

// 等待服务器启动并运行测试
setTimeout(test, 3000);
