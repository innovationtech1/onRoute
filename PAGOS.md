# Pagos con tarjeta en OnRoute (Stripe Connect + Netlify)

La app sigue en **GitHub Pages** y los datos en **Firebase** (plan gratuito).
Solo el servidor de pagos vive en **Netlify** (plan gratuito): `https://onroute-pagos.netlify.app`.

## Cómo funciona
1. Cada negocio entra a **Perfil → Pagos con tarjeta → Conectar con Stripe** y llena sus datos en la página de Stripe (cuenta Standard).
   Cuando Stripe lo aprueba, el negocio queda con `stripeReady: true` y a sus clientes les aparece **Tarjeta ahora**.
2. El cliente paga: `createCheckout` recalcula el total con los precios reales, crea el pedido como `pending`
   y abre Stripe Checkout **en la cuenta del negocio**. El dinero llega directo al negocio y Stripe le cobra a él su comisión.
   OnRoute no cobra comisión.
3. Stripe avisa a `stripeWebhook`: el pedido pasa a `new`, `paid: true` y aparece en la cocina.
4. Si el cliente cancela, `cancelCheckout` marca el pedido `cancelled` y el carrito vuelve.

Los pedidos **Al recoger** se siguen creando desde la página (reglas de Firestore, `pay: "cash"`).
Las promociones por ahora solo aplican a pedidos Al recoger.

## Funciones (carpeta `netlify/functions`)
| Función | Qué hace |
|---|---|
| `createCheckout` | Crea el pedido y la sesión de pago en la cuenta del negocio |
| `cancelCheckout` | Cancela un pago pendiente |
| `stripeWebhook` | Recibe los avisos de Stripe (pagos y estado de cuentas) |
| `connectStart` | Crea la cuenta Stripe del negocio y le da el enlace de registro |
| `connectStatus` | Revisa si la cuenta del negocio ya puede cobrar |

## Variables de entorno en Netlify (nunca en GitHub ni en el chat)
Netlify → onroute-pagos → **Site configuration → Environment variables**:
- `STRIPE_SECRET_KEY`: llave secreta de Stripe (`sk_test_...` en pruebas).
- `FIREBASE_SERVICE_ACCOUNT`: contenido completo del archivo JSON que se descarga en
  Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.
- `STRIPE_WEBHOOK_SECRET`: secreto del webhook (`whsec_...`).

Después de agregar o cambiar una variable: Deploys → **Trigger deploy → Deploy site**.

## Webhook en Stripe
Stripe → Developers → Webhooks → **Add endpoint**:
- URL: `https://onroute-pagos.netlify.app/.netlify/functions/stripeWebhook`
- Escuchar eventos de **cuentas conectadas** (Connected accounts).
- Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`, `account.updated`.

## Tarjeta de prueba
`4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC y código postal.

## Pasar a dinero real
Activar la cuenta de Stripe de InnovationTECH, cambiar `STRIPE_SECRET_KEY` por la llave `sk_live_...`,
crear el webhook también en modo real y poner `window.ONROUTE_STRIPE_TEST = false` en `firebase-config.js`.
