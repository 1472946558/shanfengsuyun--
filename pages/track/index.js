const { getLatestOrderOnline, getOrderTrackOnline, queryWaybill, statusMap, statusSteps } = require("../../utils/orderStore");

Page({
  data: {
    queryNo: "",
    order: null,
    statusText: "",
    steps: [],
    loading: false,
    errorText: ""
  },

  onShow() {
    this.setTabBarIndex();
    this.loadOrder();
  },

  setTabBarIndex() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onQueryInput(event) {
    this.setData({ queryNo: event.detail.value });
  },

  searchWaybill() {
    if (!this.data.queryNo) {
      wx.showToast({ title: "请输入运单号", icon: "none" });
      return;
    }
    this.setData({ loading: true, errorText: "" });
    queryWaybill(this.data.queryNo)
      .then((order) => {
        if (!order) {
          this.setData({ order: null, steps: [], errorText: "未查询到该运单。" });
          return;
        }
        this.applyOrder(order);
      })
      .catch(() => {
        this.setData({ errorText: "运单查询失败，请检查服务器配置或网络。" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  loadOrder() {
    this.setData({ loading: true, errorText: "" });
    getLatestOrderOnline()
      .then((order) => {
        if (!order) {
          this.setData({ order: null, steps: [] });
          return;
        }
        return getOrderTrackOnline(order).then((trackOrder) => {
          this.applyOrder(trackOrder || order);
        });
      })
      .catch(() => {
        this.setData({ errorText: "查件加载失败，请检查服务器配置或网络。" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  applyOrder(order) {
    const currentIndex = statusSteps.indexOf(order.status);
    const titles = {
      created: "订单已创建",
      accepted: "已安排取件",
      picked: "已揽收",
      transit: "运输中",
      delivering: "派送中",
      completed: "已签收"
    };
    const descs = {
      created: "系统已接收寄件需求",
      accepted: "收派员将按预约时间上门",
      picked: "快件已揽收并进入转运流程",
      transit: "快件正在前往目的地分拨中心",
      delivering: "快件正在派送，请保持电话畅通",
      completed: "快件已签收，服务完成"
    };
    const serverEvents = order.trackEvents || [];
    this.setData({
      queryNo: order.waybillNo,
      order,
      statusText: statusMap[order.status],
      steps: statusSteps.map((key, index) => {
        const event = serverEvents.find((item) => item.status === key) || {};
        return {
          key,
          title: event.title || titles[key],
          desc: event.desc || descs[key],
          time: event.time || "",
          done: index <= currentIndex
        };
      })
    });
  },

  callCourier() {
    wx.showToast({ title: "演示联系收派员", icon: "none" });
  },

  goOrder() {
    wx.switchTab({ url: "/pages/order/index" });
  }
});
