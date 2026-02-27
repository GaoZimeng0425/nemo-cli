# Bilibili API Service

B 站（Bilibili）API 服务封装，提供视频信息获取、用户认证、视频下载等功能。

## 特性

- ✅ **二维码登录** - 支持扫码登录 B 站账号
- ✅ **视频信息获取** - 获取视频标题、作者、播放量等信息
- ✅ **视频下载** - 下载视频（支持 DASH 和 FLV 格式）
- ✅ **弹幕获取** - 获取视频弹幕
- ✅ **用户信息** - 获取当前登录用户信息
- ✅ **TypeScript 支持** - 完整的类型定义
- ✅ **测试覆盖** - 集成测试和单元测试

## 安装

```bash
pnpm add @nemo-cli/bilibili
```

## 配置

在使用前需要配置 B 站的 API 密钥：

```typescript
import { BilibiliService } from '@nemo-cli/bilibili'

const service = new BilibiliService({
  appKey: 'your_app_key',
  appSec: 'your_app_secret'
})
```

### 获取 App Key 和 Secret

1. 访问 [B 站开放平台](https://openhome.bilibili.com/)
2. 创建应用并获取 `appKey` 和 `appSec`
3. 将密钥配置到服务中

## 使用方法

### 1. 二维码登录

```typescript
import { BilibiliService } from '@nemo-cli/bilibili'

const service = new BilibiliService()

// 生成登录二维码
const qrcode = await service.generateQRCode()
console.log('扫码登录:', qrcode.qrcode_url)
// 显示二维码图片（base64）
console.log('二维码图片:', qrcode.qrcode_image_base64)

// 轮询扫码状态
const status = await service.pollQRCodeStatus(qrcode.qrcode_key)
console.log('状态:', status.status) // waiting | scanned | expired | confirmed

if (status.status === 'confirmed' && status.data) {
  console.log('登录成功，Cookie:', status.data.cookie)
}
```

### 2. 获取视频信息

```typescript
// 获取视频基本信息
const videoInfo = await service.getVideoInfo('BV1xx411c7mD')
console.log('视频标题:', videoInfo.title)
console.log('作者:', videoInfo.owner.name)
console.log('播放量:', videoInfo.stat.view)

// 获取视频流URL
const streamUrl = await service.getVideoStreamUrl('BV1xx411c7mD')
console.log('视频流:', streamUrl.url)
```

### 3. 下载视频

```typescript
// 下载视频到本地
await service.downloadVideo({
  bvid: 'BV1xx411c7mD',
  outputPath: './downloads',
  quality: 80, // 清晰度：80=1080P, 64=720P, 32=480P
  onProgress: (progress) => {
    console.log(`下载进度: ${progress.percent}%`)
  }
})
```

### 4. 获取弹幕

```typescript
const danmaku = await service.getVideoDanmaku('BV1xx411c7mD')
console.log('弹幕列表:', danmaku)
```

### 5. 获取用户信息

```typescript
// 需要先登录获取 Cookie
const userInfo = await service.getUserInfo()
console.log('用户名:', userInfo.name)
console.log('等级:', userInfo.level)
```

## API 文档

### BilibiliService

主服务类，提供所有 B 站 API 功能。

#### 构造函数

```typescript
constructor(config?: BilibiliConfig)
```

**参数:**
- `config.appKey` (可选) - B 站 App Key
- `config.appSec` (可选) - B 站 App Secret
- `config.cookie` (可选) - 登录后的 Cookie

#### 方法

##### generateQRCode()

生成登录二维码。

**返回:** `Promise<QRCodeResult>`

```typescript
interface QRCodeResult {
  qrcode_key: string
  qrcode_url: string
  qrcode_image_base64: string
}
```

##### pollQRCodeStatus(qrcodeKey: string)

轮询二维码扫码状态。

**参数:**
- `qrcodeKey` - 二维码密钥

**返回:** `Promise<QRCodeStatusResult>`

```typescript
interface QRCodeStatusResult {
  status: 'waiting' | 'scanned' | 'expired' | 'confirmed'
  message: string
  data?: {
    cookie: string
    userId: number
  }
}
```

##### getVideoInfo(bvid: string)

获取视频信息。

**参数:**
- `bvid` - 视频 BV 号

**返回:** `Promise<VideoInfo>`

##### getVideoStreamUrl(bvid: string, quality?: number)

获取视频流 URL。

**参数:**
- `bvid` - 视频 BV 号
- `quality` - 清晰度（默认：80）

**返回:** `Promise<StreamUrlResult>`

##### downloadVideo(options: DownloadOptions)

下载视频。

**参数:**
- `options.bvid` - 视频 BV 号
- `options.outputPath` - 输出目录
- `options.quality` - 清晰度（可选）
- `options.onProgress` - 进度回调（可选）

**返回:** `Promise<string>` - 下载的文件路径

##### getVideoDanmaku(bvid: string)

获取视频弹幕。

**参数:**
- `bvid` - 视频 BV 号

**返回:** `Promise<Danmaku[]>`

##### getUserInfo()

获取当前用户信息（需要登录）。

**返回:** `Promise<UserInfo>`

## 类型定义

```typescript
interface VideoInfo {
  bvid: string
  title: string
  desc: string
  owner: {
    mid: number
    name: string
    face: string
  }
  stat: {
    view: number
    danmaku: number
    reply: number
    favorite: number
    coin: number
    share: number
    like: number
  }
  cid: number
  duration: number
  pic: string
}

interface Danmaku {
  text: string
  time: number
  color: number
  senderId: number
}

interface UserInfo {
  mid: number
  name: string
  face: string
  level: number
  sign: string
}
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 运行测试

```bash
# 单元测试
pnpm test

# 测试覆盖率
pnpm test:coverage

# 集成测试
pnpm test:integration
```

### 构建

```bash
pnpm build
```

### 本地开发

```bash
pnpm dev
```

## 注意事项

1. **API 密钥安全** - 请勿将 `appKey` 和 `appSec` 提交到代码仓库
2. **登录 Cookie** - Cookie 有效期有限，过期后需要重新登录
3. **视频下载** - 仅供个人学习使用，请勿用于商业用途
4. **API 限流** - B 站 API 有频率限制，请合理控制请求频率

## 许可证

MIT

## 相关链接

- [B 站开放平台](https://openhome.bilibili.com/)
- [B 站 API 文档](https://github.com/SocialSisterYi/bilibili-API-collect)
