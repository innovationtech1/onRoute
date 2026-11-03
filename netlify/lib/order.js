// OnRoute · armar un pedido con los precios reales del menú (lo usan el pago con tarjeta
// y los pagos a mano: Zelle, Cash App y efectivo). Lo que mande el navegador no cuenta.
const { db, userOf, inHours, truckLive, RID, DELIVERY, roadMiles, deliveryFee, driverPay, restPos, r2 } = require("./onroute");

function menuFromDb(items) {
  return (items || []).filter(x => x && x.id && Array.isArray(x.opts) && x.opts.length).map(x => ({
    id: String(x.id), name: String(x.name || ""), soldOut: !!x.soldOut, noExtras: !!x.noExtras,
    opts: x.opts.map(o => ({ label: String(o.label || ""), price: Number(o.price) || 0 })),
  }));
}

// Promociones (igual que en la página): la que más ahorra entre las automáticas y la del código.
const cleanCode = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
function bestPromo(R, sub, code) {
  const list = (Array.isArray(R.promos) ? R.promos : []).filter(p => p && p.id).slice(0, 10).map(p => ({
    title: String(p.title || "").slice(0, 40), kind: p.kind === "off" ? "off" : "pct", value: Math.max(0, Number(p.value) || 0),
    min: Math.max(0, Number(p.min) || 0), code: cleanCode(p.code), on: p.on !== false,
  })).filter(p => p.on && p.value > 0 && (p.kind === "off" || p.value <= 90));
  let best = null;
  for (const p of list) {
    if (p.code && p.code !== code) continue;
    if (!(sub > 0) || sub < p.min) continue;
    const off = r2(Math.min(p.kind === "pct" ? (sub * p.value) / 100 : p.value, sub));
    if (off > 0 && (!best || off > best.off)) best = { p, off };
  }
  return best;
}
const promoText = p => (p.kind === "pct" ? `${p.value}% de descuento` : `$${p.value.toFixed(2)} de descuento`);

// Formas de pago a mano que acepta el negocio.
function manualMethods(R, delivery) {
  const P = R.payments || {}, out = [];
  if (delivery ? P.cashDelivery !== false : P.cash !== false) out.push("cash");
  if (P.zelle) out.push("zelle");
  if (P.cashapp) out.push("cashapp");
  return out;
}

