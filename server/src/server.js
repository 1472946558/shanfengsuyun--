const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const TENANT_ID = process.env.TENANT_ID || "shanfeng-demo";
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";
const DOUYIN_APP_ID = process.env.DOUYIN_APP_ID || "";
const DOUYIN_APP_SECRET = process.env.DOUYIN_APP_SECRET || "";
const DOUYIN_CODE2SESSION_URL = process.env.DOUYIN_CODE2SESSION_URL || "https://developer.toutiao.com/api/apps/v2/jscode2session";

const statusSteps = ["created", "accepted", "picked", "transit", "delivering", "completed"];
const serviceTypes = ["标快", "特快", "同城急送", "大件快运"];
const itemTypes = ["文件证件", "数码家电", "服饰日用", "生鲜冷链", "大件包裹", "其它物品"];
const weights = ["1kg以内", "1-3kg", "3-5kg", "5-10kg", "10kg以上"];

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) writeJson(ORDERS_FILE, seedOrders());
  if (!fs.existsSync(TICKETS_FILE)) writeJson(TICKETS_FILE, []);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function nowText() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createWaybillNo() {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `SFH${Date.now()}${suffix}`;
}

function createToken(payload) {
  const principal = payload.openid || payload.anonymous_openid || payload.userId || "guest";
  const raw = `${principal}:${Date.now()}:${crypto.randomBytes(12).toString("hex")}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function douyinCode2Session(body) {
  if (!DOUYIN_APP_ID || !DOUYIN_APP_SECRET) {
    const error = new Error("Douyin AppID/AppSecret is not configured on server");
    error.statusCode = 500;
    throw error;
  }

  if (!body.code && !body.anonymous_code) {
    const error = new Error("Missing Douyin login code");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(DOUYIN_CODE2SESSION_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      appid: DOUYIN_APP_ID,
      secret: DOUYIN_APP_SECRET,
      code: body.code,
      anonymous_code: body.anonymous_code
    })
  });
  const payload = await response.json();
  const errNo = payload.err_no ?? payload.errcode ?? payload.error;

  if (!response.ok || (errNo !== undefined && Number(errNo) !== 0)) {
    const error = new Error(payload.err_tips || payload.errmsg || payload.message || "Douyin code2Session failed");
    error.statusCode = 502;
    throw error;
  }

  return payload.data || payload;
}

function estimatePrice(form = {}) {
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

function buildTrackEvents(status = "accepted") {
  const time = nowText();
  const events = [
    { status: "created", title: "订单已创建", time, desc: "系统已接收寄件需求" },
    { status: "accepted", title: "已安排取件", time, desc: "收派员将按预约时间上门" }
  ];
  if (statusSteps.indexOf(status) >= 2) {
    events.push({ status: "picked", title: "已揽收", time, desc: "快件已完成揽收" });
  }
  if (statusSteps.indexOf(status) >= 3) {
    events.push({ status: "transit", title: "运输中", time, desc: "快件正在前往目的地分拨中心" });
  }
  return events;
}

function seedOrders() {
  return [
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
      eta: "次日达",
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
  ];
}

function getOrders() {
  ensureDataFiles();
  return readJson(ORDERS_FILE, []);
}

function saveOrders(orders) {
  ensureDataFiles();
  writeJson(ORDERS_FILE, orders);
}

function jsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-tenant-id"
  });
  res.end(JSON.stringify(body));
}

function ok(res, data, message = "ok") {
  jsonResponse(res, 200, { code: 0, message, data });
}

function fail(res, statusCode, message, code = statusCode) {
  jsonResponse(res, statusCode, { code, message, data: null });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function requireTenant(req, res) {
  const tenant = req.headers["x-tenant-id"];
  if (!tenant || tenant === TENANT_ID) return true;
  fail(res, 403, "Invalid tenant");
  return false;
}

function createOrder(form) {
  const estimate = estimatePrice(form);
  const waybillNo = createWaybillNo();
  return {
    id: waybillNo,
    waybillNo,
    serviceType: form.serviceType || "标快",
    fromAddress: form.fromAddress || "",
    toAddress: form.toAddress || "",
    itemType: form.itemType || "文件证件",
    weight: form.weight || "1kg以内",
    pickupTime: form.pickupTime || "尽快上门",
    insuredValue: Number(form.insuredValue || 0),
    note: form.note || "",
    distance: estimate.distance,
    price: estimate.price,
    eta: estimate.eta,
    status: "accepted",
    courierName: "系统派单中",
    courierPhone: "待分配",
    createdAt: nowText(),
    trackEvents: buildTrackEvents("accepted")
  };
}

function addresses() {
  return [
    { name: "公司前台", phone: "13800002026", address: "深圳市南山区 科技园 A 座", type: "from" },
    { name: "广州客户", phone: "13900002026", address: "广州市天河区 珠江新城 B 塔", type: "to" },
    { name: "仓库", phone: "13700002026", address: "深圳市宝安区 航城仓储中心", type: "from" }
  ];
}

function servicePoints() {
  return [
    { name: "南山科技园营业点", address: "深圳市南山区 科技园中区", phone: "0755-88882026", tags: ["可寄件", "可自提", "企业件"] },
    { name: "宝安航城服务点", address: "深圳市宝安区 航城大道 88 号", phone: "0755-66662026", tags: ["大件", "冷链", "晚间揽收"] }
  ];
}

async function handle(req, res) {
  if (req.method === "OPTIONS") {
    jsonResponse(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  if (pathname === "/health") {
    ok(res, { service: "shanfeng-express-server", status: "ok", time: new Date().toISOString() });
    return;
  }

  if (!pathname.startsWith("/api/v1/")) {
    fail(res, 404, "Not found");
    return;
  }

  if (!requireTenant(req, res)) return;

  if (pathname === "/api/v1/auth/wechat-login") {
    const body = await parseBody(req);
    const profile = body.profile || {};
    ok(res, {
      userId: profile.id || `U${Date.now()}`,
      token: crypto.randomBytes(16).toString("hex"),
      profile
    });
    return;
  }

  if (pathname === "/api/v1/auth/douyin-login") {
    const body = await parseBody(req);
    const profile = body.profile || {};
    try {
      const session = await douyinCode2Session(body);
      const userId = session.openid || session.anonymous_openid || profile.id || `U${Date.now()}`;
      ok(res, {
        userId,
        openid: session.openid || "",
        anonymousOpenid: session.anonymous_openid || "",
        unionid: session.unionid || "",
        token: createToken({ userId, openid: session.openid, anonymous_openid: session.anonymous_openid }),
        profile
      });
    } catch (error) {
      fail(res, error.statusCode || 500, error.message || "Douyin login failed");
    }
    return;
  }

  if (pathname === "/api/v1/pricing/estimate" && req.method === "POST") {
    ok(res, estimatePrice(await parseBody(req)));
    return;
  }

  if (pathname === "/api/v1/orders" && req.method === "GET") {
    ok(res, { items: getOrders() });
    return;
  }

  if (pathname === "/api/v1/orders" && req.method === "POST") {
    const order = createOrder(await parseBody(req));
    const orders = [order].concat(getOrders());
    saveOrders(orders);
    ok(res, order, "created");
    return;
  }

  const orderDetailMatch = pathname.match(/^\/api\/v1\/orders\/([^/]+)$/);
  if (orderDetailMatch && req.method === "GET") {
    const id = decodeURIComponent(orderDetailMatch[1]);
    const order = getOrders().find((item) => item.id === id || item.waybillNo === id);
    if (!order) {
      fail(res, 404, "Order not found");
      return;
    }
    ok(res, order);
    return;
  }

  const orderTrackMatch = pathname.match(/^\/api\/v1\/orders\/([^/]+)\/track$/);
  if (orderTrackMatch && req.method === "GET") {
    const id = decodeURIComponent(orderTrackMatch[1]);
    const order = getOrders().find((item) => item.id === id || item.waybillNo === id);
    if (!order) {
      fail(res, 404, "Order not found");
      return;
    }
    ok(res, order);
    return;
  }

  const waybillTrackMatch = pathname.match(/^\/api\/v1\/waybills\/([^/]+)\/track$/);
  if (waybillTrackMatch && req.method === "GET") {
    const waybillNo = decodeURIComponent(waybillTrackMatch[1]);
    const order = getOrders().find((item) => item.waybillNo === waybillNo || item.id === waybillNo);
    ok(res, order || {
      id: waybillNo,
      waybillNo,
      serviceType: "标快",
      fromAddress: "深圳市 宝安分拨中心",
      toAddress: "目的地网点",
      itemType: "其它物品",
      weight: "1kg以内",
      status: "transit",
      courierName: "暂未分配",
      courierPhone: "待分配",
      trackEvents: buildTrackEvents("transit")
    });
    return;
  }

  if (pathname === "/api/v1/addresses" && req.method === "GET") {
    ok(res, addresses());
    return;
  }

  if (pathname === "/api/v1/service-points" && req.method === "GET") {
    ok(res, servicePoints());
    return;
  }

  if (pathname === "/api/v1/service-tickets" && req.method === "POST") {
    const body = await parseBody(req);
    const ticket = {
      id: `T${Date.now()}`,
      title: body.title || body.category || "客服工单",
      status: "created",
      createdAt: nowText()
    };
    const tickets = [ticket].concat(readJson(TICKETS_FILE, []));
    writeJson(TICKETS_FILE, tickets);
    ok(res, ticket, "created");
    return;
  }

  fail(res, 404, "Not found");
}

ensureDataFiles();

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error("[SERVER_ERROR]", error);
    fail(res, 500, "Internal server error", 500);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Shanfeng Express API listening on http://${HOST}:${PORT}`);
});
