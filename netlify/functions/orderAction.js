// El negocio confirma o rechaza un pedido que se paga a mano (Zelle, Cash App o efectivo).
// Solo el dueño del negocio. Al confirmar: entra a la cocina y, si es a domicilio, se publica para los repartidores.
const { db, handler, userOf, RID } = require("../lib/onroute");
const { publishDelivery } = require("../lib/order");

exports.handler = handler("orderAction", async (body, event) => {
  const user = await userOf(event);
  if (!user) return [401, { error: "Inicia sesión con la cuenta de tu negocio.", detail: event.authErr || "" }];
  const rid = String(body.rid || ""), oid = String(body.oid || "").replace(/[^A-Za-z0-9]/g, ""), action = String(body.action || "");
  if (!RID.test(rid) || !oid || !["confirm", "reject"].includes(action)) return [400, { error: "Acción no válida." }];
  const rs = await db().doc(`restaurants/${rid}`).get();
  if (!rs.exists || rs.data().ownerUid !== user.uid) return [403, { error: "Este pedido no es de tu negocio." }];
  const ref = db().doc(`restaurants/${rid}/orders/${oid}`);
  const now = Date.now();
  const res = await db().runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) return [404, { error: "El pedido ya no existe." }];
    const o = s.data();
    if (o.status !== "await") return [409, { error: "Este pedido ya fue confirmado o cancelado." }];
    if (action === "reject") { tx.update(ref, { status: "cancelled", cancelledAt: now }); return [200, { ok: true, o: null }]; }
    tx.update(ref, { status: "new", paidOk: true, confirmedAt: now });
    return [200, { ok: true, o }];
  });
  if (res[0] === 200 && res[1].o && res[1].o.delivery) await publishDelivery(rid, oid, res[1].o, now);
  if (res[0] === 200) delete res[1].o;
  return res;
});
