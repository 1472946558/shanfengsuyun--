const { getOrderByIdOnline, statusMap } = require("../../utils/orderStore");
const { payOrder } = require("../../utils/paymentStore");

const paymentStatusMap = {
  unpaid: "待支付",
  pending: "支付处理中",
  paid: "已支付",
  closed: "已关闭",
  failed: "支付失败",
  refunded: "已退款"
};

Page({
  data: {
    order: null,
    statusText: "",
    paymentStatusText: "",
    loading: true,
    paying: false,
    errorText: ""
  },

  onLoad(query) {
    this.loadOrder(query.id);
  },

  loadOrder(id) {
    this.setData({ loading: true, errorText: "" });
    getOrderByIdOnline(id)
      .then((order) => {
        this.setData({
          order,
          statusText: order ? statusMap[order.status] : "",
          paymentStatusText: order ? (paymentStatusMap[order.payStatus] || "待支付") : ""
        });
      })
      .catch(() => {
        this.setData({ errorText: "订单详情加载失败，请检查服务器配置或网络。" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  goTrack() {
    wx.switchTab({ url: "/pages/track/index" });
  },

  goOrders() {
    wx.switchTab({ url: "/pages/orders/index" });
  },

  payAgain() {
    if (!this.data.order) return;
    this.setData({ paying: true });
    payOrder(this.data.order)
      .then(() => {
        wx.showToast({ title: "支付结果已更新", icon: "success" });
        this.loadOrder(this.data.order.id);
      })
      .catch(() => {
        wx.showToast({ title: "未完成支付，请稍后重试", icon: "none" });
      })
      .finally(() => {
        this.setData({ paying: false });
      });
  }
});
