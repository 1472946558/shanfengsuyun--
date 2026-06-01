const { appConfig, request } = require("./apiClient");
const { getProfile } = require("./userStore");

function unwrap(payload) {
  return (payload && payload.data ? payload.data : payload) || {};
}

function queryPaymentStatus(orderId) {
  if (appConfig.mode === "mock" || appConfig.paymentMode === "mock") {
    return Promise.resolve({
      orderId,
      payStatus: "paid",
      provider: "mock"
    });
  }

  return request({
    endpoint: appConfig.endpoints.paymentStatus,
    params: { orderId }
  }).then(unwrap);
}

function requestWechatPrepay(order) {
  const profile = getProfile();
  return request({
    endpoint: appConfig.endpoints.wechatPrepay,
    method: "POST",
    data: {
      orderId: order.id,
      openid: profile.openid || "",
      description: `${appConfig.appName}-${order.serviceType || "寄件服务"}`
    }
  }).then(unwrap);
}

function callPlatformPay(payParams) {
  const runtime = typeof globalThis !== "undefined" ? globalThis : {};
  const douyinApi = runtime.tt;
  const wechatApi = runtime.wx;

  if (douyinApi && typeof douyinApi.pay === "function") {
    if (!payParams.orderInfo) {
      return Promise.reject({
        type: "DOUYIN_PAY_PAYLOAD_MISSING",
        error: new Error("Douyin pay requires orderInfo from backend prepay response")
      });
    }
    return new Promise((resolve, reject) => {
      douyinApi.pay({
        service: 5,
        orderInfo: payParams.orderInfo,
        success(result) {
          resolve(result);
        },
        fail(error) {
          reject({
            type: "DOUYIN_PAY_FAIL",
            error
          });
        }
      });
    });
  }

  if (!wechatApi || typeof wechatApi.requestPayment !== "function") {
    return Promise.reject({
      type: "PAY_API_UNAVAILABLE",
      error: new Error("No supported mini program payment API is available")
    });
  }

  return new Promise((resolve, reject) => {
    wechatApi.requestPayment({
      timeStamp: String(payParams.timeStamp || ""),
      nonceStr: payParams.nonceStr || "",
      package: payParams.package || "",
      signType: payParams.signType || "RSA",
      paySign: payParams.paySign || "",
      success(result) {
        resolve(result);
      },
      fail(error) {
        reject({
          type: "WECHAT_PAY_FAIL",
          error
        });
      }
    });
  });
}

function payOrder(order) {
  if (appConfig.mode === "mock" || appConfig.paymentMode === "mock") {
    return Promise.resolve({
      provider: "mock",
      orderId: order.id,
      payStatus: "paid",
      paid: true,
      mock: true
    });
  }

  return requestWechatPrepay(order).then((result) => {
    if (result.mock || result.paid) {
      return result;
    }
    return callPlatformPay(result.payParams || {}).then(() => queryPaymentStatus(order.id));
  });
}

module.exports = {
  payOrder,
  queryPaymentStatus
};
