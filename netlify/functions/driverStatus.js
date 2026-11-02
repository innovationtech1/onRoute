// Revisa con Stripe si el repartidor ya puede recibir pagos, y lo guarda en su perfil.
const { db, handler, userOf, recipientStatus } = require("../lib/onroute");

exports.handler = handler("driverStatus", async (body, event) => {
  const user = await userOf(event);
  if (!user) return [401, { error: "Inicia sesión con tu cuenta de repartidor.", detail: event.authErr || "" }];
  const ref = db().doc(`drivers/${user.uid}`), snap = await ref.get();
  const D = snap.exists ? snap.data() : null;
  if (!D || !D.stripeAccount) return [200, { connected: false, ready: false }];
  const st = await recipientStatus(D.stripeAccount);
  if (st.ready !== !!D.stripeReady) await ref.update({ stripeReady: st.ready });
  return [200, { connected: true, ...st }];
});
