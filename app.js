const { seedOrders } = require("./utils/orderStore");
const { appConfig } = require("./utils/config");

App({
  globalData: {
    brandName: appConfig.appName,
    servicePhone: appConfig.servicePhone,
    city: "深圳",
    apiBaseUrl: appConfig.apiBaseUrl,
    mode: appConfig.mode
  },

  onLaunch() {
    seedOrders();
  }
});
