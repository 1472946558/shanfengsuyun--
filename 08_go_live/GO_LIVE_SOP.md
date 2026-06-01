# 闪蜂速运小程序 上线 SOP

- 生成日期：2026-05-20
- 项目 ID：shanfeng-express-miniapp
- 项目类型：微信小程序前端交付包
- 推荐部署方式：微信开发者工具 / 公众平台发布
- 项目目录：/Users/xiaoliao/Desktop/openclaw/workspace/projects/shanfeng-express-miniapp
- 公司级 SOP：workspace/docs/0_公司级系统SOP/01_项目部署与上线SOP.md
- 服务器资料模板：workspace/docs/0_公司级系统SOP/服务器部署资料收集模板.md

## 当前目标

- 项目摘要：原创快递/同城配送微信小程序，包含寄件、查件、网点、客服、地址簿等完整前端交付包。
- 当前进展：微信版前端交付包已完成，可继续接后端和正式上线链路。
- 客户：待补充

## 上线前命令建议

- `npm run validate:delivery`

## 已有证据材料

- `docs/QA_CHECKLIST.md`

## 已识别部署资料

- HTTPS：依赖客户正式 HTTPS API 域名

## 执行路径

- 1. 在 `utils/config.js` 或同类配置中把 mock 切到真实 API。
- 2. 在微信公众平台配置 request / upload / download 合法域名。
- 3. 用微信开发者工具打开项目目录并完成上传。
- 4. 在公众平台提交审核、记录审核单号、审核通过后发布。
- 5. 发布后做真机验证，并把线上版本号写回 `DEPLOYMENT_PROFILE.md`。

## 发布后 smoke test

- 域名或访问入口可达
- 核心首页或主入口打开正常
- 日志中无连续报错
- 发布后 15 分钟内持续观察
- 微信真机预览正常
- 合法域名与接口请求正常

## 回滚底线

- 核心链路失败、数据异常、域名证书异常、错误率明显升高时立即回滚。
- 回滚后必须重新做 smoke test，并把事故记录写回 `DEPLOYMENT_PROFILE.md`。

## 上线留痕

- 发布版本 / commit SHA
- 实际发布时间
- 操作人
- smoke test 结果
- 是否回滚
- 剩余风险和观察窗口

