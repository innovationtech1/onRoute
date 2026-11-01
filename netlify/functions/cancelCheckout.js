// El cliente regresó de Stripe sin pagar: se cancela el pedido solo si sigue pendiente.
const { db, stripe, handler, RID } = require("../lib/onroute");

exports.handler = handler("cancelCheckout", async body => {
  const rid = String(body.rid || ""), oid = String(body.orderId || "").replace(/[^A-Za-z0-9]/g, "");
  if (!RID.test(rid) || !oid) return [200, { ok: true }];
  const ref = db().doc(`restaurants/${rid}/orders/${oid}`);
  const snap = await ref.get();
  const o = snap.exists ? snap.data() : null;
  if (!o || o.status !== "pending" || !o.sessionId || !o.stripeAccount) return [200, { ok: true }];
  const opt = { stripeAccount: o.stripeAccount };
  const session = await stripe().checkout.sessions.retrieve(o.sessionId, {}, opt);
  if (session.status === "open") await stripe().checkout.sessions.expire(session.id, {}, opt);
  if (session.payment_status !== "paid") await ref.update({ status: "cancelled" });
  return [200, { ok: true }];
});
