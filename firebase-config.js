// Configuración de la app web "OnRoute" en el proyecto de Firebase onroute-a6930.
// Estos datos no son secretos: Firebase los diseñó para ir en la página.
// La seguridad la dan las reglas de Firestore (firestore.rules).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC-O4XHIYUztEKw9Yr2VZjU34sKK6r8HpM",
  authDomain: "onroute-a6930.firebaseapp.com",
  projectId: "onroute-a6930",
  storageBucket: "onroute-a6930.firebasestorage.app",
  messagingSenderId: "352775036414",
  appId: "1:352775036414:web:a896d309aeef40589074af",
  measurementId: "G-2EVG253WCF"
};

// Servidor de pagos (Netlify Functions + Stripe Connect). Las llaves secretas NO van aquí:
// viven en las variables de entorno de Netlify.
window.ONROUTE_API = "https://onroute-pagos.netlify.app/.netlify/functions";
// Encendido: la opción de tarjeta solo aparece en los negocios que ya conectaron su cuenta de Stripe.
window.ONROUTE_CARD_PAYMENTS = true;
// true mientras uses las llaves de prueba de Stripe (sk_test_...).
window.ONROUTE_STRIPE_TEST = true;

// App Check (reCAPTCHA Enterprise): comprueba que quien usa tu Firebase es la app de OnRoute y no otro programa.
// Esta llave de sitio NO es secreta. Vacío = App Check apagado.
window.ONROUTE_APPCHECK_SITE_KEY = "6LfXegsuAAAAAH1jUzGU_umhaZgkXwFcGNvd4HI_";
// true = reCAPTCHA Enterprise (lo que pide Firebase ahora); false = reCAPTCHA v3 clásico.
window.ONROUTE_APPCHECK_ENTERPRISE = true;
