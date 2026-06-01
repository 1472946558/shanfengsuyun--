const { createOrderOnline, estimatePrice, serviceTypes, itemTypes, weights } = require("../../utils/orderStore");
const { getProfile } = require("../../utils/userStore");
const { appConfig } = require("../../utils/config");

Page({
  data: {
    serviceTypes,
    itemTypes,
    weights,
    pickupTimes: ["尽快上门", "今天 14:00-16:00", "今天 18:00-20:00", "明天 09:00-12:00", "明天 14:00-18:00"],
    serviceTypeIndex: 0,
    itemTypeIndex: 0,
    weightIndex: 0,
    pickupTimeIndex: 0,
    form: {
      serviceType: "标快",
      fromAddress: "",
      toAddress: "",
      itemType: "文件证件",
      weight: "1kg以内",
      pickupTime: "尽快上门",
      insuredValue: "",
      note: ""
    },
    estimate: {
      price: 18,
      distance: "8.0km",
      eta: "隔日达"
    },
    submitting: false,
    submitButtonText: "确认寄件",
    demoNotice: appConfig.mode === "mock" ? "当前为本地演示环境：提交后生成模拟运单，可在查件和订单页查看。" : "当前已连接客户服务器：寄件单会提交到正式后端，请确认信息无误。"
  },

  onLoad(query) {
    const nextForm = Object.assign({}, this.data.form);
    if (query.from) nextForm.fromAddress = decodeURIComponent(query.from);
    if (query.to) nextForm.toAddress = decodeURIComponent(query.to);
    if (query.itemType && this.data.itemTypes.includes(decodeURIComponent(query.itemType))) {
      nextForm.itemType = decodeURIComponent(query.itemType);
    }
    const itemTypeIndex = this.data.itemTypes.indexOf(nextForm.itemType);
    this.setData({ form: nextForm, itemTypeIndex: Math.max(itemTypeIndex, 0) }, () => this.refreshEstimate());
  },

  onShow() {
    this.setTabBarIndex();
    const pending = wx.getStorageSync("sfh_pending_order_form");
    if (!pending) {
      this.applyProfileDefaults();
      return;
    }
    wx.removeStorageSync("sfh_pending_order_form");
    const nextForm = Object.assign({}, this.data.form, pending);
    const itemTypeIndex = this.data.itemTypes.indexOf(nextForm.itemType);
    const weightIndex = this.data.weights.indexOf(nextForm.weight);
    const serviceTypeIndex = this.data.serviceTypes.indexOf(nextForm.serviceType);
    this.setData({
      form: nextForm,
      itemTypeIndex: Math.max(itemTypeIndex, 0),
      weightIndex: Math.max(weightIndex, 0),
      serviceTypeIndex: Math.max(serviceTypeIndex, 0)
    }, () => this.refreshEstimate());
  },

  setTabBarIndex() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  applyProfileDefaults() {
    const profile = getProfile();
    if (!profile.loggedIn) return;
    const nextForm = Object.assign({}, this.data.form);
    if (!nextForm.fromAddress && profile.defaultFromAddress) {
      nextForm.fromAddress = profile.defaultFromAddress;
    }
    if (!nextForm.toAddress && profile.defaultToAddress) {
      nextForm.toAddress = profile.defaultToAddress;
    }
    this.setData({ form: nextForm }, () => this.refreshEstimate());
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    const update = {};
    update[`form.${key}`] = event.detail.value;
    this.setData(update, () => this.refreshEstimate());
  },

  onServiceTypeChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      serviceTypeIndex: index,
      "form.serviceType": this.data.serviceTypes[index]
    }, () => this.refreshEstimate());
  },

  onItemTypeChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      itemTypeIndex: index,
      "form.itemType": this.data.itemTypes[index]
    }, () => this.refreshEstimate());
  },

  onWeightChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      weightIndex: index,
      "form.weight": this.data.weights[index]
    }, () => this.refreshEstimate());
  },

  onPickupTimeChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      pickupTimeIndex: index,
      "form.pickupTime": this.data.pickupTimes[index]
    }, () => this.refreshEstimate());
  },

  refreshEstimate() {
    const result = estimatePrice(this.data.form);
    this.setData({
      estimate: {
        price: result.price,
        distance: result.distance,
        eta: result.eta
      }
    });
  },

  submitOrder() {
    const { fromAddress, toAddress } = this.data.form;
    if (!fromAddress || !toAddress) {
      wx.showToast({ title: "请填写寄件和收件地址", icon: "none" });
      return;
    }
    this.setData({ submitting: true, submitButtonText: "正在生成运单" });
    createOrderOnline(this.data.form)
      .then((order) => {
        wx.showToast({ title: "寄件成功", icon: "success" });
        setTimeout(() => {
          wx.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` });
        }, 450);
      })
      .catch(() => {
        wx.showToast({ title: "寄件失败，请检查服务器配置", icon: "none" });
      })
      .finally(() => {
        this.setData({ submitting: false, submitButtonText: "确认寄件" });
      });
  }
});
