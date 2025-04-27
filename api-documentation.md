# D1KT平台API接口调用文档

## 目录

- [简介](#简介)
- [基础信息](#基础信息)
- [登录API](#登录api)
- [注册API](#注册api)
- [代码调用示例](#代码调用示例)
- [错误处理](#错误处理)
- [安全建议](#安全建议)

## 简介

本文档提供了D1KT平台用户认证系统API的详细调用说明，帮助开发者在第三方应用中集成D1KT的用户登录和注册功能。

## 基础信息

- **基础URL**: `https://d1kt.cn/api/api`
- **API版本**: v1
- **内容类型**: application/json
- **字符编码**: UTF-8
- **认证方式**: JWT (JSON Web Token)

## 登录API

### 接口描述

此接口用于验证用户身份并获取访问令牌。

### 请求详情

- **URL**: `/auth/login`
- **方法**: POST
- **内容类型**: application/json

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 验证规则 |
|--------|------|------|------|---------|
| username | String | 是 | 用户名 | 长度2-20个字符 |
| password | String | 是 | 密码 | 长度至少6个字符 |

### 请求示例

```json
{
  "username": "testuser",
  "password": "password123"
}
```

### 响应参数

| 参数名 | 类型 | 描述 |
|--------|------|------|
| token | String | JWT令牌，用于后续请求的认证 |
| user | Object | 用户信息对象 |
| user._id | String | 用户唯一标识符 |
| user.username | String | 用户名 |
| user.fullname | String | 用户姓名 |
| user.email | String | 用户邮箱 |
| user.isAdmin | Boolean | 是否为管理员 |

### 成功响应示例

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d21b4667d0d8992e610c85",
    "username": "testuser",
    "fullname": "测试用户",
    "email": "test@example.com",
    "isAdmin": false
  }
}
```

### 可能的错误

| HTTP状态码 | 错误消息 | 描述 |
|------------|----------|------|
| 400 | 请填写所有字段 | 用户名或密码为空 |
| 400 | 用户名长度应在2-20个字符之间 | 用户名长度不符合要求 |
| 400 | 密码长度至少6个字符 | 密码长度不符合要求 |
| 401 | 用户不存在 | 提供的用户名不存在 |
| 401 | 密码错误 | 提供的密码与用户名不匹配 |
| 500 | 服务器内部错误 | 服务器处理请求时出错 |

## 注册API

### 接口描述

此接口用于创建新用户账户并获取访问令牌。

### 请求详情

- **URL**: `/auth/register`
- **方法**: POST
- **内容类型**: application/json

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 验证规则 |
|--------|------|------|------|---------|
| username | String | 是 | 用户名 | 长度2-20个字符 |
| email | String | 是 | 电子邮箱 | 有效的邮箱格式 |
| fullname | String | 是 | 姓名 | 长度2-50个字符 |
| password | String | 是 | 密码 | 长度至少6个字符 |

### 请求示例

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "fullname": "新用户",
  "password": "password123"
}
```

### 响应参数

| 参数名 | 类型 | 描述 |
|--------|------|------|
| token | String | JWT令牌，用于后续请求的认证 |
| user | Object | 用户信息对象 |
| user._id | String | 用户唯一标识符 |
| user.username | String | 用户名 |
| user.fullname | String | 用户姓名 |
| user.isAdmin | Boolean | 是否为管理员 |

### 成功响应示例

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d21b4667d0d8992e610c85",
    "username": "newuser",
    "fullname": "新用户",
    "isAdmin": false
  }
}
```

### 可能的错误

| HTTP状态码 | 错误消息 | 描述 |
|------------|----------|------|
| 400 | 请填写必填字段 | 有必填字段为空 |
| 400 | 用户名长度应在2-20个字符之间 | 用户名长度不符合要求 |
| 400 | 密码长度至少6个字符 | 密码长度不符合要求 |
| 400 | 请输入有效的邮箱地址 | 邮箱格式不正确 |
| 400 | 姓名长度应在2-50个字符之间 | 姓名长度不符合要求 |
| 409 | 用户名已存在 | 提供的用户名已被注册 |
| 409 | 邮箱已被使用 | 提供的邮箱已被注册 |
| 500 | 服务器内部错误 | 服务器处理请求时出错 |

## 代码调用示例

### JavaScript (Fetch API)

```javascript
// 登录API调用示例
async function login(username, password) {
  try {
    const response = await fetch('https://d1kt.cn/api/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '登录失败');
    }
    
    const data = await response.json();
    // 保存token和用户信息
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

// 注册API调用示例
async function register(username, email, fullname, password) {
  try {
    const response = await fetch('https://d1kt.cn/api/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, fullname, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '注册失败');
    }
    
    const data = await response.json();
    // 保存token和用户信息
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}

// 带身份验证的API调用示例
async function callAuthenticatedAPI(endpoint) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  
  try {
    const response = await fetch(`https://d1kt.cn/api/api${endpoint}`, {
      method: 'GET', // 或其他方法
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // 如果token过期或无效
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('会话已过期，请重新登录');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || '请求失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}
```

### Python (Requests)

```python
import requests
import json

# API基础URL
BASE_URL = "https://d1kt.cn/api/api"

# 登录API调用示例
def login(username, password):
    url = f"{BASE_URL}/auth/login"
    headers = {"Content-Type": "application/json"}
    payload = {"username": username, "password": password}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # 如果请求失败，抛出异常
        
        data = response.json()
        # 在实际应用中，您可能需要保存token和用户信息
        return data
    except requests.exceptions.HTTPError as e:
        error_msg = "未知错误"
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "登录失败")
        except:
            pass
        print(f"登录失败: {error_msg}")
        raise Exception(error_msg)
    except Exception as e:
        print(f"请求异常: {str(e)}")
        raise

# 注册API调用示例
def register(username, email, fullname, password):
    url = f"{BASE_URL}/auth/register"
    headers = {"Content-Type": "application/json"}
    payload = {
        "username": username,
        "email": email,
        "fullname": fullname,
        "password": password
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # 如果请求失败，抛出异常
        
        data = response.json()
        # 在实际应用中，您可能需要保存token和用户信息
        return data
    except requests.exceptions.HTTPError as e:
        error_msg = "未知错误"
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "注册失败")
        except:
            pass
        print(f"注册失败: {error_msg}")
        raise Exception(error_msg)
    except Exception as e:
        print(f"请求异常: {str(e)}")
        raise

# 带身份验证的API调用示例
def call_authenticated_api(endpoint, token):
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)  # 或其他方法
        response.raise_for_status()
        
        return response.json()
    except requests.exceptions.HTTPError as e:
        if response.status_code == 401:
            raise Exception("会话已过期，请重新登录")
        
        error_msg = "未知错误"
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "请求失败")
        except:
            pass
        print(f"API调用失败: {error_msg}")
        raise Exception(error_msg)
    except Exception as e:
        print(f"请求异常: {str(e)}")
        raise
```

### Java (OkHttp)

```java
import com.squareup.okhttp.*;
import org.json.JSONObject;
import java.io.IOException;

public class D1ktApiClient {
    private static final String BASE_URL = "https://d1kt.cn/api/api";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    private final OkHttpClient client = new OkHttpClient();
    
    // 登录API调用示例
    public JSONObject login(String username, String password) throws Exception {
        JSONObject requestBody = new JSONObject();
        requestBody.put("username", username);
        requestBody.put("password", password);
        
        Request request = new Request.Builder()
                .url(BASE_URL + "/auth/login")
                .post(RequestBody.create(JSON, requestBody.toString()))
                .build();
                
        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            
            if (!response.isSuccessful()) {
                JSONObject errorJson = new JSONObject(responseBody);
                String errorMessage = errorJson.optString("message", "登录失败");
                throw new Exception(errorMessage);
            }
            
            return new JSONObject(responseBody);
        } catch (IOException e) {
            throw new Exception("网络请求异常: " + e.getMessage());
        }
    }
    
    // 注册API调用示例
    public JSONObject register(String username, String email, String fullname, String password) throws Exception {
        JSONObject requestBody = new JSONObject();
        requestBody.put("username", username);
        requestBody.put("email", email);
        requestBody.put("fullname", fullname);
        requestBody.put("password", password);
        
        Request request = new Request.Builder()
                .url(BASE_URL + "/auth/register")
                .post(RequestBody.create(JSON, requestBody.toString()))
                .build();
                
        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            
            if (!response.isSuccessful()) {
                JSONObject errorJson = new JSONObject(responseBody);
                String errorMessage = errorJson.optString("message", "注册失败");
                throw new Exception(errorMessage);
            }
            
            return new JSONObject(responseBody);
        } catch (IOException e) {
            throw new Exception("网络请求异常: " + e.getMessage());
        }
    }
    
    // 带身份验证的API调用示例
    public JSONObject callAuthenticatedAPI(String endpoint, String token) throws Exception {
        Request request = new Request.Builder()
                .url(BASE_URL + endpoint)
                .header("Authorization", "Bearer " + token)
                .build();
                
        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            
            if (!response.isSuccessful()) {
                if (response.code() == 401) {
                    throw new Exception("会话已过期，请重新登录");
                }
                
                JSONObject errorJson = new JSONObject(responseBody);
                String errorMessage = errorJson.optString("message", "请求失败");
                throw new Exception(errorMessage);
            }
            
            return new JSONObject(responseBody);
        } catch (IOException e) {
            throw new Exception("网络请求异常: " + e.getMessage());
        }
    }
}
```

## 错误处理

所有API错误响应都会返回HTTP错误状态码和JSON格式的错误信息：

```json
{
  "message": "错误描述信息"
}
```

### 常见HTTP状态码

| 状态码 | 描述 |
|--------|------|
| 200 | 请求成功 |
| 400 | 无效请求（如参数错误、格式错误等） |
| 401 | 认证失败（如令牌无效或过期） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如用户名已存在） |
| 500 | 服务器内部错误 |

### 错误处理最佳实践

1. 始终捕获并处理API调用中可能发生的异常
2. 为用户提供有意义的错误消息
3. 在认证失败时，引导用户重新登录
4. 实现适当的重试机制，处理临时性网络问题

## 安全建议

1. **HTTPS通信**: 所有API请求都必须使用HTTPS协议，确保数据传输安全
2. **安全存储令牌**: 在客户端安全存储用户令牌，避免XSS攻击
3. **令牌过期处理**: 当令牌过期时，引导用户重新登录
4. **敏感信息处理**: 敏感信息不应明文存储在客户端
5. **防CSRF**: 实现适当的CSRF防护机制
6. **限制登录尝试**: 实现账户锁定机制，防止暴力破解

## 集成流程

1. **实现登录/注册界面**: 创建符合您应用风格的登录和注册表单
2. **表单验证**: 在客户端进行基本的表单验证，确保数据符合API要求
3. **调用API**: 使用上述代码示例实现API调用
4. **处理响应**: 根据API响应更新UI和应用状态
5. **令牌管理**: 实现令牌的存储、使用和更新机制
6. **用户会话**: 维护用户会话状态，处理登录/登出逻辑

## 联系与支持

如有任何问题或需要进一步的支持，请联系D1KT技术支持团队。

---

© 2023 D1KT平台 - 保留所有权利 