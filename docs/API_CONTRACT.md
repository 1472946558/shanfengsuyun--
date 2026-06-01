# RESTful API 合同

## 基础

Base URL：`https://api.your-domain.com`

认证：`Authorization: Bearer <token>`

租户：`x-tenant-id: shanfeng-demo`

## 接口清单

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/api/v1/auth/wechat-login` | 微信登录 |
| `POST` | `/api/v1/auth/douyin-login` | 抖音登录 |
| `POST` | `/api/v1/orders` | 创建寄件单 |
| `GET` | `/api/v1/orders` | 运单列表 |
| `GET` | `/api/v1/orders/:id` | 运单详情 |
| `GET` | `/api/v1/orders/:id/track` | 运单轨迹 |
| `GET` | `/api/v1/waybills/:waybillNo/track` | 按运单号查件 |
| `POST` | `/api/v1/pricing/estimate` | 运费时效试算 |
| `GET` | `/api/v1/addresses` | 地址簿 |
| `GET` | `/api/v1/service-points` | 服务网点 |
| `POST` | `/api/v1/service-tickets` | 客服工单 |

## 运单响应

```json
{
  "id": "SFH20260510001",
  "waybillNo": "SFH20260510001",
  "serviceType": "特快",
  "status": "transit",
  "price": 42,
  "eta": "次日达",
  "courierName": "陈师傅",
  "courierPhone": "13800002026",
  "trackEvents": [
    {
      "status": "created",
      "title": "订单已创建",
      "time": "2026-05-10 09:18",
      "desc": "系统已接收寄件需求"
    }
  ]
}
```
