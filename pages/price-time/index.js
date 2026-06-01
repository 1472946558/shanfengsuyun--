const { estimatePrice, serviceTypes, itemTypes, weights } = require("../../utils/orderStore");

Page({
  data: {
    serviceTypes,
    itemTypes,
    weights,
    serviceTypeIndex: 0,
    itemTypeIndex: 0,
    weightIndex: 0,
    form: {
      serviceType: "标快",
      fromAddress: "深圳市 南山区",
      toAddress: "广州市 天河区",
      itemType: "文件证件",
      weight: "1kg以内",
      insuredValue: ""
    },
    estimate: {
      price: 18,
      distance: "8.0km",
      eta: "隔日达"
    }
  },

  onShow() {
    this.refreshEstimate();
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

  refreshEstimate() {
    this.setData({ estimate: estimatePrice(this.data.form) });
  },

  useForOrder() {
    wx.setStorageSync("sfh_pending_order_form", this.data.form);
    wx.switchTab({ url: "/pages/order/index" });
  }
});
