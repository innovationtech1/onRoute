// Stripe avisa aquí lo que pasa en las cuentas de los negocios (webhook de Connect):
//  - checkout.session.completed / async_payment_succeeded: el pedido pasa a la cocina como pagado.
//  - checkout.session.expired: el pedido pendiente se cancela.
//  - account.updated: el negocio terminó (o no) de configurar su cuenta para cobrar con tarjeta.
const { db, stripe, RID } = require("../lib/onroute");

exports.handler = async event => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Usa POST" };
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "", "utf8");
  const sig = (event.headers && (event.headers["stripe-signature"] || event.headers["Stripe-Signature"])) || "";
  const secrets = String(process.env.STRIPE_WEBHOOK_SECRET || "").split(",").map(s => s.trim()).filter(Boolean);
  let ev = null;
  for (const sec of secrets) { try { ev = stripe().webhooks.constructEvent(raw, sig, sec); break; } catch (e) {} }
  if (!ev) { console.warn("Firma de Stripe no válida"); return { statusCode: 400, body: "Firma no válida" }; }

  try {
    const s = ev.data.object;
    if (ev.type === "account.updated") {
      const rid = s.metadata && s.metadata.rid;
      if (rid && RID.test(rid)) {
        const ref = db().doc(`restaurants/${rid}`), snap = await ref.get();
        if (snap.exists && snap.data().stripeAccount === s.id) await ref.update({ stripeReady: !!(s.charges_enabled && s.details_submitted) });
      }
      return { statusCode: 200, body: "ok" };
    }
    const orderId = s.metadata && s.metadata.orderId, rid = s.metadata && s.metadata.rid;
    if (!orderId || !rid || !RID.test(rid)) return { statusCode: 200, body: "ok" };
    const ref = db().doc(`restaurants/${rid}/orders/${orderId}`);
    const snap = await ref.get();
    const o = snap.exists ? snap.data() : null;
    // Solo se acepta el aviso si viene de la misma cuenta de Stripe con la que se creó el pedido.
    if (!o || o.status !== "pending" || (o.stripeAccount && ev.account && o.stripeAccount !== ev.account)) return { statusCode: 200, body: "ok" };
    if ((ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") && s.payment_status === "paid") {
      const now = Date.now(); // createdAt = hora del pago, para que entre arriba en la cocina
      await ref.update({ status: "new", paid: true, paidAt: now, createdAt: now, paidTotal: (s.amount_total || 0) / 100, paymentIntent: String(s.payment_intent || "") });
      if (o.uid) await db().doc(`users/${o.uid}/orders/${orderId}`).set({ rid, rname: o.rname || rid, num: o.num, total: o.total, items: o.items, cart: o.cart || {}, pay: "card", createdAt: now });
    } else if (ev.type === "checkout.session.expired" || ev.type === "checkout.session.async_payment_failed") {
      await ref.update({ status: "cancelled" });
    }
  } catch (e) {
    console.error("stripeWebhook", e);
    return { statusCode: 500, body: "Error" };
  }
  return { statusCode: 200, body: "ok" };
};
