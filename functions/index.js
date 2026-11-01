// OnRoute · servidor de pagos (Cloud Functions de Firebase + Stripe Checkout), un negocio por pedido.
// Por ahora todo se cobra en una sola cuenta de Stripe; el siguiente paso es Stripe Connect (cada negocio con su cuenta).
// La llave secreta de Stripe vive en Secret Manager, nunca en la página ni en GitHub.
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Stripe = require("stripe");

initializeApp();
const db = getFirestore();
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const SITE = "https://innovationtech1.github.io/onRoute/";
const ALLOWED = ["https://innovationtech1.github.io", "http://localhost:5000", "http://127.0.0.1:5000"];

// Mismo formato que usa la página: cada platillo con opciones {label, detail, price}.
function menuFromDb(items) {
  return (items || []).filter(x => x && x.id && Array.isArray(x.opts) && x.opts.length).map(x => ({
    id: String(x.id), name: String(x.name || ""), soldOut: !!x.soldOut,
    opts: x.opts.map(o => ({ label: String(o.label || ""), price: Number(o.price) || 0 })),
  }));
}
const RID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

exports.createCheckout = onRequest(
  { cors: ALLOWED, invoker: "public", secrets: [STRIPE_SECRET_KEY], region: "us-central1", maxInstances: 5 },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Usa POST." });
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const who = String(body.name || "").trim().slice(0, 40);
      const pickup = body.pickup === "30" ? "30" : "asap";
      const cart = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
      if (!who) return res.status(400).json({ error: "Falta el nombre para el pedido." });
      if (!cart.length) return res.status(400).json({ error: "El carrito está vacío." });

      const rid = String(body.rid || "");
      if (!RID.test(rid)) return res.status(400).json({ error: "Negocio no válido." });
      const rs = await db.doc(`restaurants/${rid}`).get();
      const R = rs.exists ? rs.data() : null;
      if (!R || R.status !== "active") return res.status(404).json({ error: "Este negocio no está recibiendo pedidos." });
      if (R.paused) return res.status(409).json({ error: "El negocio pausó los pedidos en línea. Intenta en unos minutos." });
      const variant = R.variant && R.variant.label && Number(R.variant.discount) > 0 ? { label: String(R.variant.label), discount: Number(R.variant.discount) } : null;

      // El total se calcula aquí con los precios reales: lo que mande el navegador no cuenta.
      const ms = await db.doc(`restaurants/${rid}/menu/main`).get();
      const menu = menuFromDb(ms.exists ? ms.data().items : []);
      const items = [], lineItems = [];
      let total = 0;
      for (const it of cart) {
        const [id, oi, v] = String(it.key || "").split("|");
        const qty = Math.floor(Number(it.qty));
        const m = menu.find(x => x.id === id);
        const o = m && m.opts[Number(oi)];
        const vr = v === "1" ? variant : null;
        if (!m || !o || (v === "1" && !vr) || !(qty >= 1 && qty <= 20)) return res.status(400).json({ error: "Un producto del carrito ya no existe. Recarga el menú." });
        if (m.soldOut) return res.status(409).json({ error: `${m.name} está agotado.` });
        const price = Math.round((o.price - (vr ? vr.discount : 0)) * 100) / 100;
        if (!(price > 0)) return res.status(400).json({ error: "Precio no válido." });
        const label = `${m.name}${m.opts.length > 1 ? " · " + o.label : ""}${vr ? " · " + vr.label : ""}`.slice(0, 120);
        items.push({ name: label, qty });
        lineItems.push({ quantity: qty, price_data: { currency: "usd", unit_amount: Math.round(price * 100), product_data: { name: label } } });
        total += price * qty;
      }
      total = Math.round(total * 100) / 100;
      if (total >= 1000) return res.status(400).json({ error: "El pedido es demasiado grande." });

      const ref = db.collection(`restaurants/${rid}/orders`).doc();
      const num = "T" + String(Math.floor(100 + Math.random() * 900));
      await ref.set({ num, who, items, total, status: "pending", pickup, pay: "card", paid: false, createdAt: Date.now() });

      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        client_reference_id: ref.id,
        metadata: { rid, orderId: ref.id, num },
        success_url: `${SITE}?r=${rid}&pedido=${ref.id}&pago=ok`,
        cancel_url: `${SITE}?r=${rid}&pedido=${ref.id}&pago=cancelado`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      });
      await ref.update({ sessionId: session.id });
      return res.json({ url: session.url, orderId: ref.id });
    } catch (e) {
      logger.error("createCheckout", e);
      return res.status(500).json({ error: "No se pudo iniciar el pago. Intenta otra vez." });
    }
  }
);

exports.stripeWebhook = onRequest(
  { invoker: "public", secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], region: "us-central1", maxInstances: 5 },
  async (req, res) => {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET.value());
    } catch (e) {
      logger.warn("Firma de Stripe no válida", e.message);
      return res.status(400).send("Firma no válida");
    }
    const s = event.data.object;
    const orderId = s.metadata && s.metadata.orderId, rid = s.metadata && s.metadata.rid;
    if (!orderId || !rid || !RID.test(rid)) return res.json({ ok: true });
    const ref = db.doc(`restaurants/${rid}/orders/${orderId}`);
    try {
      if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") && s.payment_status === "paid") {
        const snap = await ref.get();
        if (snap.exists && snap.data().status === "pending") {
          // createdAt se pone en la hora del pago para que el pedido entre arriba en la cocina.
          await ref.update({ status: "new", paid: true, paidAt: Date.now(), createdAt: Date.now(), paidTotal: (s.amount_total || 0) / 100, paymentIntent: String(s.payment_intent || "") });
        }
      } else if (event.type === "checkout.session.expired") {
        const snap = await ref.get();
        if (snap.exists && snap.data().status === "pending") await ref.update({ status: "cancelled" });
      }
    } catch (e) {
      logger.error("stripeWebhook", e);
      return res.status(500).send("Error");
    }
    return res.json({ received: true });
  }
);

// El cliente avisa que canceló en la página de Stripe: se marca cancelado solo si sigue pendiente.
exports.cancelCheckout = onRequest(
  { cors: ALLOWED, invoker: "public", secrets: [STRIPE_SECRET_KEY], region: "us-central1", maxInstances: 5 },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Usa POST." });
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const rid = String(body.rid || "");
      if (!RID.test(rid)) return res.json({ ok: true });
      const ref = db.doc(`restaurants/${rid}/orders/${String(body.orderId || "x").replace(/[^A-Za-z0-9]/g, "") || "x"}`);
      const snap = await ref.get();
      if (!snap.exists || snap.data().status !== "pending" || !snap.data().sessionId) return res.json({ ok: true });
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const session = await stripe.checkout.sessions.retrieve(snap.data().sessionId);
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      if (session.payment_status !== "paid") await ref.update({ status: "cancelled" });
      return res.json({ ok: true });
    } catch (e) {
      logger.error("cancelCheckout", e);
      return res.status(500).json({ error: "No se pudo cancelar." });
    }
  }
);
