// OnRoute · piezas compartidas del servidor de pagos (Netlify Functions + Stripe Connect).
// Los secretos viven en las variables de entorno de Netlify, nunca en GitHub ni en la página:
//   STRIPE_SECRET_KEY          llave secreta de Stripe (sk_test_... en pruebas)
//   STRIPE_WEBHOOK_SECRET      secreto del webhook (whsec_...); si hay dos, sepáralos con coma
//   FIREBASE_SERVICE_ACCOUNT   contenido completo del archivo JSON de la cuenta de servicio de Firebase
const admin = require("firebase-admin");
const Stripe = require("stripe");

const SITE = process.env.ONROUTE_SITE || "https://innovationtech1.github.io/onRoute/";
const ALLOWED = ["https://innovationtech1.github.io", "http://localhost:5056", "http://localhost:5000", "http://127.0.0.1:5000"];
const RID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

let _db = null, _stripe = null;
function db() {
  if (_db) return _db;
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("Falta FIREBASE_SERVICE_ACCOUNT en Netlify.");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  _db = admin.firestore();
  return _db;
}
function stripe() {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Falta STRIPE_SECRET_KEY en Netlify.");
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
      return { statusCode: 500, headers: h, body: JSON.stringify({ error: "Algo falló en el servidor de pagos. Intenta otra vez." }) };
    }
  };
}
// Usuario con sesión iniciada (la página manda su token de Firebase).
async function userOf(event) {
  const m = /^Bearer (.+)$/.exec(String((event.headers && (event.headers.authorization || event.headers.Authorization)) || ""));
  if (!m) return null;
  db();
  try { return await admin.auth().verifyIdToken(m[1]); } catch (e) { return null; }
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

module.exports = { admin, db, stripe, handler, userOf, inHours, truckLive, SITE, RID };
