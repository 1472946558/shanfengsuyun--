const { listOrdersOnline, statusMap } = require("../../utils/orderStore");

Page({
  data: {
    orders: [],
    loading: false,
    errorText: ""
  },

  onShow() {
    this.setTabBarIndex();
    this.loadOrders();
  },

  setTabBarIndex() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/order-detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  loadOrders() {
    this.setData({ loading: true, errorText: "" });
    listOrdersOnline()
      .then((orders) => {
        this.setData({
          orders: orders.map((order) => Object.assign({}, order, {
            statusText: statusMap[order.status] || "处理中"
          }))
        });
      })
      .catch(() => {
        this.setData({ errorText: "订单列表加载失败，请检查服务器配置或网络。" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  goOrder() {
    wx.switchTab({ url: "/pages/order/index" });
  }
});
