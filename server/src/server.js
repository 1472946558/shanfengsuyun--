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

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";
const WECHAT_CODE2SESSION_URL = process.env.WECHAT_CODE2SESSION_URL || "https://api.weixin.qq.com/sns/jscode2session";
const WECHAT_PAY_PROVIDER = process.env.WECHAT_PAY_PROVIDER || "mock";
const WECHAT_PAY_MCH_ID = process.env.WECHAT_PAY_MCH_ID || "";
const WECHAT_PAY_NOTIFY_URL = process.env.WECHAT_PAY_NOTIFY_URL || "";
const WECHAT_PAY_PRIVATE_KEY_PATH = process.env.WECHAT_PAY_PRIVATE_KEY_PATH || "";
const WECHAT_PAY_MCH_SERIAL_NO = process.env.WECHAT_PAY_MCH_SERIAL_NO || "";
const WECHAT_PAY_API_V3_KEY = process.env.WECHAT_PAY_API_V3_KEY || "";
const WECHAT_PAY_PLATFORM_CERT_PATH = process.env.WECHAT_PAY_PLATFORM_CERT_PATH || "";
const WECHAT_PAY_REFUND_NOTIFY_URL = process.env.WECHAT_PAY_REFUND_NOTIFY_URL || "";
const WECHAT_PAY_SKIP_NOTIFY_VERIFY = process.env.WECHAT_PAY_SKIP_NOTIFY_VERIFY === "true";
const WECHAT_PAY_BASE_URL = process.env.WECHAT_PAY_BASE_URL || "https://api.mch.weixin.qq.com";

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

