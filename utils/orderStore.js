const STORAGE_KEY = "sfh_waybill_orders";
const { appConfig, request } = require("./apiClient");

const statusMap = {
  created: "待上门",
  accepted: "已安排取件",
  picked: "已揽收",
  transit: "运输中",
  delivering: "派送中",
  completed: "已签收"
};

const statusSteps = ["created", "accepted", "picked", "transit", "delivering", "completed"];

const serviceTypes = ["标快", "特快", "同城急送", "大件快运"];
const itemTypes = ["文件证件", "数码家电", "服饰日用", "生鲜冷链", "大件包裹", "其它物品"];
const weights = ["1kg以内", "1-3kg", "3-5kg", "5-10kg", "10kg以上"];

function nowText() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createWaybillNo() {
  return `SFH${Date.now()}`;
}

function getOrders() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

function saveOrders(orders) {
  wx.setStorageSync(STORAGE_KEY, orders);
}

function seedOrders() {
  const current = getOrders();
  if (current.length) return;
  saveOrders([
    {
      id: "SFH20260510001",
      waybillNo: "SFH20260510001",
      serviceType: "特快",
      fromAddress: "深圳市南山区 科技园 A 座",
      toAddress: "广州市天河区 珠江新城 B 塔",
      itemType: "文件证件",
      weight: "1kg以内",
      pickupTime: "今天 14:00-16:00",
      insuredValue: 1000,
      note: "重要合同，请当面签收",
      distance: "136.5km",
      price: 42,
      status: "transit",
      courierName: "陈师傅",
      courierPhone: "138****2026",
      createdAt: "2026-05-10 09:18",
      trackEvents: [
        { status: "created", title: "订单已创建", time: "2026-05-10 09:18", desc: "系统已接收寄件需求" },
        { status: "accepted", title: "已安排取件", time: "2026-05-10 09:25", desc: "附近收派员已接单" },
        { status: "picked", title: "已揽收", time: "2026-05-10 10:06", desc: "快件已完成揽收并进入转运流程" },
        { status: "transit", title: "运输中", time: "2026-05-10 13:42", desc: "快件正在前往目的地分拨中心" }
      ]
    }
  ]);
}

function estimatePrice(form) {
  const weightIndex = weights.indexOf(form.weight);
  const itemIndex = itemTypes.indexOf(form.itemType);
  const serviceIndex = serviceTypes.indexOf(form.serviceType);
  const base = 12;
  const serviceFee = Math.max(serviceIndex, 0) * 8;
  const weightFee = Math.max(weightIndex, 0) * 10;
  const coldFee = itemIndex === 3 ? 12 : 0;
  const largeFee = itemIndex === 4 ? 18 : 0;
  const addressLength = ((form.fromAddress || "").length + (form.toAddress || "").length) || 16;
  const distance = 8 + (addressLength % 11) * 12.5;
  const insuredFee = Math.ceil(Number(form.insuredValue || 0) / 1000) * 2;
  return {
    price: base + serviceFee + weightFee + coldFee + largeFee + insuredFee + Math.round(distance * 0.16),
    distance: `${distance.toFixed(1)}km`,
    eta: serviceIndex === 1 ? "次日达" : serviceIndex === 2 ? "2小时达" : serviceIndex === 3 ? "1-3天" : "隔日达"
  };
}

function buildTrackEvents(status) {
  const time = nowText();
  const events = [
    { status: "created", title: "订单已创建", time, desc: "系统已接收寄件需求" },
    { status: "accepted", title: "已安排取件", time, desc: "收派员将按预约时间上门" }
  ];
  if (statusSteps.indexOf(status) >= 2) {
    events.push({ status: "picked", title: "已揽收", time, desc: "快件已完成揽收" });
  }
  return events;
}

function createOrder(form) {
  const estimate = estimatePrice(form);
  const waybillNo = createWaybillNo();
  const order = {
    id: waybillNo,
    waybillNo,
    serviceType: form.serviceType,
    fromAddress: form.fromAddress,
    toAddress: form.toAddress,
    itemType: form.itemType,
    weight: form.weight,
    pickupTime: form.pickupTime,
    insuredValue: Number(form.insuredValue || 0),
    note: form.note,
    distance: estimate.distance,
    price: estimate.price,
    eta: estimate.eta,
    status: "accepted",
    courierName: "系统派单中",
    courierPhone: "待分配",
    createdAt: nowText(),
    trackEvents: buildTrackEvents("accepted")
  };
  const orders = [order].concat(getOrders());
  saveOrders(orders);
  return order;
}

