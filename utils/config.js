const appConfig = {
  appName: "闪蜂速运",
  brandSlogan: "寄快递、查快递、管订单的一站式速运助手",
  mode: "mock", // mock | production
  apiBaseUrl: "https://api.your-domain.com",
  tenantId: "shanfeng-demo",
  requestTimeout: 15000,
  servicePhone: "400-188-2026",
  mapProvider: "tencent",
  privacyUrl: "https://your-domain.com/privacy",
  userAgreementUrl: "https://your-domain.com/agreement",
  endpoints: {
    createOrder: "/api/v1/orders",
    listOrders: "/api/v1/orders",
    orderDetail: "/api/v1/orders/:id",
    orderTrack: "/api/v1/orders/:id/track",
    estimatePrice: "/api/v1/pricing/estimate",
    waybillTrack: "/api/v1/waybills/:waybillNo/track",
    addressBook: "/api/v1/addresses",
    servicePoints: "/api/v1/service-points",
    serviceTickets: "/api/v1/service-tickets",
    uploadFile: "/api/v1/files",
    login: "/api/v1/auth/wechat-login"
  }
};

module.exports = {
  appConfig
};