// Devuelve [status, error] o { R, order, lineItems, appFee, uid, cartMap }.
async function buildOrder(body, event, { card }) {
  const who = String(body.name || "").trim().slice(0, 40);
  const pickup = body.delivery ? "delivery" : body.pickup === "30" ? "30" : "asap";
  const cart = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  if (!who) return [400, { error: "Falta el nombre para el pedido." }];
  if (!cart.length) return [400, { error: "El carrito está vacío." }];
  const rid = String(body.rid || "");
  if (!RID.test(rid)) return [400, { error: "Negocio no válido." }];

  const user = await userOf(event), uid = user ? user.uid : null;
  const rs = await db().doc(`restaurants/${rid}`).get();
  const R = rs.exists ? rs.data() : null;
  if (!R || R.status !== "active") return [404, { error: "Este negocio no está recibiendo pedidos." }];
  if (R.paused) return [409, { error: "El negocio pausó los pedidos en línea. Intenta en unos minutos." }];
  if (!inHours(R)) return [409, { error: "El negocio está fuera de su horario." }];
  if (R.kind === "truck" && !truckLive(R)) return [409, { error: "El food truck no está en ruta ahora." }];
  const variant = R.variant && R.variant.label && Number(R.variant.discount) > 0 ? { label: String(R.variant.label), discount: Number(R.variant.discount) } : null;

  const ms = await db().doc(`restaurants/${rid}/menu/main`).get();
  const md = ms.exists ? ms.data() : {};
  const menu = menuFromDb(md.items);
  const extras = (Array.isArray(md.extras) ? md.extras : []).map(e => ({ id: String(e.id), label: String(e.label || ""), price: Math.max(0, Number(e.price) || 0) }));
  const items = [], lineItems = [], cartMap = {};
  let sub = 0;
  for (const it of cart) {
    const [id, oi, v, ex] = String(it.key || "").split("|");
    const qty = Math.floor(Number(it.qty));
    const m = menu.find(x => x.id === id), o = m && m.opts[Number(oi)], vr = v === "1" ? variant : null;
    if (!m || !o || (v === "1" && !vr) || !(qty >= 1 && qty <= 20)) return [400, { error: "Un producto del carrito ya no existe. Recarga el menú." }];
    if (m.soldOut) return [409, { error: `${m.name} está agotado.` }];
    const exs = (ex ? ex.split(".") : []).map(eid => extras.find(e => e.id === eid));
    if (exs.some(e => !e) || (exs.length && m.noExtras)) return [400, { error: "Un extra del carrito ya no existe. Recarga el menú." }];
    const price = r2(o.price - (vr ? vr.discount : 0) + exs.reduce((a, e) => a + e.price, 0));
    if (!(price > 0)) return [400, { error: "Precio no válido." }];
    const label = `${m.name}${m.opts.length > 1 ? " · " + o.label : ""}${vr ? " · " + vr.label : ""}${exs.length ? " · + " + exs.map(e => e.label).join(", ") : ""}`.slice(0, 160);
    items.push({ name: label, qty });
    cartMap[`${id}|${Number(oi)}|${vr ? 1 : 0}${ex ? "|" + ex : ""}`] = qty;
    lineItems.push({ quantity: qty, price_data: { currency: "usd", unit_amount: Math.round(price * 100), product_data: { name: label } } });
    sub += price * qty;
  }
  sub = r2(sub);

  // Promociones y premio de cliente frecuente: solo cuando no se paga con tarjeta (como en la página).
  let promo = null, reward = null, food = sub;
  if (!card) {
    const pr = bestPromo(R, sub, cleanCode(body.promoCode));
    if (pr) { promo = { title: (pr.p.title || promoText(pr.p)).slice(0, 40), code: pr.p.code, off: pr.off }; food = r2(sub - pr.off); }
    const L = R.loyalty;
    if (uid && L && L.on && L.reward && Number(L.every) >= 2) {
      try {
        const n = (await db().collection(`users/${uid}/orders`).where("rid", "==", rid).get()).size;
        if (n > 0 && n % Number(L.every) === 0) reward = String(L.reward).slice(0, 60);
      } catch (e) { console.warn("premio", e.message); }
    }
  }
  let total = food;

  let dlv = null, appFee = 0;
  if (body.delivery) {
    const B = body.delivery, conf = R.delivery || {};
    if (!conf.on) return [409, { error: "Este negocio no ofrece entrega a domicilio." }];
    const to = { lat: Number(B.lat), lng: Number(B.lng) }, from = restPos(R);
    if (!from) return [409, { error: "El negocio no tiene su ubicación para calcular el envío." }];
    if (!(Math.abs(to.lat) <= 90 && Math.abs(to.lng) <= 180) || (to.lat === 0 && to.lng === 0)) return [400, { error: "Elige tu dirección de entrega." }];
    const address = String(B.address || "").trim().slice(0, 160), phone = String(B.phone || "").trim().slice(0, 30);
    if (address.length < 5) return [400, { error: "Escribe tu dirección de entrega." }];
    if (phone.replace(/\D/g, "").length < 7) return [400, { error: "Escribe tu teléfono para que el repartidor te pueda llamar." }];
    const mi = roadMiles(from, to), radius = Math.min(Number(conf.radius) || 5, DELIVERY.maxMiles);
    if (mi > radius) return [409, { error: `Tu dirección está a ${mi.toFixed(1)} millas y ${R.name} entrega hasta ${radius} millas.` }];
    const fee = deliveryFee(mi), tip = r2(Math.min(100, Math.max(0, Number(body.tip) || 0)));
    lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(fee * 100), product_data: { name: `Envío a domicilio (${mi.toFixed(1)} mi)` } } });
    if (tip > 0) lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(tip * 100), product_data: { name: "Propina para el repartidor (100% para él)" } } });
    total = r2(total + fee + tip);
    appFee = Math.round((fee + tip) * 100);
    dlv = { address, unit: String(B.unit || "").trim().slice(0, 40), notes: String(B.notes || "").trim().slice(0, 200), phone, lat: to.lat, lng: to.lng,
      miles: mi, fee, tip, driverPay: driverPay(fee, tip), status: "pending" };
  }
  if (total >= 1000) return [400, { error: "El pedido es demasiado grande." }];

  const num = "T" + String(Math.floor(100 + Math.random() * 900));
  const order = { num, who, items, total, pickup, createdAt: Date.now() };
  if (dlv) { order.delivery = dlv; order.food = food; }
  if (promo) { order.subtotal = sub; order.promo = promo; }
  if (reward) order.reward = reward;
  const note = String(body.note || "").trim().slice(0, 200); if (note) order.note = note;
  if (uid) { order.uid = uid; order.cart = cartMap; order.rname = String(R.name || "").slice(0, 60); }
  return { R, rid, order, lineItems, appFee, uid, cartMap };
}

