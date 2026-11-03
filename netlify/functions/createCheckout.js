// El cliente paga con tarjeta: se calcula el total con los precios reales del menú,
// se crea el pedido como "pending" y se abre Stripe Checkout en la cuenta de Stripe del negocio (Connect).
// El dinero llega directo al negocio y Stripe le cobra a él su comisión; en pedidos a domicilio
// el envío y la propina van a OnRoute (application fee) para pagarle al repartidor.
const { db, stripe, handler, acctStatus, SITE } = require("../lib/onroute");
const { buildOrder } = require("../lib/order");

exports.handler = handler("createCheckout", async (body, event) => {
  const b = await buildOrder(body, event, { card: true });
  if (Array.isArray(b)) return b;
  const { R, rid, order, lineItems, appFee, uid } = b;
  // Si Stripe ya aprobó la cuenta pero aún no lo sabíamos, se revisa aquí mismo.
  if (R.stripeAccount && !R.stripeReady) {
    try { if ((await acctStatus(R.stripeAccount)).ready) { R.stripeReady = true; await db().doc(`restaurants/${rid}`).update({ stripeReady: true }); } } catch (e) { console.warn("acctStatus", e.message); }
  }
  if (!R.stripeAccount || !R.stripeReady) return [409, { error: "Este negocio todavía no acepta tarjeta. Elige otra forma de pago." }];
  if (order.total < 0.5) return [400, { error: "El pago con tarjeta debe ser de al menos $0.50." }];

  Object.assign(order, { status: "pending", pay: "card", paid: false });
  const ref = db().collection(`restaurants/${rid}/orders`).doc();
  await ref.set(order);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    client_reference_id: ref.id,
    metadata: { rid, orderId: ref.id, num: order.num, uid: uid || "" },
    payment_intent_data: { description: `OnRoute · pedido #${order.num} · ${String(R.name || rid).slice(0, 60)}`, metadata: { rid, orderId: ref.id },
      ...(appFee ? { application_fee_amount: appFee } : {}) },
    success_url: `${SITE}?r=${rid}&pedido=${ref.id}&pago=ok`,
    cancel_url: `${SITE}?r=${rid}&pedido=${ref.id}&pago=cancelado`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
  }, { stripeAccount: R.stripeAccount });
  await ref.update({ sessionId: session.id, stripeAccount: R.stripeAccount });
  return [200, { url: session.url, orderId: ref.id }];
});
