// OnRoute · piezas compartidas del servidor de pagos (Netlify Functions + Stripe Connect).
// Los secretos viven en las variables de entorno de Netlify, nunca en GitHub ni en la página:
//   STRIPE_SECRET_KEY          llave secreta de Stripe (sk_test_... en pruebas)
//   STRIPE_WEBHOOK_SECRET      secreto del webhook (whsec_...); si hay dos, sepáralos con coma
//   FIREBASE_SERVICE_ACCOUNT   contenido completo del archivo JSON de la cuenta de servicio de Firebase
// Las librerías se cargan al usarse (no al arrancar): así, si algo falla, la respuesta
// igual lleva los permisos CORS y la página puede mostrar el motivo.
const fbApp = () => require("firebase-admin/app");

const SITE = process.env.ONROUTE_SITE || "https://getonroute.app/";
const ALLOWED = ["https://getonroute.app", "https://www.getonroute.app", "https://innovationtech1.github.io", "http://localhost:5056", "http://localhost:5000", "http://127.0.0.1:5000"];
const RID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

let _db = null, _stripe = null;
function db() {
  if (_db) return _db;
  const { initializeApp, getApps, cert } = fbApp();
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("Falta FIREBASE_SERVICE_ACCOUNT en Netlify.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  _db = require("firebase-admin/firestore").getFirestore();
  return _db;
}
function stripe() {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Falta STRIPE_SECRET_KEY en Netlify.");
  const Stripe = require("stripe");
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

function cors(event) {
  const o = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(o) ? o : ALLOWED[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}
// Envuelve una función: CORS, solo POST, JSON de entrada y salida, errores sin detalles internos.
function handler(name, fn) {
  return async event => {
    const h = { ...cors(event), "Content-Type": "application/json" };
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: h, body: "" };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers: h, body: JSON.stringify({ error: "Usa POST." }) };
    let body = {};
    try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "{}") || {}; } catch (e) {}
    try {
      const [status, out] = await fn(body, event);
      return { statusCode: status, headers: h, body: JSON.stringify(out) };
    } catch (e) {
      console.error(name, e);
      return { statusCode: 500, headers: h, body: JSON.stringify({ error: "Algo falló en el servidor de pagos. Intenta otra vez.", detail: why(e) }) };
    }
  };
}
// Explicación corta del error para poder diagnosticarlo (nunca incluye llaves).
function why(e) {
  const m = String((e && e.message) || e || "").slice(0, 300);
  if (e && e.type && /^Stripe/.test(e.type)) return `Stripe: ${m}`;
  if (/FIREBASE_SERVICE_ACCOUNT|STRIPE_SECRET_KEY/.test(m)) return m;
  if (e instanceof SyntaxError) return "FIREBASE_SERVICE_ACCOUNT no tiene un JSON válido (¿se pegó completo?).";
  if (/credential|private key|PEM|invalid_grant|service account/i.test(m)) return "Firebase: la cuenta de servicio no es válida. " + m.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, "[clave]").slice(0, 200);
  return m.replace(/(sk|rk|whsec)_[A-Za-z0-9_]+/g, "[oculto]");
}
// Usuario con sesión iniciada (la página manda su token de Firebase).
async function userOf(event) {
  const m = /^Bearer (.+)$/.exec(String((event.headers && (event.headers.authorization || event.headers.Authorization)) || ""));
  if (!m) { event.authErr = "La página no mandó la sesión."; return null; }
  db();
  try { return await require("firebase-admin/auth").getAuth().verifyIdToken(m[1]); }
  catch (e) { console.warn("userOf", e && e.code, e && e.message); event.authErr = `${(e && e.code) || ""} ${String((e && e.message) || e).slice(0, 220)}`.trim(); return null; }
}

