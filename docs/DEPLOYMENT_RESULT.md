# 闪蜂速运部署结果

## 当前公网 API

Base URL：

```text
https://code.meteor-x.com/shanfeng-api
```

健康检查：

```text
https://code.meteor-x.com/shanfeng-api/health
```

## 服务器部署信息

- 服务器：`8.155.20.204`
- 运行方式：`systemd + Node.js`
- 服务名：`shanfeng-express-api`
- 本机监听：`127.0.0.1:18085`
- 数据目录：`/opt/shanfeng-express-api/data`
- 代码目录：`/opt/shanfeng-express-api/server`
- nginx 入口：`https://code.meteor-x.com/shanfeng-api/`

## 已验证接口

```bash
API_BASE=https://code.meteor-x.com/shanfeng-api npm run server:smoke
```

验证结果：

- `/health` 正常。
- `/api/v1/pricing/estimate` 正常。
- `/api/v1/orders` 创建运单正常。
- `/api/v1/orders/:id` 运单详情正常。
- `/api/v1/waybills/:waybillNo/track` 轨迹查询正常。

## 运维命令

查看状态：

```bash
ssh t "systemctl status shanfeng-express-api --no-pager"
```

重启：

```bash
ssh t "systemctl restart shanfeng-express-api"
```

查看日志：

```bash
ssh t "journalctl -u shanfeng-express-api -n 100 --no-pager"
```

## nginx 变更

已在 `code.meteor-x.com` 的 HTTPS server block 中加入：

```nginx
location ^~ /shanfeng-api/ {
    proxy_pass http://127.0.0.1:18085/;
}
```

nginx 备份目录：

```text
/etc/nginx/backups/
```

## 回滚方案

停止 API：

```bash
ssh t "systemctl disable --now shanfeng-express-api"
```

恢复 nginx：

```bash
ssh t "cp /etc/nginx/backups/<backup-file> /etc/nginx/sites-enabled/liuxing-website.conf && nginx -t && systemctl reload nginx"
```

## 抖音上传状态

抖音代码已生成生产版，API 已指向：

```text
https://code.meteor-x.com/shanfeng-api
```

当前不能自动上传的原因：

- 本机未安装/未注册抖音开发者工具协议。
- `tma check-session` 显示未登录。
- 抖音小程序 AppID 仍是占位符：`tt_placeholder_appid`。

需要补齐后即可上传：

```bash
tma login
DOUYIN_APP_ID=tt真实AppID DOUYIN_API_BASE_URL=https://code.meteor-x.com/shanfeng-api npm run export:douyin
tma upload -v 0.1.0 -c "闪蜂速运初始商用测试版本" /Users/xiaoliao/Desktop/openclaw/workspace/projects/shanfeng-express-douyin-miniapp
```

