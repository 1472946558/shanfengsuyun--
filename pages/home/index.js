const { estimatePrice } = require("../../utils/orderStore");

Page({
  data: {
    fromAddress: "深圳市 南山区 科技园",
    toAddress: "广州市 天河区 珠江新城",
    estimate: {
      price: 42,
      distance: "136.5km",
      eta: "次日达"
    },
    metrics: [
      { value: "10min", label: "预约响应" },
      { value: "6类", label: "寄件场景" },
      { value: "24h", label: "轨迹查询" }
    ],
    scenes: [
      { icon: "/assets/ui/document.png", name: "文件证件", desc: "合同票据" },
      { icon: "/assets/ui/device.png", name: "数码家电", desc: "防震保护" },
      { icon: "/assets/ui/cold.png", name: "生鲜冷链", desc: "温控配送" },
      { icon: "/assets/ui/enterprise.png", name: "大件包裹", desc: "上门揽收" }
    ],
    tools: [
      { icon: "/assets/ui/price.png", name: "运费时效", url: "/pages/price-time/index" },
      { icon: "/assets/ui/route.png", name: "查快递", action: "track" },
      { icon: "/assets/ui/pickup.png", name: "服务网点", url: "/pages/service-point/index" },
      { icon: "/assets/ui/list.png", name: "地址簿", url: "/pages/address-book/index" }
    ],
    promises: [
      { icon: "/assets/ui/clock.png", title: "时效可预估", desc: "寄件前展示预计送达和费用区间", code: "01" },
      { icon: "/assets/ui/route.png", title: "轨迹可追踪", desc: "揽收、运输、派送、签收全链路可见", code: "02" },
      { icon: "/assets/ui/shield.png", title: "保价和售后", desc: "预留保价、异常件、客服工单能力", code: "03" },
      { icon: "/assets/ui/api.png", title: "企业可接入", desc: "RESTful API 支持客户服务器对接", code: "04" }
    ],
    flow: [
      { icon: "/assets/ui/pickup.png", name: "填地址" },
      { icon: "/assets/ui/clock.png", name: "约上门" },
      { icon: "/assets/ui/price.png", name: "算费用" },
      { icon: "/assets/ui/route.png", name: "查轨迹" }
    ]
  },

  onShow() {
    this.setTabBarIndex();
    this.refreshEstimate();
  },

  setTabBarIndex() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onFromInput(event) {
    this.setData({ fromAddress: event.detail.value }, () => this.refreshEstimate());
  },

  onToInput(event) {
    this.setData({ toAddress: event.detail.value }, () => this.refreshEstimate());
  },

  refreshEstimate() {
    const result = estimatePrice({
      fromAddress: this.data.fromAddress,
      toAddress: this.data.toAddress,
      serviceType: "特快",
      itemType: "文件证件",
      weight: "1kg以内",
      insuredValue: 0
    });
    this.setData({
      estimate: {
        price: result.price,
        distance: result.distance,
        eta: result.eta
      }
    });
  },

  chooseScene(event) {
    wx.setStorageSync("sfh_pending_order_form", {
      itemType: event.currentTarget.dataset.name
    });
    wx.switchTab({ url: "/pages/order/index" });
  },

  goOrder() {
    wx.switchTab({ url: "/pages/order/index" });
  },

  goTrack() {
    wx.switchTab({ url: "/pages/track/index" });
  },

  goTool(event) {
    const item = this.data.tools[event.currentTarget.dataset.index];
    if (item.action === "track") {
      this.goTrack();
      return;
    }
    wx.navigateTo({ url: item.url });
  },

  goOrderWithAddress() {
    wx.setStorageSync("sfh_pending_order_form", {
      fromAddress: this.data.fromAddress,
      toAddress: this.data.toAddress
    });
    wx.switchTab({ url: "/pages/order/index" });
  },

  callService() {
    wx.navigateTo({ url: "/pages/customer-service/index" });
  }
});
