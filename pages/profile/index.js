const { getOrders } = require("../../utils/orderStore");
const { getProfile, clearProfile } = require("../../utils/userStore");

Page({
  data: {
    profile: getProfile(),
    displayName: "闪蜂会员",
    displaySubtitle: "请先配置你的寄件资料，用真实信息跑通演示流程。",
    accountButtonText: "登录 / 注册",
    stats: {
      orders: 0,
      coupons: 3,
      addresses: 2
    },
    menus: [
      { icon: "/assets/ui/pickup.png", title: "地址簿", desc: "管理寄件和收件地址", url: "/pages/address-book/index" },
      { icon: "/assets/ui/price.png", title: "运费时效", desc: "试算不同服务产品费用", url: "/pages/price-time/index" },
      { icon: "/assets/ui/support.png", title: "客服中心", desc: "异常件和售后工单", url: "/pages/customer-service/index" },
      { icon: "/assets/ui/enterprise.png", title: "企业寄件", desc: "预留月结、批量寄件、对账入口" }
    ]
  },

  onShow() {
    this.setTabBarIndex();
    const profile = getProfile();
    this.setData({
      profile,
      displayName: profile.loggedIn ? profile.name : "闪蜂会员",
      displaySubtitle: profile.loggedIn ? `${profile.company || "个人用户"} · ${profile.phone}` : "请先配置你的寄件资料，用真实信息跑通演示流程。",
      accountButtonText: profile.loggedIn ? "编辑资料" : "登录 / 注册",
      "stats.orders": getOrders().length
    });
  },

  setTabBarIndex() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
  },

  goAccount() {
    wx.navigateTo({ url: "/pages/account/index" });
  },

  logout() {
    clearProfile();
    wx.showToast({ title: "已退出登录", icon: "none" });
    const profile = getProfile();
    this.setData({
      profile,
      displayName: "闪蜂会员",
      displaySubtitle: "请先配置你的寄件资料，用真实信息跑通演示流程。",
      accountButtonText: "登录 / 注册"
    });
  },

  onMenuTap(event) {
    const title = event.currentTarget.dataset.title;
    const menu = this.data.menus.find((item) => item.title === title);
    if (menu && menu.url) {
      wx.navigateTo({ url: menu.url });
      return;
    }
    wx.showToast({
      title: `${title} 为演示入口`,
      icon: "none"
    });
  }
});
