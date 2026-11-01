# Pagos con tarjeta en OnRoute (Stripe)

## Cómo funciona
1. El cliente elige **Tarjeta ahora** y toca Pagar.
2. La página llama a `createCheckout` (Cloud Functions) con el enlace del negocio (`rid`). El servidor recalcula el total con los precios del menú de ese negocio, crea el pedido en `restaurants/{rid}/orders` como `pending` y abre la página de pago de Stripe.
3. Stripe avisa a `stripeWebhook` cuando el pago se completa: el pedido pasa a `new` con `paid: true` y aparece en la cocina.
4. Si el cliente cancela, `cancelCheckout` marca el pedido como `cancelled` y el carrito vuelve a la página.

Los pedidos **Al recoger** se siguen creando desde la página (reglas de Firestore, `pay: "cash"`).

Por ahora todos los cobros llegan a una sola cuenta de Stripe. Para que cada negocio reciba su dinero directo, el siguiente paso es Stripe Connect.

## Secretos (nunca en GitHub ni en la página)
- `STRIPE_SECRET_KEY`: llave secreta de Stripe (`sk_test_...` en pruebas).
- `STRIPE_WEBHOOK_SECRET`: secreto del webhook (`whsec_...`).

Se guardan con `firebase functions:secrets:set NOMBRE` desde Google Cloud Shell.

## Desplegar
```
git clone https://github.com/innovationtech1/onRoute.git
cd onRoute/functions && npm install && cd ..
npx firebase-tools@latest login --no-localhost
npx firebase-tools@latest functions:secrets:set STRIPE_SECRET_KEY
npx firebase-tools@latest deploy --only functions,firestore:rules,storage --project onroute-a6930
```
Después: crear el webhook en Stripe hacia `https://us-central1-onroute-a6930.cloudfunctions.net/stripeWebhook` (eventos `checkout.session.completed` y `checkout.session.expired`), guardar su secreto con `functions:secrets:set STRIPE_WEBHOOK_SECRET` y volver a desplegar solo funciones.

Al final, cambiar `window.ONROUTE_CARD_PAYMENTS = true` en `firebase-config.js`.

## Tarjeta de prueba
`4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC y código postal.
