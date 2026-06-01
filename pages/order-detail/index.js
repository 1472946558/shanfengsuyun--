const { getOrderByIdOnline, statusMap } = require("../../utils/orderStore");

Page({
  data: {
    order: null,
    statusText: "",
    loading: true,
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
          statusText: order ? statusMap[order.status] : ""
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
  }
});