function readTextFile(file) {
  if (!file || !fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8");
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

function createOutTradeNo() {
  return `SFHPAY${Date.now()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function createOutRefundNo() {
  return `SFHREF${Date.now()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function createToken(payload) {
  const principal = payload.openid || payload.anonymous_openid || payload.userId || "guest";
  const raw = `${principal}:${Date.now()}:${crypto.randomBytes(12).toString("hex")}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function withPaymentDefaults(order = {}) {
  const next = Object.assign({
    paymentAmountFen: 0,
    payProvider: "none",
    payStatus: "unpaid",
    paymentRequired: true,
    outTradeNo: "",
    prepayId: "",
    transactionId: "",
    paidAt: "",
    paymentAttemptedAt: "",
    refundStatus: "none",
    outRefundNo: "",
    refundId: "",
    refundAmountFen: 0,
    refundedAt: "",
    notifyPayloadDigest: ""
  }, order);

  if (!next.paymentAmountFen && typeof next.price === "number") {
    next.paymentAmountFen = Math.round(next.price * 100);
  }

  return next;
}

async function douyinCode2Session(body) {
  if (!DOUYIN_APP_ID || !DOUYIN_APP_SECRET) {
    throw createHttpError(500, "Douyin AppID/AppSecret is not configured on server");
  }

  if (!body.code && !body.anonymous_code) {
    throw createHttpError(400, "Missing Douyin login code");
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
    throw createHttpError(502, payload.err_tips || payload.errmsg || payload.message || "Douyin code2Session failed");
  }

  return payload.data || payload;
}

async function wechatCode2Session(code) {
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
    throw createHttpError(500, "WeChat AppID/AppSecret is not configured on server");
  }
  if (!code) {
    throw createHttpError(400, "Missing WeChat login code");
  }

  const url = new URL(WECHAT_CODE2SESSION_URL);
  url.searchParams.set("appid", WECHAT_APP_ID);
  url.searchParams.set("secret", WECHAT_APP_SECRET);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || payload.errcode) {
    throw createHttpError(502, payload.errmsg || "WeChat code2Session failed");
  }
  return payload;
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
    withPaymentDefaults({
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
    })
  ];
}

function getOrders() {
  ensureDataFiles();
  return readJson(ORDERS_FILE, []).map((order) => withPaymentDefaults(order));
}

function saveOrders(orders) {
  ensureDataFiles();
  writeJson(ORDERS_FILE, (orders || []).map((order) => withPaymentDefaults(order)));
}

function findOrder(orderId) {
  return getOrders().find((item) => item.id === orderId || item.waybillNo === orderId || item.outTradeNo === orderId) || null;
}

function updateOrder(orderId, patch) {
  const orders = getOrders();
  const index = orders.findIndex((item) => item.id === orderId || item.waybillNo === orderId || item.outTradeNo === orderId);
  if (index === -1) {
    return null;
  }
  const nextOrder = withPaymentDefaults(Object.assign({}, orders[index], patch));
  orders[index] = nextOrder;
  saveOrders(orders);
  return nextOrder;
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

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(createHttpError(413, "Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
  });
}

async function parseBody(req) {
  const raw = await parseRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw createHttpError(400, "Invalid JSON payload");
  }
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
  return withPaymentDefaults({
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
  });
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

function ensureWechatPayConfig() {
  if (WECHAT_PAY_PROVIDER !== "wechatpay") {
    return;
  }
  const missing = [];
  if (!WECHAT_APP_ID) missing.push("WECHAT_APP_ID");
  if (!WECHAT_PAY_MCH_ID) missing.push("WECHAT_PAY_MCH_ID");
  if (!WECHAT_PAY_NOTIFY_URL) missing.push("WECHAT_PAY_NOTIFY_URL");
  if (!WECHAT_PAY_PRIVATE_KEY_PATH) missing.push("WECHAT_PAY_PRIVATE_KEY_PATH");
  if (!WECHAT_PAY_MCH_SERIAL_NO) missing.push("WECHAT_PAY_MCH_SERIAL_NO");
  if (!WECHAT_PAY_API_V3_KEY) missing.push("WECHAT_PAY_API_V3_KEY");
  if (missing.length) {
    throw createHttpError(500, `Missing WeChat Pay config: ${missing.join(", ")}`);
  }
}

function signWechatMessage(message) {
  const privateKeyPem = readTextFile(WECHAT_PAY_PRIVATE_KEY_PATH);
  if (!privateKeyPem) {
    throw createHttpError(500, "WeChat Pay private key file is missing");
  }
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

function buildWechatAuthorization(method, urlPathWithQuery, bodyText) {
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const message = `${method}\n${urlPathWithQuery}\n${timestamp}\n${nonceStr}\n${bodyText}\n`;
  const signature = signWechatMessage(message);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_MCH_ID}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${WECHAT_PAY_MCH_SERIAL_NO}",signature="${signature}"`;
}

async function callWechatApi(method, pathname, body) {
  ensureWechatPayConfig();
  const bodyText = body ? JSON.stringify(body) : "";
  const url = new URL(pathname, WECHAT_PAY_BASE_URL);
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: buildWechatAuthorization(method, url.pathname + url.search, bodyText)
    },
    body: bodyText || undefined
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw createHttpError(502, payload.message || payload.code || "WeChat Pay API request failed");
  }
  return payload;
}

async function createWechatPrepay(order, openid, description) {
  if (!openid) {
    throw createHttpError(400, "Missing WeChat openid for payment");
  }

  const outTradeNo = order.outTradeNo || createOutTradeNo();
  const payload = await callWechatApi("POST", "/v3/pay/transactions/jsapi", {
    appid: WECHAT_APP_ID,
    mchid: WECHAT_PAY_MCH_ID,
    description: description || `闪蜂速运-${order.serviceType || "寄件服务"}`,
    out_trade_no: outTradeNo,
    notify_url: WECHAT_PAY_NOTIFY_URL,
    amount: {
      total: order.paymentAmountFen || Math.round(Number(order.price || 0) * 100),
      currency: "CNY"
    },
    payer: {
      openid
    }
  });
  return {
    outTradeNo,
    prepayId: payload.prepay_id || ""
  };
}

function buildWechatMiniProgramPayParams(prepayId) {
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const pkg = `prepay_id=${prepayId}`;
  const signType = "RSA";
  const message = `${WECHAT_APP_ID}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  return {
    timeStamp,
    nonceStr,
    package: pkg,
    signType,
    paySign: signWechatMessage(message)
  };
}

async function queryWechatPaymentByOutTradeNo(outTradeNo) {
  return callWechatApi("GET", `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(WECHAT_PAY_MCH_ID)}`);
}

async function createWechatRefund(order, body) {
  const refundAmountFen = Number(body.refundAmountFen || order.paymentAmountFen || Math.round(Number(order.price || 0) * 100));
  const outRefundNo = body.outRefundNo || order.outRefundNo || createOutRefundNo();
  const payload = {
    out_trade_no: order.outTradeNo,
    out_refund_no: outRefundNo,
    reason: body.reason || "用户申请退款",
    notify_url: WECHAT_PAY_REFUND_NOTIFY_URL || WECHAT_PAY_NOTIFY_URL,
    amount: {
      refund: refundAmountFen,
      total: order.paymentAmountFen || Math.round(Number(order.price || 0) * 100),
      currency: "CNY"
    }
  };
  return callWechatApi("POST", "/v3/refund/domestic/refunds", payload);
}

function verifyWechatNotify(rawBody, headers) {
  if (WECHAT_PAY_SKIP_NOTIFY_VERIFY) {
    return true;
  }
  const certPem = readTextFile(WECHAT_PAY_PLATFORM_CERT_PATH);
  if (!certPem) {
    throw createHttpError(500, "WeChat Pay platform certificate is missing");
  }
  const message = `${headers["wechatpay-timestamp"] || ""}\n${headers["wechatpay-nonce"] || ""}\n${rawBody}\n`;
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(message);
  verifier.end();
  const valid = verifier.verify(certPem, headers["wechatpay-signature"] || "", "base64");
  if (!valid) {
    throw createHttpError(401, "Invalid WeChat Pay callback signature");
  }
  return true;
}

function decryptWechatNotifyResource(resource) {
  if (!WECHAT_PAY_API_V3_KEY) {
    throw createHttpError(500, "Missing WeChat APIv3 key for callback decryption");
  }
  const nonce = Buffer.from(resource.nonce, "utf8");
  const aad = Buffer.from(resource.associated_data || "", "utf8");
  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  const data = ciphertext.subarray(0, ciphertext.length - 16);
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(WECHAT_PAY_API_V3_KEY, "utf8"), nonce);
  decipher.setAuthTag(authTag);
  if (aad.length) {
    decipher.setAAD(aad);
  }
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted);
}

function mapWechatTradeState(tradeState) {
  if (tradeState === "SUCCESS") return "paid";
  if (tradeState === "NOTPAY" || tradeState === "USERPAYING") return "pending";
  if (tradeState === "REFUND") return "refunded";
  if (tradeState === "CLOSED" || tradeState === "REVOKED") return "closed";
  return "failed";
}

function mapWechatRefundStatus(status) {
  if (status === "SUCCESS") return "success";
  if (status === "PROCESSING") return "processing";
  if (status === "ABNORMAL") return "abnormal";
  if (status === "CLOSED") return "closed";
  return "unknown";
}

async function handleWechatNotify(req, res) {
  const rawBody = await parseRawBody(req);
  verifyWechatNotify(rawBody, req.headers);
  const payload = rawBody ? JSON.parse(rawBody) : {};
  const decrypted = decryptWechatNotifyResource(payload.resource || {});
  const outTradeNo = decrypted.out_trade_no;
  const tradeState = decrypted.trade_state || "";
  const order = outTradeNo ? findOrder(outTradeNo) : null;

  if (order) {
    updateOrder(order.id, {
      payProvider: "wechatpay",
      payStatus: mapWechatTradeState(tradeState),
      transactionId: decrypted.transaction_id || order.transactionId || "",
      paidAt: tradeState === "SUCCESS" ? (decrypted.success_time || nowText()) : order.paidAt || "",
      notifyPayloadDigest: sha256(rawBody)
    });
  }

  jsonResponse(res, 200, { code: "SUCCESS", message: "成功" });
}

async function handleWechatPrepay(req, res) {
  const body = await parseBody(req);
  const order = findOrder(body.orderId);
  if (!order) {
    fail(res, 404, "Order not found");
    return;
  }

  if (order.payStatus === "paid") {
    ok(res, { provider: order.payProvider, paid: true, order });
    return;
  }

  if (WECHAT_PAY_PROVIDER === "mock") {
    const nextOrder = updateOrder(order.id, {
      payProvider: "mock",
      payStatus: "paid",
      transactionId: order.transactionId || `MOCK${Date.now()}`,
      paidAt: nowText(),
      paymentAttemptedAt: nowText(),
      outTradeNo: order.outTradeNo || createOutTradeNo()
    });
    ok(res, { provider: "mock", mock: true, paid: true, order: nextOrder }, "mock-paid");
    return;
  }

  try {
    const prepay = await createWechatPrepay(order, body.openid, body.description);
    const nextOrder = updateOrder(order.id, {
      payProvider: "wechatpay",
      payStatus: "pending",
      outTradeNo: prepay.outTradeNo,
      prepayId: prepay.prepayId,
      paymentAttemptedAt: nowText()
    });
    ok(res, {
      provider: "wechatpay",
      paid: false,
      orderId: order.id,
      payParams: buildWechatMiniProgramPayParams(prepay.prepayId),
      order: nextOrder
    }, "prepay-created");
  } catch (error) {
    fail(res, error.statusCode || 500, error.message || "WeChat prepay failed");
  }
}

async function handlePaymentStatus(req, res, orderId) {
  const order = findOrder(orderId);
  if (!order) {
    fail(res, 404, "Order not found");
    return;
  }

  let nextOrder = order;
  if (WECHAT_PAY_PROVIDER === "wechatpay" && order.outTradeNo && order.payStatus !== "paid") {
    try {
      const remote = await queryWechatPaymentByOutTradeNo(order.outTradeNo);
      nextOrder = updateOrder(order.id, {
        payProvider: "wechatpay",
        payStatus: mapWechatTradeState(remote.trade_state || ""),
        transactionId: remote.transaction_id || order.transactionId || "",
        paidAt: remote.trade_state === "SUCCESS" ? (remote.success_time || order.paidAt || nowText()) : order.paidAt || ""
      }) || order;
    } catch (error) {
      ok(res, {
        orderId: order.id,
        payStatus: order.payStatus,
        provider: order.payProvider,
        remoteError: error.message,
        order
      });
      return;
    }
  }

  ok(res, {
    orderId: nextOrder.id,
    payStatus: nextOrder.payStatus,
    provider: nextOrder.payProvider,
    transactionId: nextOrder.transactionId,
    paidAt: nextOrder.paidAt,
    order: nextOrder
  });
}

async function handleRefund(req, res) {
  const body = await parseBody(req);
  const order = findOrder(body.orderId);
  if (!order) {
    fail(res, 404, "Order not found");
    return;
  }

  if (!order.outTradeNo && WECHAT_PAY_PROVIDER !== "mock") {
    fail(res, 409, "Order has no WeChat payment trade number");
    return;
  }

  if (order.payStatus !== "paid" && order.payStatus !== "refunded") {
    fail(res, 409, "Order is not in paid status");
    return;
  }

  if (order.refundStatus === "success" || order.refundStatus === "processing") {
    ok(res, {
      orderId: order.id,
      refundStatus: order.refundStatus,
      order
    }, "refund-already-created");
    return;
  }

  const refundAmountFen = Number(body.refundAmountFen || order.paymentAmountFen || 0);
  if (!refundAmountFen || refundAmountFen < 1) {
    fail(res, 400, "Invalid refund amount");
    return;
  }

  if (WECHAT_PAY_PROVIDER === "mock") {
    const nextOrder = updateOrder(order.id, {
      refundStatus: "success",
      outRefundNo: order.outRefundNo || createOutRefundNo(),
      refundId: order.refundId || `MOCKREF${Date.now()}`,
      refundAmountFen,
      refundedAt: nowText(),
      payStatus: "refunded"
    });
    ok(res, {
      provider: "mock",
      refunded: true,
      orderId: order.id,
      refundStatus: nextOrder.refundStatus,
      order: nextOrder
    }, "mock-refunded");
    return;
  }

  try {
    const refund = await createWechatRefund(order, body);
    const nextOrder = updateOrder(order.id, {
      refundStatus: mapWechatRefundStatus(refund.status || ""),
      outRefundNo: refund.out_refund_no || order.outRefundNo || "",
      refundId: refund.refund_id || order.refundId || "",
      refundAmountFen,
      refundedAt: refund.success_time || order.refundedAt || "",
      payStatus: refund.status === "SUCCESS" ? "refunded" : order.payStatus
    });
    ok(res, {
      provider: "wechatpay",
      refunded: refund.status === "SUCCESS",
      orderId: order.id,
      refundStatus: nextOrder.refundStatus,
      order: nextOrder,
      raw: refund
    }, "refund-created");
  } catch (error) {
    fail(res, error.statusCode || 500, error.message || "WeChat refund failed");
  }
}

async function handle(req, res) {
  if (req.method === "OPTIONS") {
    jsonResponse(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  if (pathname === "/health") {
    ok(res, {
      service: "shanfeng-express-server",
      status: "ok",
      time: new Date().toISOString(),
      wechatPayProvider: WECHAT_PAY_PROVIDER
    });
    return;
  }

  if (!pathname.startsWith("/api/v1/")) {
    fail(res, 404, "Not found");
    return;
  }

  const isWechatNotifyPath = pathname === "/api/v1/payments/wechat/notify";
  if (!isWechatNotifyPath && !requireTenant(req, res)) return;

  if (pathname === "/api/v1/auth/wechat-login") {
    const body = await parseBody(req);
    const profile = body.profile || {};
    try {
      if (body.code && WECHAT_APP_ID && WECHAT_APP_SECRET) {
        const session = await wechatCode2Session(body.code);
        const userId = session.openid || profile.id || `U${Date.now()}`;
        ok(res, {
          userId,
          openid: session.openid || "",
          unionid: session.unionid || "",
          token: createToken({ userId, openid: session.openid }),
          profile
        });
        return;
      }

      ok(res, {
        userId: profile.id || `U${Date.now()}`,
        token: crypto.randomBytes(16).toString("hex"),
        openid: body.openid || "",
        profile
      });
    } catch (error) {
      fail(res, error.statusCode || 500, error.message || "WeChat login failed");
    }
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
    saveOrders([order].concat(getOrders()));
    ok(res, order, "created");
    return;
  }

  if (pathname === "/api/v1/payments/wechat/prepay" && req.method === "POST") {
    await handleWechatPrepay(req, res);
    return;
  }

  if (pathname === "/api/v1/payments/wechat/notify" && req.method === "POST") {
    await handleWechatNotify(req, res);
    return;
  }

  const paymentStatusMatch = pathname.match(/^\/api\/v1\/payments\/([^/]+)\/status$/);
  if (paymentStatusMatch && req.method === "GET") {
    await handlePaymentStatus(req, res, decodeURIComponent(paymentStatusMatch[1]));
    return;
  }

  if (pathname === "/api/v1/refunds" && req.method === "POST") {
    await handleRefund(req, res);
    return;
  }

  const orderDetailMatch = pathname.match(/^\/api\/v1\/orders\/([^/]+)$/);
  if (orderDetailMatch && req.method === "GET") {
    const order = findOrder(decodeURIComponent(orderDetailMatch[1]));
    if (!order) {
      fail(res, 404, "Order not found");
      return;
    }
    ok(res, order);
    return;
  }

  const orderTrackMatch = pathname.match(/^\/api\/v1\/orders\/([^/]+)\/track$/);
  if (orderTrackMatch && req.method === "GET") {
    const order = findOrder(decodeURIComponent(orderTrackMatch[1]));
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
    const order = findOrder(waybillNo);
    ok(res, order || withPaymentDefaults({
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
    }));
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
    fail(res, error.statusCode || 500, error.message || "Internal server error", error.statusCode || 500);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Shanfeng Express API listening on http://${HOST}:${PORT}`);
});
