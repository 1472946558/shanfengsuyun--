const { getProfile, loginOnline, clearProfile } = require("../../utils/userStore");

Page({
  data: {
    form: getProfile(),
    submitting: false,
    submitText: "保存并登录"
  },

  onShow() {
    this.setData({ form: getProfile() });
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    const update = {};
    update[`form.${key}`] = event.detail.value;
    this.setData(update);
  },

  submitProfile() {
    const { name, phone } = this.data.form;
    if (!name || !phone) {
      wx.showToast({ title: "请填写姓名和手机号", icon: "none" });
      return;
    }
    this.setData({ submitting: true, submitText: "正在登录" });
    loginOnline(this.data.form)
      .then(() => {
        wx.showToast({ title: "资料已保存", icon: "success" });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/profile/index" });
        }, 450);
      })
      .catch(() => {
        wx.showToast({ title: "登录失败，请检查服务器配置", icon: "none" });
      })
      .finally(() => {
        this.setData({ submitting: false, submitText: "保存并登录" });
      });
  },

  fillDemo() {
    this.setData({
      form: {
        id: "",
        name: "廖先生",
        phone: "13800002026",
        wechat: "liaoliao-demo",
        qq: "1002026",
        company: "闪蜂速运测试客户",
        city: "深圳",
        defaultFromAddress: "深圳市南山区 科技园 A 座",
        defaultToAddress: "广州市天河区 珠江新城 B 塔",
        loggedIn: false,
        createdAt: ""
      }
    });
  },

  logout() {
    clearProfile();
    wx.showToast({ title: "已退出登录", icon: "none" });
    this.setData({ form: getProfile() });
  }
});
