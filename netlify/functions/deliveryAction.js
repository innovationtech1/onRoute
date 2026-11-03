// Acciones del repartidor sobre una entrega: aceptar, soltar, recogí, entregué.
// Todo se valida aquí (no en la página) para que dos repartidores no tomen la misma entrega
// y para que el pago al repartidor solo salga cuando de verdad entregó.
const { db, handler, userOf, payDriver } = require("../lib/onroute");

const carText = V => [V.make, V.model, V.color].filter(Boolean).join(" ");

exports.handler = handler("deliveryAction", async (body, event) => {
  const user = await userOf(event);
  if (!user) return [401, { error: "Inicia sesión con tu cuenta de repartidor.", detail: event.authErr || "" }];
  const id = String(body.id || "").replace(/[^A-Za-z0-9]/g, ""), action = String(body.action || "");
  if (!id || !["accept", "release", "arrived", "picked", "delivered"].includes(action)) return [400, { error: "Acción no válida." }];
  const ds = await db().doc(`drivers/${user.uid}`).get(), D = ds.exists ? ds.data() : null;
  if (!D || D.status !== "active") return [403, { error: "Tu cuenta de repartidor no está activa." }];
  const ref = db().doc(`deliveries/${id}`);

  if (action === "accept") {
    const manual = D.payout && D.payout.method === "manual" && D.payout.handle;
    if (!D.stripeReady && !manual) return [409, { error: "Elige cómo recibir tu dinero (banco, Cash App, Zelle o Venmo) antes de aceptar entregas." }];
    if (D.current && D.current !== id) {
      const cur = await db().doc(`deliveries/${D.current}`).get();
      if (cur.exists && ["assigned", "picked"].includes(cur.data().status) && cur.data().driverUid === user.uid) return [409, { error: "Termina tu entrega actual antes de aceptar otra." }];
    }
    const V = D.vehicle || {}, now = Date.now();
    const res = await db().runTransaction(async tx => {
      const s = await tx.get(ref);
      if (!s.exists) return [404, { error: "Esta entrega ya no existe." }];
      const d = s.data();
      if (d.status !== "searching") return [409, { error: d.driverUid === user.uid ? "Ya es tuya." : "Otro repartidor ya la tomó." }];
      const drv = { driverUid: user.uid, driverName: String(D.name || "").split(" ")[0].slice(0, 30), driverCar: carText(V).slice(0, 60), driverPlate: String(V.plate || "").slice(0, 12), assignedAt: now };
      tx.update(ref, { status: "assigned", ...drv });
      tx.update(db().doc(`drivers/${user.uid}`), { current: id });
      tx.update(db().doc(`restaurants/${d.rid}/orders/${id}`), { "delivery.status": "assigned", "delivery.driverName": drv.driverName, "delivery.driverCar": drv.driverCar, "delivery.driverPlate": drv.driverPlate });
      return [200, { ok: true }];
    });
    return res;
  }

  const s = await ref.get();
  if (!s.exists) return [404, { error: "Esta entrega ya no existe." }];
  const d = s.data();
  if (d.driverUid !== user.uid) return [403, { error: "Esta entrega no es tuya." }];
  const oref = db().doc(`restaurants/${d.rid}/orders/${id}`), now = Date.now();

  if (action === "release") {
    if (d.status !== "assigned") return [409, { error: "Ya recogiste el pedido; ya no puedes soltarlo." }];
    await ref.update({ status: "searching", driverUid: null, driverName: null, driverCar: null, driverPlate: null, assignedAt: null, driverLoc: null, arrivedAt: null });
    await db().doc(`drivers/${user.uid}`).update({ current: null });
    await oref.update({ "delivery.status": "searching", "delivery.arrivedAt": null, "delivery.driverName": null, "delivery.driverCar": null, "delivery.driverPlate": null });
    return [200, { ok: true }];
  }
  // El repartidor llegó al negocio: el negocio lo ve en su tablero (y el cliente en su pedido).
  if (action === "arrived") {
    if (d.status !== "assigned") return [409, { error: "Esta entrega ya no está en camino al negocio." }];
    if (!d.arrivedAt) { await ref.update({ arrivedAt: now }); await oref.update({ "delivery.arrivedAt": now }); }
    return [200, { ok: true }];
  }
  if (action === "picked") {
    if (d.status !== "assigned") return [409, { error: "Esta entrega no está lista para recoger." }];
    await ref.update({ status: "picked", pickedAt: now });
    await oref.update({ "delivery.status": "picked", status: "done" });
    return [200, { ok: true }];
  }
  // delivered
  if (d.status !== "picked") return [409, { error: "Primero marca que recogiste el pedido." }];
  await ref.update({ status: "delivered", deliveredAt: now, payout: "pending" });
  await db().doc(`drivers/${user.uid}`).update({ current: null });
  await oref.update({ "delivery.status": "delivered" });
  const pay = await payDriver(ref, { ...d, status: "delivered", payout: "pending" });
  return [200, { ok: true, payout: pay }];
});
