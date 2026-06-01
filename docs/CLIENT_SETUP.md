# 客户接入与服务器配置说明

## 1. 小程序基础配置

客户正式上线前，需要准备：

- 微信小程序 AppID。
- 已备案 HTTPS 域名。
- 后端 RESTful API 服务地址。
- 合法的隐私政策、用户协议、客服入口。
- 如涉及支付，需要开通微信支付商户号。

## 2. 修改项目配置

打开 `project.config.json`，替换：

```json
{
  "appid": "客户的小程序 AppID",
  "projectname": "shanfeng-express-miniapp"
}
```

如果先演示，可继续使用测试号或游客模式。

## 3. 修改后端地址

打开 `utils/config.js`，把 `baseURL` 改成客户服务器地址：

```js
baseURL: "https://api.customer-domain.com"
```

正式环境建议：

- `env` 改成 `production`。
- 在微信公众平台配置 request 合法域名。
- 所有接口必须使用 HTTPS。

## 4. 后端必须实现的接口

接口合同见 `docs/API_CONTRACT.md`。最小上线需要：

| 接口 | 用途 | 上线优先级 |
| --- | --- | --- |
| `POST /api/v1/auth/wechat-login` | 微信登录 | P0 |
| `POST /api/v1/auth/douyin-login` | 抖音登录 | P0 |
| `POST /api/v1/orders` | 创建寄件单 | P0 |
| `GET /api/v1/orders` | 我的寄件列表 | P0 |
| `GET /api/v1/orders/:id` | 运单详情 | P0 |
| `GET /api/v1/waybills/:waybillNo/track` | 运单查询 | P0 |
| `POST /api/v1/pricing/estimate` | 运费时效试算 | P1 |
| `GET /api/v1/addresses` | 地址簿 | P1 |
| `GET /api/v1/service-points` | 服务网点 | P1 |
| `POST /api/v1/service-tickets` | 客服工单 | P1 |

## 5. 当前 mock 与真实后端切换

当前前端已内置本地 mock，便于无服务器演示。

接真实后端时，需要在这些文件中接入真实接口返回：

- `utils/apiClient.js`
- `utils/orderStore.js`
- `utils/userStore.js`
- `pages/order/index.js`
- `pages/track/index.js`
- `pages/orders/index.js`
- `pages/profile/index.js`

建议先保持本地 mock 兜底，接口失败时继续给用户友好提示，不要把错误堆栈显示到页面。

## 6. 上线前检查

必须完成：

- 抖音 AppID/AppSecret 只放服务端环境变量，不允许写入前端代码。
- 微信小程序隐私接口配置。
- 服务器域名白名单。
- 登录态、手机号授权、地址授权合规提示。
- 订单数据落库。
- 轨迹状态可追踪。
- 客服入口可用。
- 异常状态不展示代码错误。
- 真机 iOS / Android 验收。
