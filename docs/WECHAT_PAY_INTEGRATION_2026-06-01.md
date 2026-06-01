# 闪蜂速运微信小程序 微信支付对接说明 2026-06-01

## 当前真实状态

当前这套代码已经补了微信支付骨架，并已本地串行调试通过 `mock` 支付链路。

已确认现状：

- 前端已补 `wx.requestPayment` 拉起逻辑
- 服务端已补支付下单接口
- 服务端已补支付回调接口
- 服务端已补支付状态查询接口
- 服务端已补退款接口
- 当前本地可跑通“创建订单 -> 预下单 -> 支付状态查询 -> 退款”的 `mock` 链路

但它还不等于已经完成真实微信扣款联调。

当前剩余阻塞在：

1. 商户号与小程序 `AppID` 是否已绑定
2. 正式商户参数是否齐全
3. 正式 `notify_url` 域名和 HTTPS
4. 真机环境下的真实微信支付验证

## 你现在需要准备的参数

按微信支付商户平台当前文档，小程序支付至少要有这些：

- 小程序 `AppID`
- 微信支付 `mchid`
- `AppID` 和 `mchid` 已绑定
- `APIv3 Key`
- 商户 API 私钥
- 商户证书序列号
- 支付回调地址 `notify_url`

你这张图说明：

- 商户平台账号已能登录
- 但还不能证明 `AppID` 绑定、APIv3 Key、证书、回调地址都已完成

## 商户平台要先确认什么

商户号存在，不代表小程序支付就能直接用。先核对这两件事：

1. 商户平台里已经关联这个小程序 `AppID`
2. 小程序后台已经确认这个待关联商户号

当前官方操作路径是：

- 商户平台：`产品中心 -> APPID账号管理 -> 我关联的APPID账号`
- 发起绑定：`产品中心 -> APPID授权管理 -> +关联AppID -> 新增授权`
- 小程序后台确认：`微信公众平台 -> 微信支付 -> 商户号管理`

如果这一步没做，后面即使你有 `mchid` 和证书，也可能在下单或拉起支付时报错。

## 官方对接主链路

微信支付当前官方链路是：

1. 服务端调用 `POST /v3/pay/transactions/jsapi`
2. 微信支付返回 `prepay_id`
3. 服务端生成前端拉起支付参数
4. 小程序前端调用 `wx.requestPayment`
5. 微信支付异步通知商户 `notify_url`
6. 商户服务端验签、解密、更新订单状态
7. 前端再查订单状态，不以前端回调直接当最终成功

## 这套项目现在已经落了什么

### 一、服务端 4 个接口已补

当前 `server/src/server.js` 已有：

- `POST /api/v1/payments/wechat/prepay`
- `POST /api/v1/payments/wechat/notify`
- `GET /api/v1/payments/:orderId/status`
- `POST /api/v1/refunds`

### 二、订单支付字段已补

当前项目仍是 JSON 文件存单，但已补这些支付字段：

- `outTradeNo`
- `payProvider`
- `payStatus`
- `prepayId`
- `transactionId`
- `paidAt`
- `refundStatus`
- `outRefundNo`
- `refundId`
- `refundAmountFen`
- `refundedAt`
- `notifyPayloadDigest`

如果后面切 MySQL，这些字段也要保留。

### 三、前端支付动作已补

当前前端已经按这个顺序走：

1. 先创建业务订单
2. 再调用 `/api/v1/payments/wechat/prepay`
3. 取回：
   - `timeStamp`
   - `nonceStr`
   - `package`
   - `signType`
   - `paySign`
4. 前端调用 `wx.requestPayment`
5. 支付返回后再查 `/api/v1/payments/:orderId/status`
6. 订单详情页支持“继续支付”

## 调试顺序

最稳的调试顺序是：

1. 先确认 `AppID` 已绑定 `mchid`
2. 先把服务端从 `WECHAT_PAY_PROVIDER=mock` 切到 `wechatpay`
3. 用固定金额 `1` 分做测试单
4. 服务端先打印原始下单响应
5. 前端只负责拉起 `wx.requestPayment`
6. 最终支付成功只认 `notify_url` 回调和主动查单结果
7. 再做真实退款联调

## 当前最容易踩坑的点

### 1. `AppID` 和 `mchid` 没绑

这会导致下单或拉起支付直接失败。

### 2. 前端成功回调不代表最终成功

前端 `success` 只能代表用户完成了支付流程返回，最终以服务端异步通知和查单为准。

### 3. 交易类小程序没补发货管理

微信支付官方文档明确写了，交易类小程序如果不满足运营规范、没有按要求接入订单发货管理，正式环境可能被限制小程序支付能力。

### 4. 用错用户标识

小程序支付下单要的是该 `AppID` 下用户的 `openid`，不是别的平台用户 ID。

### 5. 商户已经开通，但没开到小程序场景

网站/H5、公众号/JSAPI、小程序支付是不同接入场景。当前你这边要的是小程序支付，不是 H5 支付，也不是公众号支付。

## 这次代码改动的真实结果

当前这套项目已经做到：

- 前端支付按钮和支付重试已接
- 微信登录已支持换取 `openid`
- `prepay / notify / status / refunds` 四个接口已接
- `mock` 模式本地可验证全链路
- 已预留真实 `wechatpay` 模式所需环境变量和签名逻辑

但现在还不能宣称“真实微信支付已联调完成”，因为还缺真实商户参数和平台绑定结果。否则你现在会出现：

- 能弹收银台
- 但订单状态落不稳
- 退款没法做
- 回调没法验收

## 这一步你还缺什么

如果你要我继续直接做，下一步要补这几项：

- 微信小程序正式 `AppID`
- 微信小程序 `AppSecret`
- `mchid`
- `APIv3 Key`
- 商户 API 私钥文件
- 商户证书序列号
- 微信支付平台证书
- 支付回调正式域名
- 商户平台里确认 `AppID` 绑定完成

这些只放服务端，不进前端仓库。
