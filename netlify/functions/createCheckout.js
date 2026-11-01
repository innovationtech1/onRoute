// El cliente paga con tarjeta: se calcula el total con los precios reales del menú,
// se crea el pedido como "pending" y se abre Stripe Checkout en la cuenta de Stripe del negocio (Connect).
// El dinero llega directo al negocio y Stripe le cobra a él su comisión; OnRoute no se queda con nada.
const { db, stripe, handler, userOf, acctStatus, inHours, truckLive, SITE, RID } = require("../lib/onroute");

function menuFromDb(items) {
  return (items || []).filter(x => x && x.id && Array.isArray(x.opts) && x.opts.length).map(x => ({
    id: String(x.id), name: String(x.name || ""), soldOut: !!x.soldOut, noExtras: !!x.noExtras,
    opts: x.opts.map(o => ({ label: String(o.label || ""), price: Number(o.price) || 0 })),
  }));
}

exports.handler = handler("createCheckout", async (body, event) => {
  const who = String(body.name || "").trim().slice(0, 40);
  const pickup = body.pickup === "30" ? "30" : "asap";
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
  // Si Stripe ya aprobó la cuenta pero aún no lo sabíamos, se revisa aquí mismo.
  if (R.stripeAccount && !R.stripeReady) {
    try { if ((await acctStatus(R.stripeAccount)).ready) { R.stripeReady = true; await db().doc(`restaurants/${rid}`).update({ stripeReady: true }); } } catch (e) { console.warn("acctStatus", e.message); }
  }
  if (!R.stripeAccount || !R.stripeReady) return [409, { error: "Este negocio todavía no acepta tarjeta. Elige Pagar al recoger." }];
  const variant = R.variant && R.variant.label && Number(R.variant.discount) > 0 ? { label: String(R.variant.label), discount: Number(R.variant.discount) } : null;

  // El total se calcula aquí: lo que mande el navegador no cuenta.
  const ms = await db().doc(`restaurants/${rid}/menu/main`).get();
  const md = ms.exists ? ms.data() : {};
  const menu = menuFromDb(md.items);
  const extras = (Array.isArray(md.extras) ? md.extras : []).map(e => ({ id: String(e.id), label: String(e.label || ""), price: Math.max(0, Number(e.price) || 0) }));
  const items = [], lineItems = [], cartMap = {};
  let total = 0;
  for (const it of cart) {
    const [id, oi, v, ex] = String(it.key || "").split("|");
    const qty = Math.floor(Number(it.qty));
    const m = menu.find(x => x.id === id), o = m && m.opts[Number(oi)], vr = v === "1" ? variant : null;
    if (!m || !o || (v === "1" && !vr) || !(qty >= 1 && qty <= 20)) return [400, { error: "Un producto del carrito ya no existe. Recarga el menú." }];
    if (m.soldOut) return [409, { error: `${m.name} está agotado.` }];
    const exs = (ex ? ex.split(".") : []).map(eid => extras.find(e => e.id === eid));
    if (exs.some(e => !e) || (exs.length && m.noExtras)) return [400, { error: "Un extra del carrito ya no existe. Recarga el menú." }];
    const price = Math.round((o.price - (vr ? vr.discount : 0) + exs.reduce((a, e) => a + e.price, 0)) * 100) / 100;
    if (!(price > 0)) return [400, { error: "Precio no válido." }];
    const label = `${m.name}${m.opts.length > 1 ? " · " + o.label : ""}${vr ? " · " + vr.label : ""}${exs.length ? " · + " + exs.map(e => e.label).join(", ") : ""}`.slice(0, 160);
    items.push({ name: label, qty });
    cartMap[`${id}|${Number(oi)}|${vr ? 1 : 0}${ex ? "|" + ex : ""}`] = qty;
    lineItems.push({ quantity: qty, price_data: { currency: "usd", unit_amount: Math.round(price * 100), product_data: { name: label } } });
    total += price * qty;
  }
  total = Math.round(total * 100) / 100;
  if (total < 0.5) return [400, { error: "El pago con tarjeta debe ser de al menos $0.50." }];
  if (total >= 1000) return [400, { error: "El pedido es demasiado grande." }];

  const ref = db().collection(`restaurants/${rid}/orders`).doc();
  const num = "T" + String(Math.floor(100 + Math.random() * 900));
  const order = { num, who, items, total, status: "pending", pickup, pay: "card", paid: false, createdAt: Date.now() };
  const note = String(body.note || "").trim().slice(0, 200); if (note) order.note = note;
  if (uid) { order.uid = uid; order.cart = cartMap; order.rname = String(R.name || "").slice(0, 60); }
  await ref.set(order);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    client_reference_id: ref.id,
    metadata: { rid, orderId: ref.id, num, uid: uid || "" },
    payment_intent_data: { description: `OnRoute · pedido #${num} · ${String(R.name || rid).slice(0, 60)}`, metadata: { rid, orderId: ref.id } },
    success_url: `${SITE}?r=${rid}&pedido=${ref.id}&pago=ok`,
    cancel_url: `${SITE}?r=${rid}&pedido=${ref.id}&pago=cancelado`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
  }, { stripeAccount: R.stripeAccount });
  await ref.update({ sessionId: session.id, stripeAccount: R.stripeAccount });
  return [200, { url: session.url, orderId: ref.id }];
});
