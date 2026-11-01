// Revisa con Stripe si la cuenta del negocio ya puede cobrar, y lo guarda en el negocio.
const { db, stripe, handler, userOf, RID } = require("../lib/onroute");

exports.handler = handler("connectStatus", async (body, event) => {
  const user = await userOf(event);
  if (!user) return [401, { error: "Inicia sesión con la cuenta del negocio.", detail: event.authErr || "" }];
  const rid = String(body.rid || "");
  if (!RID.test(rid)) return [400, { error: "Negocio no válido." }];
  const ref = db().doc(`restaurants/${rid}`), snap = await ref.get();
  const R = snap.exists ? snap.data() : null;
  if (!R || R.ownerUid !== user.uid) return [403, { error: "Solo el dueño del negocio puede ver esto." }];
  if (!R.stripeAccount) return [200, { connected: false, ready: false }];
  const a = await stripe().accounts.retrieve(R.stripeAccount);
  const ready = !!(a.charges_enabled && a.details_submitted);
  if (ready !== !!R.stripeReady) await ref.update({ stripeReady: ready });
  return [200, { connected: true, ready, pending: (a.requirements && a.requirements.currently_due || []).length }];
});
