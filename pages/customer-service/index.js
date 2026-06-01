Page({
  data: {
    tickets: [
      { icon: "/assets/ui/route.png", title: "轨迹异常", desc: "快件长时间未更新或位置异常" },
      { icon: "/assets/ui/shield.png", title: "保价理赔", desc: "损坏、丢失、延误等售后处理" },
      { icon: "/assets/ui/phone.png", title: "联系收派员", desc: "取件、派送、改约时间咨询" },
      { icon: "/assets/ui/enterprise.png", title: "企业服务", desc: "月结、对账、批量寄件接入" }
    ]
  },

  createTicket(event) {
    wx.showToast({
      title: `${event.currentTarget.dataset.title} 工单已模拟创建`,
      icon: "none"
    });
  }
});
