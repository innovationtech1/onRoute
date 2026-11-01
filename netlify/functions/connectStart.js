// El dueño de un negocio conecta su cuenta de Stripe (Stripe Connect, Accounts v2).
// La cuenta tiene panel completo de Stripe; Stripe le cobra al negocio sus comisiones y asume las pérdidas
// (equivale a una cuenta "Standard"). Stripe le pide sus datos y su cuenta de banco en su propia página.
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
    const a = await stripe().v2.core.accounts.create({
      display_name: String(R.name || rid).slice(0, 60),
      contact_email: user.email || undefined,
      dashboard: "full",
      identity: { country: "us" },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: {
        currency: "usd",
        locales: ["es-419", "en-US"],
        profile: { business_url: `${SITE}?r=${rid}`, product_description: "Venta de comida para llevar (pedidos en línea con OnRoute)" },
        responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
      },
      metadata: { rid, ownerUid: user.uid },
    });
    acct = a.id;
    await ref.update({ stripeAccount: acct, stripeReady: false });
  }
  const link = await stripe().v2.core.accountLinks.create({
    account: acct,
    use_case: { type: "account_onboarding", account_onboarding: { refresh_url: `${SITE}?stripe=retry#panel`, return_url: `${SITE}?stripe=back#panel` } },
  });
  return [200, { url: link.url }];
});
