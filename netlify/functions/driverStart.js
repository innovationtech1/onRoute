// El repartidor aprobado conecta su banco con Stripe para recibir sus pagos por entrega
// (cuenta Express de Stripe Connect, Accounts v2, solo para recibir transferencias).
// Stripe le pide sus datos, su banco y le manda su 1099 de impuestos.
const { db, stripe, handler, userOf, SITE } = require("../lib/onroute");
const PREVIEW = process.env.STRIPE_PREVIEW_VERSION || "2026-10-28.preview";

exports.handler = handler("driverStart", async (body, event) => {
  const user = await userOf(event);
  if (!user) return [401, { error: "Inicia sesión con tu cuenta de repartidor.", detail: event.authErr || "" }];
  const ref = db().doc(`drivers/${user.uid}`), snap = await ref.get();
  const D = snap.exists ? snap.data() : null;
  if (!D) return [404, { error: "Primero completa tu registro de repartidor." }];
  if (D.status !== "active") return [403, { error: "Tu cuenta de repartidor todavía no está aprobada." }];

  let acct = D.stripeAccount;
  if (!acct) {
    const base = {
      display_name: String(D.name || "Repartidor OnRoute").slice(0, 60),
      contact_email: user.email || undefined,
      dashboard: "express",
      identity: { country: "us", entity_type: "individual" },
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      metadata: { driverUid: user.uid },
    };
    const defaults = r => ({ currency: "usd", locales: ["es-419", "en-US"],
      profile: { business_url: SITE, product_description: "Repartidor independiente: entrega de pedidos de comida con OnRoute" }, responsibilities: r });
    let a;
    try {
      // OnRoute asume las pérdidas (solo si completó el "loss liability" en el Platform profile de Stripe).
      a = await stripe().v2.core.accounts.create({ ...base, defaults: defaults({ fees_collector: "application", losses_collector: "application" }) });
    } catch (e) {
      if (!/losses.?collector|loss liability|negative balance/i.test(String(e.message || ""))) throw e;
      // Si no, Stripe administra el riesgo (Managed Risk). Con el panel Express eso usa la versión preview de la API.
      try {
        a = await stripe().v2.core.accounts.create({ ...base, defaults: defaults({ fees_collector: "stripe", losses_collector: "stripe" }) }, { apiVersion: PREVIEW });
      } catch (e2) {
        console.warn("driverStart express+stripe falló, uso panel completo", e2.message);
        a = await stripe().v2.core.accounts.create({ ...base, dashboard: "full", defaults: defaults({ fees_collector: "stripe", losses_collector: "stripe" }) });
      }
    }
    acct = a.id;
    await ref.update({ stripeAccount: acct, stripeReady: false });
  }
  const link = await stripe().v2.core.accountLinks.create({
    account: acct,
    use_case: { type: "account_onboarding", account_onboarding: { refresh_url: `${SITE}?stripe=retry#repartir`, return_url: `${SITE}?stripe=back#repartir` } },
  });
  return [200, { url: link.url }];
});
