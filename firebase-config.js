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

// Servidor de pagos (Cloud Functions). La llave secreta de Stripe NO va aquí: vive en Secret Manager.
window.ONROUTE_API = "https://us-central1-onroute-a6930.cloudfunctions.net";
// Se activa cuando el servidor de pagos ya esté desplegado.
window.ONROUTE_CARD_PAYMENTS = false;
// true mientras uses las llaves de prueba de Stripe (sk_test_...).
window.ONROUTE_STRIPE_TEST = true;
