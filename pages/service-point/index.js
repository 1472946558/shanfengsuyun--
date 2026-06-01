Page({
  data: {
    points: [
      { name: "深圳科技园服务点", distance: "1.2km", address: "南山区 科技园中区 18 号", tags: ["寄件", "自取", "打印面单"] },
      { name: "福田中心收派站", distance: "3.8km", address: "福田区 会展中心南侧", tags: ["寄件", "大件", "企业件"] },
      { name: "宝安机场分拨中心", distance: "18.6km", address: "宝安区 机场物流园", tags: ["中转", "冷链", "航空件"] }
    ]
  },

  callPoint() {
    wx.showToast({ title: "演示拨打网点电话", icon: "none" });
  }
});