// ---- Horario (misma lógica que la página) ----
const DEF_DAYS = [0, 1, 2, 3, 4, 5, 6].map(i => i === 0 ? { closed: true } : { open: "10:00", close: "18:00" });
const okT = t => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const mins = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
function inHours(r) {
  const h = r && r.hours, ok = h && Array.isArray(h.days) && h.days.length === 7;
  const tz = ok && typeof h.tz === "string" && h.tz ? h.tz : "America/Chicago";
  const days = ok ? h.days.map(d => d && !d.closed && okT(d.open) && okT(d.close) ? d : { closed: true }) : DEF_DAYS;
  let day, min;
  try {
    const p = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).forEach(x => p[x.type] = x.value);
    day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday); min = (Number(p.hour) % 24) * 60 + Number(p.minute);
  } catch (e) { return true; }
  const t = days[day], y = days[(day + 6) % 7];
  if (!t.closed) { const o = mins(t.open), c = mins(t.close); if (c > o ? min >= o && min < c : min >= o) return true; }
  return !y.closed && mins(y.close) <= mins(y.open) && min < mins(y.close);
}
const truckLive = r => !!(r.kind === "truck" && r.loc && r.loc.sharing && Date.now() - Number(r.loc.updatedAt || 0) < 15 * 60000);

// Cuenta de Stripe del negocio (Accounts v2): lista para cobrar cuando la capacidad card_payments está activa.
// Devuelve también qué falta, para que la guía del Perfil lo explique en palabras sencillas.
async function acctStatus(id) {
  const a = await stripe().v2.core.accounts.retrieve(id, { include: ["configuration.merchant", "requirements"] });
  const cp = a.configuration && a.configuration.merchant && a.configuration.merchant.capabilities && a.configuration.merchant.capabilities.card_payments;
  const entries = a.requirements && Array.isArray(a.requirements.entries) ? a.requirements.entries : [];
  const missing = entries.slice(0, 12).map(e => ({
    who: e.awaiting_action_from === "stripe" ? "stripe" : "user",
    text: String(e.description || "").slice(0, 160),
    codes: (Array.isArray(e.errors) ? e.errors : []).map(x => String(x.code || "")).filter(Boolean).slice(0, 4),
    blocks: !!(e.impact && Array.isArray(e.impact.restricts_capabilities) && e.impact.restricts_capabilities.some(r => r && r.capability === "card_payments")),
    due: e.minimum_deadline && e.minimum_deadline.status ? String(e.minimum_deadline.status) : "",
  }));
  return {
    ready: !!(cp && cp.status === "active"),
    cap: cp ? String(cp.status || "") : "",
    reasons: cp && Array.isArray(cp.status_details) ? cp.status_details.map(d => String(d.code || "")).filter(Boolean) : [],
    pending: missing.length, missing,
  };
}

// Cuenta de Stripe del repartidor: lista cuando puede recibir transferencias.
async function recipientStatus(id) {
  const a = await stripe().v2.core.accounts.retrieve(id, { include: ["configuration.recipient", "requirements"] });
  const c = a.configuration && a.configuration.recipient && a.configuration.recipient.capabilities;
  const tr = c && c.stripe_balance && c.stripe_balance.stripe_transfers;
  const entries = a.requirements && Array.isArray(a.requirements.entries) ? a.requirements.entries : [];
  const missing = entries.slice(0, 12).map(e => ({ who: e.awaiting_action_from === "stripe" ? "stripe" : "user", text: String(e.description || "").slice(0, 160), codes: (Array.isArray(e.errors) ? e.errors : []).map(x => String(x.code || "")).filter(Boolean).slice(0, 4) }));
  return { ready: !!(tr && tr.status === "active"), cap: tr ? String(tr.status || "") : "", reasons: tr && Array.isArray(tr.status_details) ? tr.status_details.map(d => String(d.code || "")).filter(Boolean) : [], pending: missing.length, missing };
}

