const USER_KEY = "sfh_user_profile";
const { appConfig, request } = require("./apiClient");

function getDefaultProfile() {
  return {
    id: "",
    name: "",
    phone: "",
    wechat: "",
    qq: "",
    company: "",
    city: "深圳",
    openid: "",
    unionid: "",
    defaultFromAddress: "",
    defaultToAddress: "",
    token: "",
    loggedIn: false,
    createdAt: ""
  };
}

function getProfile() {
  return Object.assign(getDefaultProfile(), wx.getStorageSync(USER_KEY) || {});
}

function saveProfile(profile) {
  const nextProfile = Object.assign(getDefaultProfile(), profile, {
    id: profile.id || `U${Date.now()}`,
    loggedIn: true,
    createdAt: profile.createdAt || new Date().toISOString()
  });
  wx.setStorageSync(USER_KEY, nextProfile);
  return nextProfile;
}

function clearProfile() {
  wx.removeStorageSync(USER_KEY);
}

function loginOnline(profile) {
  if (appConfig.mode === "mock") {
    return Promise.resolve(saveProfile(profile));
  }

  return new Promise((resolve, reject) => {
    wx.login({
      success(loginResult) {
        if (!loginResult.code) {
          reject({ type: "WX_LOGIN_ERROR", error: loginResult });
          return;
        }

        request({
          endpoint: appConfig.endpoints.login,
          method: "POST",
          data: {
            code: loginResult.code,
            profile
          }
        }).then((payload) => {
          const data = payload && payload.data ? payload.data : payload;
          resolve(saveProfile(Object.assign({}, profile, {
            id: data.userId || data.id || profile.id,
            token: data.token || profile.token || "",
            openid: data.openid || profile.openid || "",
            unionid: data.unionid || profile.unionid || ""
          })));
        }).catch(reject);
      },
      fail(error) {
        reject({ type: "WX_LOGIN_ERROR", error });
      }
    });
  });
}

function isLoggedIn() {
  return Boolean(getProfile().loggedIn);
}

module.exports = {
  getDefaultProfile,
  getProfile,
  saveProfile,
  loginOnline,
  clearProfile,
  isLoggedIn
};
