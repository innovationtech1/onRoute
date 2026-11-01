// El dueño de un negocio conecta su cuenta de Stripe (Stripe Connect, cuenta Standard).
// Si aún no tiene, se le crea una; Stripe le pide sus datos y su cuenta de banco en su propia página.
const { db, stripe, handler, userOf, SITE, RID } = require("../lib/onroute");

exports.handler = handler("connectStart", async (body, event) => {
  const user = await userOf(event);
  if (!user) return [401, { error: "Inicia sesión con la cuenta del negocio.", detail: event.authErr || "" }];
  const rid = String(body.rid || "");
  if (!RID.test(rid)) return [400, { error: "Negocio no válido." }];
  const ref = db().doc(`restaurants/${rid}`), snap = await ref.get();
  const R = snap.exists ? snap.data() : null;
  if (!R || R.ownerUid !== user.uid) return [403, { error: "Solo el dueño del negocio puede conectar Stripe." }];

  let acct = R.stripeAccount;
  if (!acct) {
    const a = await stripe().accounts.create({
      type: "standard", country: "US", email: user.email || undefined,
      business_profile: { name: String(R.name || rid).slice(0, 60), url: `${SITE}?r=${rid}` },
      metadata: { rid, ownerUid: user.uid },
    });
    acct = a.id;
    await ref.update({ stripeAccount: acct, stripeReady: false });
  }
  const back = SITE;
  const link = await stripe().accountLinks.create({ account: acct, type: "account_onboarding", refresh_url: `${back}?stripe=retry#panel`, return_url: `${back}?stripe=back#panel` });
  return [200, { url: link.url }];
});