// ---- Entregas a domicilio ----
// Tarifa por millas (distancia en línea recta × 1.3 para aproximar calles). El repartidor recibe el 80%
// del envío y el 100% de la propina; OnRoute se queda con el 20% del envío.
const DELIVERY = { base: 2.99, perMile: 1.25, minFee: 3.99, maxMiles: 8, roadFactor: 1.3, driverShare: 0.8 };
const r2 = n => Math.round(n * 100) / 100;
function miles(a, b) {
  const R = 3958.8, toR = x => x * Math.PI / 180, dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const roadMiles = (a, b) => r2(miles(a, b) * DELIVERY.roadFactor);
const deliveryFee = mi => r2(Math.max(DELIVERY.minFee, DELIVERY.base + DELIVERY.perMile * mi));
const driverPay = (fee, tip) => r2(fee * DELIVERY.driverShare + tip);
function restPos(r) {
  if (r.kind === "truck" && r.loc && typeof r.loc.lat === "number") return { lat: r.loc.lat, lng: r.loc.lng };
  if (typeof r.lat === "number" && typeof r.lng === "number") return { lat: r.lat, lng: r.lng };
  return null;
}
// Paga al repartidor (transferencia de Stripe desde la cuenta de OnRoute). Si todavía no hay saldo disponible,
// queda "pending" y la función programada payDrivers lo vuelve a intentar cada hora.
async function payDriver(ref, d) {
  if (!d || d.payout === "paid" || d.payout === "ledger" || d.payout === "settled") return "skip";
  // Entrega pagada a mano (Zelle, Cash App o efectivo): el dinero no pasó por Stripe. Queda en "Saldos":
  //   el repartidor cobró `collect` en efectivo y se gana `driverPay` → debe (collect − driverPay) a OnRoute (negativo: OnRoute le debe).
  //   el negocio recibió `prepaid` por Zelle/Cash App y le toca `food` → debe (prepaid − food) a OnRoute (negativo: OnRoute le debe).
  // La suma de las dos es la parte de OnRoute del envío.
  if (d.pay === "manual") {
    const drv = r2((Number(d.collect) || 0) - (Number(d.driverPay) || 0)), biz = r2((Number(d.prepaid) || 0) - (Number(d.food) || 0));
    await ref.update({ payout: "ledger", settle: { drv, biz }, payoutErr: null });
    return "ledger";
  }
  if (!(d.driverPay > 0)) return "skip";
  const ds = await db().doc(`drivers/${d.driverUid}`).get(), D = ds.exists ? ds.data() : null;
  // Repartidor que cobra por Cash App, Zelle o Venmo: queda "por pagar" y el administrador se lo manda a mano.
  if (D && D.payout && D.payout.method === "manual") { if (d.payout !== "manual") await ref.update({ payout: "manual", payoutApp: D.payout.app || "", payoutErr: null }); return "manual"; }
  if (!D || !D.stripeAccount) { await ref.update({ payout: "pending", payoutErr: "El repartidor no ha conectado su banco." }); return "pending"; }
  try {
    const t = await stripe().transfers.create({ amount: Math.round(d.driverPay * 100), currency: "usd", destination: D.stripeAccount, transfer_group: `onroute-${ref.id}`,
      description: `OnRoute · entrega del pedido #${d.num || ""} (${d.rname || d.rid})`, metadata: { deliveryId: ref.id, rid: d.rid, driverUid: d.driverUid } },
      { idempotencyKey: `onroute-pay-${ref.id}` });
    await ref.update({ payout: "paid", payoutAt: Date.now(), transferId: t.id, payoutErr: null });
    return "paid";
  } catch (e) {
    await ref.update({ payout: "pending", payoutErr: String(e.message || e).slice(0, 200) });
    return "pending";
  }
}

module.exports = { DELIVERY, roadMiles, deliveryFee, driverPay, restPos, payDriver, r2, acctStatus, recipientStatus, db, stripe, handler, userOf, inHours, truckLive, SITE, RID };
