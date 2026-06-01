# 闪蜂速运小程序

原创快递/同城配送微信小程序，使用原生微信小程序技术栈开发。项目目标是做“成熟快递产品级”的功能体验，但品牌、视觉、素材、文案和数据结构全部原创。

## 技术栈

- WXML
- WXSS
- JavaScript
- 微信小程序原生框架
- RESTful API 封装
- 本地 mock 数据和 `wx.setStorageSync`

## 页面

| 页面 | 路径 | 状态 |
| --- | --- | --- |
| 首页 | `pages/home/index` | 已完成 |
| 寄件 | `pages/order/index` | 已完成 |
| 查件 | `pages/track/index` | 已完成 |
| 我的寄件 | `pages/orders/index` | 已完成 |
| 我的 | `pages/profile/index` | 已完成 |
| 运费时效 | `pages/price-time/index` | 已完成 |
| 地址簿 | `pages/address-book/index` | 已完成 |
| 服务网点 | `pages/service-point/index` | 已完成 |
| 客服中心 | `pages/customer-service/index` | 已完成 |
| 运单详情 | `pages/order-detail/index` | 已完成 |
| 账户配置 | `pages/account/index` | 已完成 |

## 如何打开

1. 打开微信开发者工具。
2. 导入项目目录：`workspace/projects/shanfeng-express-miniapp`。
3. AppID 可先使用测试号或 `touristappid`。
4. 编译运行。

## 如何验收

```bash
npm run icons
npm run validate
```

## 当前能力

- 首页服务展示。
- 寄件地址、收件地址、预约上门。
- 服务产品、托寄物、重量、保价。
- 模拟运费时效。
- 模拟运单创建。
- 运单号查询和轨迹展示。
- 我的寄件列表。
- 地址簿、服务网点、客服中心。
- RESTful 寄件、查件、订单、网点、客服接口规划。
- 微信登录/注册接口预留。

## 商用说明

当前是可演示、可二次开发、可接后端的前端交付包。正式商用上线前必须接入真实后端、地图、支付、消息通知、隐私协议、客服工单和运营资质。

## 客户接入

- 服务器和小程序配置见 `docs/CLIENT_SETUP.md`。
- RESTful 接口合同见 `docs/API_CONTRACT.md`。
- 抖音小程序部署见 `docs/DOUYIN_DEPLOY.md`。
- 演示录屏脚本见 `docs/DEMO_SCRIPT.md`。
- 上线状态判断见 `docs/DELIVERY_STATUS.md`。

## 品牌合规

本项目不使用任何第三方快递品牌商标、Logo、截图、素材和专有文案。业务上参考快递行业通用流程，品牌和 UI 均为原创。
