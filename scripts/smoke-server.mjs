const API_BASE = process.env.API_BASE || "http://127.0.0.1:18083";
const tenantId = process.env.TENANT_ID || "shanfeng-demo";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-tenant-id": tenantId,
      ...(options.headers || {})
    }
  });
  const body = await res.json();
  if (!res.ok || body.code !== 0) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.data;
}

const health = await request("/health");
const estimate = await request("/api/v1/pricing/estimate", {
  method: "POST",
  body: JSON.stringify({
    serviceType: "特快",
    fromAddress: "深圳市南山区 科技园 A 座",
    toAddress: "广州市天河区 珠江新城 B 塔",
    itemType: "文件证件",
    weight: "1kg以内",
    insuredValue: 1000
  })
});
const order = await request("/api/v1/orders", {
  method: "POST",
  body: JSON.stringify({
    serviceType: "特快",
    fromAddress: "深圳市南山区 科技园 A 座",
    toAddress: "广州市天河区 珠江新城 B 塔",
    itemType: "文件证件",
    weight: "1kg以内",
    pickupTime: "今天 14:00-16:00",
    insuredValue: 1000
  })
});
const detail = await request(`/api/v1/orders/${encodeURIComponent(order.id)}`);
const track = await request(`/api/v1/waybills/${encodeURIComponent(order.waybillNo)}/track`);

console.log(JSON.stringify({
  ok: true,
  health: health.status,
  estimate,
  orderId: order.id,
  detailStatus: detail.status,
  trackEvents: track.trackEvents.length
}, null, 2));

