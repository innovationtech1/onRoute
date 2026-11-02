// El repartidor aprobado conecta su banco con Stripe para recibir sus pagos por entrega
// (cuenta Express de Stripe Connect, Accounts v2, solo para recibir transferencias).
// Stripe le pide sus datos, su banco y le manda su 1099 de impuestos.
const { db, stripe, handler, userOf, SITE } = require("../lib/onroute");

exports.handler = handler("driverStart", async (body, event) => {
  const user = await userOf(event);
  if (!user) return [401, { error: "Inicia sesión con tu cuenta de repartidor.", detail: event.authErr || "" }];
  const ref = db().doc(`drivers/${user.uid}`), snap = await ref.get();
  const D = snap.exists ? snap.data() : null;
  if (!D) return [404, { error: "Primero completa tu registro de repartidor." }];
  if (D.status !== "active") return [403, { error: "Tu cuenta de repartidor todavía no está aprobada." }];

  let acct = D.stripeAccount;
  if (!acct) {
    const a = await stripe().v2.core.accounts.create({
      display_name: String(D.name || "Repartidor OnRoute").slice(0, 60),
      contact_email: user.email || undefined,
      dashboard: "express",
      identity: { country: "us", entity_type: "individual" },
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      defaults: {
        currency: "usd",
        locales: ["es-419", "en-US"],
        profile: { business_url: SITE, product_description: "Repartidor independiente: entrega de pedidos de comida con OnRoute" },
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      metadata: { driverUid: user.uid },
    });
    acct = a.id;
    await ref.update({ stripeAccount: acct, stripeReady: false });
  }
  const link = await stripe().v2.core.accountLinks.create({
    account: acct,
    use_case: { type: "account_onboarding", account_onboarding: { refresh_url: `${SITE}?stripe=retry#repartir`, return_url: `${SITE}?stripe=back#repartir` } },
  });
  return [200, { url: link.url }];
});
