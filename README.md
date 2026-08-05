# 外研版 K12 英语口语练习系统 (FLTRP Speaking Practice System)

这是一套面向中小学生的英语口语练习对话脚本生成与互动练习系统，严格对标外研版 (FLTRP) K12 全学段教材。

## ✨ 核心功能
1. **智能对话生成 (后台)**：通过输入教材单元核心词汇、目标句型及自定义场景，调用 Gemini Pro 大语言模型自动生成 100% 覆盖教材考点且符合学生学情的 3 套全英文对话剧本。
2. **纯正 TTS 发音合成 (后台)**：集成 Microsoft Edge TTS 服务，为系统角色（Teacher）生成原汁原味的朗读示范音频，并自动直传至 Cloudflare R2 对象存储，降低带宽成本。
3. **沉浸式互动练习 (前端)**：
   - 教师端台词逐字流式渲染，配合同步音频播放。
   - 学生端通过浏览器 `Web Speech API` 实时拾音。
   - 识别引擎逐词比对，完全准确的单词**即时高亮放大**，正反馈直接拉满。

## 🛠️ 技术栈
- **核心框架**：Next.js 14 (App Router), React, TypeScript
- **数据库**：Supabase (PostgreSQL)
- **对象存储**：Cloudflare R2
- **UI / 动画**：Tailwind CSS, Framer Motion, Lucide React
- **AI & TTS**：Google Gemini 2.5 Pro API, Edge TTS

## 🚀 部署指南

### 1. 环境变量配置
请复制 `.env.example` 并重命名为 `.env.local`，填入以下必要参数：
```env
# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Cloudflare R2 (Audio Storage)
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-key"
CLOUDFLARE_R2_BUCKET_NAME="fltrp-audio"
NEXT_PUBLIC_R2_URL="https://pub-your-bucket.r2.dev"

# Google Gemini API
GEMINI_API_KEY="your-gemini-key"
```

### 2. 数据库初始化
进入 Supabase 控制台的 SQL Editor，将项目根目录下 `supabase/schema.sql` 的内容复制并执行，以创建所需的表结构 (`grades`, `units`, `scripts`, `dialogues`, `practice_logs`)。

### 3. 本地启动
```bash
npm install
npm run dev
```
- 后台生成面板：`http://localhost:3000/admin`
- 学生练习端：`http://localhost:3000/practice`

### 4. 线上部署 (Vercel)
本项目完美适配 Vercel 零配置部署。在 Vercel 导入该 GitHub 仓库，并在设置中配齐上述所有环境变量，即可实现 CI/CD 自动发布。

## 📝 目录结构简析
- `src/app/admin/`: 后台一键生成面板 UI。
- `src/app/practice/`: 学生端口语互动练习 UI。
- `src/app/api/generate/`: 核心 API 路由（对接大模型生成剧本与 TTS 音频并发往 R2）。
- `src/components/ConversationPractice.tsx`: 对话练习核心组件（含录音、高亮动效逻辑）。
- `src/lib/r2.ts`: Cloudflare R2 上传工具。
- `src/lib/supabase.ts`: Supabase 客户端实例化。
