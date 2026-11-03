// Pedido que se paga a mano: Zelle, Cash App, efectivo (al recoger o al repartidor), o dos combinados.
// El total se calcula aquí con los precios reales. El pedido queda "await" (por confirmar) hasta que
// el negocio confirma que recibió el pago (o acepta el pedido en efectivo); entonces entra a la cocina
// y, si es a domicilio, se publica para los repartidores.
const { db, handler, r2 } = require("../lib/onroute");
const { buildOrder, payParts } = require("../lib/order");

exports.handler = handler("createOrder", async (body, event) => {
  const b = await buildOrder(body, event, { card: false });
  if (Array.isArray(b)) return b;
  const { R, rid, order, uid } = b;
  if (!(order.total > 0)) return [400, { error: "El pedido está vacío." }];
  const parts = payParts(body, R, order.total, !!order.delivery);
  if (parts.length === 2 && typeof parts[0] === "number") return parts;
  const ms = [...new Set(parts.map(p => p.m))];
  Object.assign(order, { status: "await", pay: ms.length > 1 ? "mixed" : ms[0], payParts: parts.map(p => ({ m: p.m, amt: r2(p.amt) })), paid: false });
  const ref = db().collection(`restaurants/${rid}/orders`).doc();
  await ref.set(order);
  if (uid) await db().doc(`users/${uid}/orders/${ref.id}`).set({ rid, rname: order.rname || rid, num: order.num, total: order.total, items: order.items, cart: order.cart || {}, pay: order.pay, createdAt: order.createdAt });
  return [200, { orderId: ref.id, num: order.num }];
});
