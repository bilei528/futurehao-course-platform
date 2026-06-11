# 教培网课售卖平台

基于 **NestJS + Vue3 + MySQL + Redis + 阿里云 OSS** 的网课售卖系统。

## 功能概览

| 角色 | 功能 |
|------|------|
| 管理员 | 上传视频到阿里云 OSS、管理年级/课程包/课时 |
| 学员 | 手机验证码注册登录、浏览年级课程、微信/支付宝扫码购买整包、永久观看 |

## 项目结构

```
tools/
├── backend/        # NestJS API 服务
├── user-web/       # 学员端网页（端口 5173）
├── admin-web/      # 管理后台（端口 5174）
└── docker-compose.yml  # MySQL + Redis
```

## Windows 本地验证（无需阿里云）

适合先在个人电脑上跑通完整流程，**不需要**阿里云 OSS、短信、微信/支付宝。

| 功能 | 本地替代方案 |
|------|-------------|
| 视频存储 | 保存到 `backend/uploads/` 目录 |
| 短信验证码 | 打印在后端终端控制台 |
| 支付 | 弹窗内「模拟支付成功」按钮 |
| Redis | 自动使用内存模式 |

### 一键准备（PowerShell）

```powershell
cd D:\plan\tools
.\start-local.ps1
```

脚本会复制 `backend/.env.local` → `.env`，初始化数据库，安装依赖。

### 手动启动（3 个终端）

**前提：本机有 MySQL**（推荐用 Docker：`docker compose up -d mysql`）

```powershell
# 终端 1 - 后端
cd backend
copy .env.local .env
npm install
npx prisma db push
npx ts-node prisma/seed.ts
npm run start:dev

# 终端 2 - 学员端
cd user-web
npm install
npm run dev

# 终端 3 - 管理后台
cd admin-web
npm install
npm run dev
```

### 本地验证流程

1. 打开 http://localhost:5174 ，用 `admin` / `admin123456` 登录
2. 添加年级 → 创建课程包 → 上传本地视频文件
3. 打开 http://localhost:5173 ，手机号登录（验证码看**后端终端**输出）
4. 进入课程包 → 点「微信支付」→ 点「模拟支付成功」
5. 购买后可点击「观看」播放本地视频

---

## 生产环境快速开始

### 1. 启动数据库

```bash
docker compose up -d
```

### 2. 配置后端环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入数据库、Redis、阿里云、微信、支付宝配置
# STORAGE_MODE=oss  PAYMENT_MODE=live  REDIS_MODE 留空
```

### 3. 安装依赖并初始化数据库

```bash
cd backend
npm install
npx prisma db push
npx ts-node prisma/seed.ts
npm run start:dev
```

开发环境下短信验证码会打印在后端控制台，无需真实发送。

### 4. 启动前端

```bash
# 学员端
cd user-web
npm install
npm run dev

# 管理后台
cd admin-web
npm install
npm run dev
```

- 学员端：http://localhost:5173
- 管理后台：http://localhost:5174（默认账号 `admin` / `admin123456`）

## 阿里云 OSS 配置

1. 创建 **私有** Bucket（禁止公共读）
2. 创建 RAM 用户，授予 OSS 读写权限
3. 在 `.env` 中配置 `OSS_REGION`、`OSS_BUCKET`、`ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`
4. 视频上传流程：管理后台获取签名 URL → 浏览器直传 OSS → 保存 `ossKey` 到数据库
5. 播放时后端校验购买权限后返回 **2 小时有效** 的签名播放地址

## 支付配置

### 微信支付（Native 扫码）

1. 商户平台开通 Native 支付
2. 下载 API 证书，将 `apiclient_key.pem` 放到 `backend/certs/`
3. 配置 `WECHAT_APP_ID`、`WECHAT_MCH_ID`、`WECHAT_API_V3_KEY`、`WECHAT_SERIAL_NO`
4. 回调地址：`https://你的域名/api/payment/notify/wechat`（必须 HTTPS）

### 支付宝（当面付 precreate）

1. 开通 **当面付** 产品
2. 配置应用公钥/私钥
3. 回调地址：`https://你的域名/api/payment/notify/alipay`

支付成功后系统自动创建 `user_purchases` 记录，**永久买断**，无过期时间。

## 核心 API

| 接口 | 说明 |
|------|------|
| `POST /api/auth/send-code` | 发送登录验证码 |
| `POST /api/auth/login` | 手机号验证码登录 |
| `GET /api/grades` | 浏览年级与课程包 |
| `GET /api/packages/:id` | 课程包详情 |
| `POST /api/orders` | 创建订单并返回支付二维码 |
| `GET /api/orders/:orderNo` | 查询订单状态（前端轮询） |
| `GET /api/lessons/:id/play` | 获取播放地址（需已购买） |
| `POST /api/admin/login` | 管理员登录 |
| `POST /api/oss/upload-credential` | 获取 OSS 上传凭证 |

## 生产部署建议

1. 后端部署到阿里云 ECS，使用 PM2 或 Docker 守护进程
2. Nginx 反向代理：
   - `https://www.你的域名` → user-web 静态文件
   - `https://admin.你的域名` → admin-web 静态文件
   - `https://api.你的域名` → NestJS (3000)
3. 配置 HTTPS 证书（阿里云免费证书即可）
4. 将 `CORS_ORIGINS` 设为正式域名
5. `NODE_ENV=production` 开启真实短信发送

## 默认管理员

执行 seed 脚本后：

- 用户名：`admin`
- 密码：`admin123456`

**上线后请立即修改密码。**
