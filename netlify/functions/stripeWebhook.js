// Stripe avisa aquí lo que pasa en las cuentas de los negocios (webhook de Connect):
//  - checkout.session.completed / async_payment_succeeded: el pedido pasa a la cocina como pagado.
//  - checkout.session.expired: el pedido pendiente se cancela.
//  - account.updated: el negocio terminó (o no) de configurar su cuenta para cobrar con tarjeta.
const { db, stripe, RID } = require("../lib/onroute");

// Pedido a domicilio pagado: se publica para que los repartidores en línea lo vean.
// Los datos exactos del cliente van aparte (private/info) y solo los ve el repartidor que acepta.
async function publishDelivery(rid, orderId, o, now) {
  const rs = await db().doc(`restaurants/${rid}`).get(), R = rs.exists ? rs.data() : {};
  const from = R.kind === "truck" && R.loc && typeof R.loc.lat === "number" ? { lat: R.loc.lat, lng: R.loc.lng } : { lat: R.lat, lng: R.lng };
  const D = o.delivery, ref = db().doc(`deliveries/${orderId}`);
  await ref.set({ rid, oid: orderId, rname: String(R.name || rid).slice(0, 60), num: o.num,
    pickup: { lat: from.lat, lng: from.lng, address: String(R.address || (R.loc && R.loc.stop) || "").slice(0, 120), phone: String(R.phone || "").slice(0, 30) },
    drop: { lat: Math.round(D.lat * 100) / 100, lng: Math.round(D.lng * 100) / 100, area: String(D.address || "").split(",").slice(1, 2).join("").trim().slice(0, 40) },
    miles: D.miles, fee: D.fee, tip: D.tip, driverPay: D.driverPay, items: (o.items || []).reduce((a, it) => a + (Number(it.qty) || 0), 0),
    status: "searching", kitchen: "new", driverUid: null, payout: "none", createdAt: now, paidAt: now });
  await ref.collection("private").doc("info").set({ name: o.who, phone: D.phone, address: D.address, unit: D.unit || "", notes: D.notes || "", lat: D.lat, lng: D.lng });
  await db().doc(`restaurants/${rid}/orders/${orderId}`).update({ "delivery.status": "searching" });
}

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
      if (o.delivery) await publishDelivery(rid, orderId, o, now);
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