// Partes del pago a mano: una forma de pago, o dos combinadas (ej. Zelle $10 + efectivo el resto).
function payParts(body, R, total, delivery) {
  const ok = manualMethods(R, delivery), P = body.pay || {};
  const raw = Array.isArray(P.parts) ? P.parts.slice(0, 2) : [];
  if (!raw.length) return [400, { error: "Elige cómo vas a pagar." }];
  const ms = raw.map(p => String(p && p.m || ""));
  if (ms.some(m => !ok.includes(m))) return [409, { error: "Este negocio no acepta esa forma de pago." }];
  if (raw.length === 1) return [{ m: ms[0], amt: total }];
  if (ms[0] === ms[1]) return [400, { error: "Elige dos formas de pago diferentes." }];
  const a = r2(Number(raw[0].amt) || 0), b = r2(total - a);
  if (!(a >= 1) || !(b >= 1)) return [400, { error: `Cada parte debe ser de al menos $1.00 (total $${total.toFixed(2)}).` }];
  return [{ m: ms[0], amt: a }, { m: ms[1], amt: b }];
}

// Pedido a domicilio confirmado (pagado con tarjeta o aceptado por el negocio): se publica para los repartidores.
// Los datos exactos del cliente van aparte (private/info) y solo los ve el repartidor que acepta.
async function publishDelivery(rid, orderId, o, now) {
  const rs = await db().doc(`restaurants/${rid}`).get(), R = rs.exists ? rs.data() : {};
  const from = R.kind === "truck" && R.loc && typeof R.loc.lat === "number" ? { lat: R.loc.lat, lng: R.loc.lng } : { lat: R.lat, lng: R.lng };
  const D = o.delivery, ref = db().doc(`deliveries/${orderId}`);
  const manual = o.pay !== "card", parts = Array.isArray(o.payParts) ? o.payParts : [];
  const collect = r2(parts.filter(p => p.m === "cash").reduce((a, p) => a + (Number(p.amt) || 0), 0));
  await ref.set({ rid, oid: orderId, rname: String(R.name || rid).slice(0, 60), num: o.num,
    pickup: { lat: from.lat, lng: from.lng, address: String(R.address || (R.loc && R.loc.stop) || "").slice(0, 120), phone: String(R.phone || "").slice(0, 30) },
    drop: { lat: Math.round(D.lat * 100) / 100, lng: Math.round(D.lng * 100) / 100, area: String(D.address || "").split(",").slice(1, 2).join("").trim().slice(0, 40) },
    miles: D.miles, fee: D.fee, tip: D.tip, driverPay: D.driverPay, items: (o.items || []).reduce((a, it) => a + (Number(it.qty) || 0), 0),
    status: "searching", kitchen: "new", driverUid: null, payout: "none", createdAt: now, paidAt: now,
    ...(manual ? { pay: "manual", collect, prepaid: r2((Number(o.total) || 0) - collect), food: Number(o.food) || 0 } : { pay: "card" }) });
  await ref.collection("private").doc("info").set({ name: o.who, phone: D.phone, address: D.address, unit: D.unit || "", notes: D.notes || "", lat: D.lat, lng: D.lng });
  await db().doc(`restaurants/${rid}/orders/${orderId}`).update({ "delivery.status": "searching" });
}

module.exports = { buildOrder, payParts, manualMethods, publishDelivery };
