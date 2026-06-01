const { appConfig } = require("./config");

function formatEndpoint(endpoint, params) {
  return Object.keys(params || {}).reduce((path, key) => {
    return path.replace(`:${key}`, encodeURIComponent(params[key]));
  }, endpoint);
}

function buildUrl(endpoint, params) {
  const base = appConfig.apiBaseUrl.replace(/\/$/, "");
  const formatted = formatEndpoint(endpoint, params);
  const path = formatted.startsWith("/") ? formatted : `/${formatted}`;
  return `${base}${path}`;
}

function request(options) {
  const { endpoint, method = "GET", data = {}, header = {}, params = {} } = options;

  if (appConfig.mode === "mock") {
    return Promise.resolve({
      code: 0,
      message: "mock",
      data: null,
      mock: true
    });
  }

  return new Promise((resolve, reject) => {
    const storedProfile = wx.getStorageSync("sfh_user_profile") || {};
    const tokenHeader = storedProfile.token ? { Authorization: `Bearer ${storedProfile.token}` } : {};

    wx.request({
      url: buildUrl(endpoint, params),
      method,
      data,
      timeout: appConfig.requestTimeout,
      header: Object.assign({
        "content-type": "application/json",
        "x-tenant-id": appConfig.tenantId
      }, tokenHeader, header),
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        reject({
          type: "HTTP_ERROR",
          statusCode: response.statusCode,
          response: response.data
        });
      },
      fail(error) {
        reject({
          type: "NETWORK_ERROR",
          error
        });
      }
    });
  });
}

module.exports = {
  appConfig,
  request,
  buildUrl,
  formatEndpoint
};