function normalizeServerOrder(payload, form) {
  const data = (payload && payload.data ? payload.data : payload) || {};
  const source = form || {};
  const fallbackEstimate = estimatePrice(Object.assign({
    serviceType: "标快",
    itemType: "文件证件",
    weight: "1kg以内"
  }, source));
  const waybillNo = data.waybillNo || data.orderNo || data.id || source.waybillNo || createWaybillNo();
  return {
    id: data.id || waybillNo,
    waybillNo,
    serviceType: data.serviceType || source.serviceType || "标快",
    fromAddress: data.fromAddress || source.fromAddress || "",
    toAddress: data.toAddress || source.toAddress || "",
    itemType: data.itemType || source.itemType || "文件证件",
    weight: data.weight || source.weight || "1kg以内",
    pickupTime: data.pickupTime || source.pickupTime || "尽快上门",
    insuredValue: Number(data.insuredValue || source.insuredValue || 0),
    note: data.note || source.note || "",
    distance: data.distance || fallbackEstimate.distance,
    price: typeof data.price === "number" ? data.price : fallbackEstimate.price,
    eta: data.eta || fallbackEstimate.eta,
    status: data.status || "created",
    courierName: data.courierName || "等待派单",
    courierPhone: data.courierPhone || "待分配",
    createdAt: data.createdAt || nowText(),
    trackEvents: data.trackEvents || source.trackEvents || buildTrackEvents(data.status || "created")
  };
}

function normalizeServerOrders(payload) {
  const data = (payload && payload.data ? payload.data : payload) || {};
  const list = Array.isArray(data) ? data : (data.items || data.orders || []);
  return list.map((item) => normalizeServerOrder(item, item));
}

function cacheCreatedOrder(order) {
  const orders = [order].concat(getOrders().filter((item) => item.id !== order.id));
  saveOrders(orders);
  return order;
}

function createOrderOnline(form) {
  if (appConfig.mode === "mock") {
    return Promise.resolve(createOrder(form));
  }

  const clientEstimate = estimatePrice(form);
  return request({
    endpoint: appConfig.endpoints.createOrder,
    method: "POST",
    data: Object.assign({}, form, { clientEstimate })
  }).then((payload) => cacheCreatedOrder(normalizeServerOrder(payload, form)));
}

function listOrdersOnline() {
  if (appConfig.mode === "mock") {
    return Promise.resolve(getOrders());
  }

  return request({
    endpoint: appConfig.endpoints.listOrders
  }).then((payload) => {
    const orders = normalizeServerOrders(payload);
    saveOrders(orders);
    return orders;
  });
}

function getOrderById(id) {
  return getOrders().find((order) => order.id === id || order.waybillNo === id) || null;
}

function getOrderByIdOnline(id) {
  if (appConfig.mode === "mock") {
    return Promise.resolve(getOrderById(id));
  }

  return request({
    endpoint: appConfig.endpoints.orderDetail,
    params: { id }
  }).then((payload) => cacheCreatedOrder(normalizeServerOrder(payload, getOrderById(id) || {})));
}

function getLatestOrder() {
  const orders = getOrders();
  return orders[0] || null;
}

function getLatestOrderOnline() {
  if (appConfig.mode === "mock") {
    return Promise.resolve(getLatestOrder());
  }

  return listOrdersOnline().then((orders) => orders[0] || null);
}

function queryWaybill(waybillNo) {
  const normalized = String(waybillNo || "").trim();
  if (!normalized) return Promise.resolve(null);

  if (appConfig.mode === "mock") {
    const existing = getOrderById(normalized);
    if (existing) return Promise.resolve(existing);
    return Promise.resolve(normalizeServerOrder({
      waybillNo: normalized,
      serviceType: "标快",
      fromAddress: "深圳市 宝安分拨中心",
      toAddress: "目的地网点",
      itemType: "包裹",
      weight: "1kg以内",
      status: "transit",
      courierName: "暂未分配",
      courierPhone: "待分配",
      trackEvents: [
        { status: "created", title: "已录入运单", time: nowText(), desc: "模拟查询：已生成快件记录" },
        { status: "transit", title: "运输中", time: nowText(), desc: "模拟查询：快件正在运输中" }
      ]
    }, {}));
  }

  return request({
    endpoint: appConfig.endpoints.waybillTrack,
    params: { waybillNo: normalized }
  }).then((payload) => normalizeServerOrder(payload, { waybillNo: normalized }));
}

function getOrderTrackOnline(order) {
  if (!order || appConfig.mode === "mock") {
    return Promise.resolve(order);
  }

  return request({
    endpoint: appConfig.endpoints.orderTrack,
    params: { id: order.id }
  }).then((payload) => {
    const data = (payload && payload.data ? payload.data : payload) || {};
    const trackOrder = data.order || data;
    return cacheCreatedOrder(normalizeServerOrder(Object.assign({}, order, trackOrder), order));
  });
}

module.exports = {
  statusMap,
  statusSteps,
  serviceTypes,
  itemTypes,
  weights,
  seedOrders,
  getOrders,
  saveOrders,
  estimatePrice,
  createOrder,
  createOrderOnline,
  listOrdersOnline,
  getOrderById,
  getOrderByIdOnline,
  getLatestOrder,
  getLatestOrderOnline,
  getOrderTrackOnline,
  queryWaybill
};
