# 抖音小程序部署与上传说明

## 当前状态

本项目原始代码是微信原生小程序。已新增 `scripts/export-douyin.mjs`，可以生成抖音小程序代码包：

```bash
npm run export:douyin
npm run validate:douyin
```

默认输出目录：

```text
/Users/xiaoliao/Desktop/openclaw/workspace/projects/shanfeng-express-douyin-miniapp
```

## 1. 准备抖音小程序 AppID

需要先在抖音开放平台创建小程序，拿到形如 `ttxxxxxx` 的 AppID。

生成抖音项目时传入：

```bash
DOUYIN_APP_ID=ttxxxxxx npm run export:douyin
```

如果要连接真实服务器，同时传入：

```bash
DOUYIN_APP_ID=ttxxxxxx \
DOUYIN_API_BASE_URL=https://api.your-domain.com \
DOUYIN_PRIVACY_URL=https://your-domain.com/privacy \
DOUYIN_AGREEMENT_URL=https://your-domain.com/agreement \
npm run export:douyin
```

未传 `DOUYIN_API_BASE_URL` 时，抖音小程序仍是本地 mock 演示模式。

当前服务器已部署公网 API：

```text
https://code.meteor-x.com/shanfeng-api
```

生成生产版抖音代码包：

```bash
DOUYIN_APP_ID=ttxxxxxx \
DOUYIN_API_BASE_URL=https://code.meteor-x.com/shanfeng-api \
npm run export:douyin
```

## 2. 部署后端 API

本项目已内置可 Docker 部署的 API 服务，接口合同见 `docs/API_CONTRACT.md`。

本地启动：

```bash
cp server/.env.example server/.env
docker compose -f docker-compose.server.yml up -d --build
npm run server:smoke
```

默认本地地址：

```text
http://127.0.0.1:18083
```

生产服务器需要：

- 公网 Linux 服务器。
- 已备案域名。
- HTTPS 证书。
- 反向代理到 API 容器 `8080` 端口。
- 在抖音开放平台配置 request 合法域名。

## 3. 上传到抖音开发者工具

方式 A：使用抖音开发者工具 UI。

1. 打开抖音开发者工具。
2. 导入目录：`workspace/projects/shanfeng-express-douyin-miniapp`。
3. 确认 AppID 正确。
4. 预览并真机测试。
5. 点击工具栏 `上传`，填写版本号和更新日志。
6. 到抖音开放平台版本管理里提审。

方式 B：使用官方 CLI。

```bash
npm install -g tt-ide-cli
tma open /Users/xiaoliao/Desktop/openclaw/workspace/projects/shanfeng-express-douyin-miniapp
tma upload -v 0.1.0 -c "闪蜂速运初始版本" /Users/xiaoliao/Desktop/openclaw/workspace/projects/shanfeng-express-douyin-miniapp
```

如果希望 CI 免登录上传，需要在抖音开放平台拿到上传 token 后执行：

```bash
tma set-app-config ttxxxxxx --token <token>
```

## 4. 我现在还缺的信息

要真正“部署服务器 + 上传抖音后台”，还需要你提供或在本机登录：

- 服务器公网 IP。
- SSH 用户名。
- SSH 密钥路径或登录方式。
- 后端域名，例如 `api.xxx.com`。
- 域名是否已备案、是否已解析到服务器。
- 抖音小程序 AppID。
- 抖音开发者工具是否已登录，或 `tt-ide-cli` token。

没有这些信息时，我只能生成可部署包和上传命令，不能替你完成远程上线。

## 5. 验收

```bash
npm run validate
npm run export:douyin
npm run validate:douyin
```

后端本地验收：

```bash
cp server/.env.example server/.env
docker compose -f docker-compose.server.yml up -d --build
npm run server:smoke
docker compose -f docker-compose.server.yml down
```

当前实际部署结果见 `docs/DEPLOYMENT_RESULT.md`。
