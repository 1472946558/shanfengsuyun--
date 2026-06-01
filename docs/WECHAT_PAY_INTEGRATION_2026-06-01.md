# 闪蜂速运微信小程序 微信支付对接说明 2026-06-01

## 当前真实状态

当前这套代码还没有接微信支付。

已确认现状：

- 前端还没有 `wx.requestPayment`
- 服务端还没有支付下单接口
- 服务端还没有支付回调接口
- 当前 `server/src/server.js` 只有登录、寄件单、查单、轨迹、客服工单等接口

所以要接微信支付，不能只改前端，必须同时补：

1. 商户平台参数
2. 服务端支付下单
3. 服务端支付回调
4. 前端拉起支付
5. 支付后查单与订单状态更新

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

## 官方对接主链路

微信支付当前官方链路是：

1. 服务端调用 `POST /v3/pay/transactions/jsapi`
2. 微信支付返回 `prepay_id`
3. 服务端生成前端拉起支付参数
4. 小程序前端调用 `wx.requestPayment`
5. 微信支付异步通知商户 `notify_url`
6. 商户服务端验签、解密、更新订单状态
7. 前端再查订单状态，不以前端回调直接当最终成功

## 这套项目应该怎么落

### 一、服务端新增 4 个接口

建议在现有 `server/src/server.js` 基础上至少补：

- `POST /api/v1/payments/wechat/prepay`
- `POST /api/v1/payments/wechat/notify`
- `GET /api/v1/payments/:orderId/status`
- `POST /api/v1/refunds`

### 二、订单表至少补这些字段

当前项目是 JSON 文件存单，正式支付至少要加：

- `outTradeNo`
- `payProvider`
- `payStatus`
- `prepayId`
- `transactionId`
- `paidAt`
- `refundStatus`
- `notifyPayloadDigest`

如果后面切 MySQL，这些字段也要保留。

### 三、前端新增支付动作

建议在寄件单创建成功后，不是直接提示“寄件成功”，而是：

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

## 调试顺序

最稳的调试顺序是：

1. 先确认 `AppID` 已绑定 `mchid`
2. 先在服务端把统一下单跑通
3. 用固定金额 `1` 分做测试单
4. 服务端先打印原始下单响应
5. 前端只负责拉起 `wx.requestPayment`
6. 最终支付成功只认 `notify_url` 回调和主动查单结果

## 当前最容易踩坑的点

### 1. `AppID` 和 `mchid` 没绑

这会导致下单或拉起支付直接失败。

### 2. 前端成功回调不代表最终成功

前端 `success` 只能代表用户完成了支付流程返回，最终以服务端异步通知和查单为准。

### 3. 交易类小程序没补发货管理

微信支付官方文档明确写了，交易类小程序如果不满足运营规范、没有按要求接入订单发货管理，正式环境可能被限制小程序支付能力。

### 4. 用错用户标识

小程序支付下单要的是该 `AppID` 下用户的 `openid`，不是别的平台用户 ID。

## 结合你当前代码的最优解

对这套项目，最优解不是马上硬接支付 UI，而是分三步：

1. 先把现有订单接口从 JSON 存储整理成可扩支付状态的数据结构
2. 再补 `wechat prepay + notify`
3. 最后才接前端 `wx.requestPayment`

否则你现在会出现：

- 能弹收银台
- 但订单状态落不稳
- 退款没法做
- 回调没法验收

## 这一步你还缺什么

如果你要我继续直接做，下一步要补这几项：

- 微信小程序正式 `AppID`
- `mchid`
- `APIv3 Key`
- 商户 API 私钥文件
- 商户证书序列号
- 支付回调正式域名

这些只放服务端，不进前端仓库。
