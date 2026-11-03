// Función programada (cada hora): paga a los repartidores las entregas que quedaron pendientes
// porque todavía no había saldo disponible en la cuenta de Stripe de OnRoute.
const { db, payDriver } = require("../lib/onroute");

exports.handler = async () => {
  const snap = await db().collection("deliveries").where("payout", "==", "pending").limit(50).get();
  let paid = 0, pending = 0;
  for (const doc of snap.docs) {
    const r = await payDriver(doc.ref, doc.data());
    if (r === "paid") paid++; else if (r === "pending") pending++; // "manual": lo paga el administrador
  }
  console.log(`payDrivers: ${paid} pagadas, ${pending} pendientes`);
  return { statusCode: 200, body: JSON.stringify({ paid, pending }) };
};
