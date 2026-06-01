const { getProfile } = require("../../utils/userStore");

Page({
  data: {
    addresses: []
  },

  onShow() {
    const profile = getProfile();
    const addresses = [
      { type: "寄件", name: profile.name || "廖先生", phone: profile.phone || "13800002026", address: profile.defaultFromAddress || "深圳市南山区 科技园 A 座" },
      { type: "收件", name: "王女士", phone: "13900002026", address: profile.defaultToAddress || "广州市天河区 珠江新城 B 塔" },
      { type: "企业", name: "闪蜂测试公司", phone: "0755-20262026", address: "深圳市福田区 会展中心 C 座" }
    ];
    this.setData({ addresses });
  },

  useAddress(event) {
    const item = this.data.addresses[event.currentTarget.dataset.index];
    const pending = item.type === "寄件" ? { fromAddress: item.address } : { toAddress: item.address };
    wx.setStorageSync("sfh_pending_order_form", pending);
    wx.switchTab({ url: "/pages/order/index" });
  }
});
