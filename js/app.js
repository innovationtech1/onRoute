/* OnRoute by InnovationTECH: directorio de food trucks y restaurantes con pedidos directos.
   Vistas: Explorar (inicio), página de un negocio (?r=<id>) y Mi negocio (#panel). */
"use strict";
(function () {
  // ---------------------------------------------------------------- utilidades
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "$" + Number(n || 0).toFixed(2);
  const safeUrl = u => (typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : "");
  const safeImg = u => (typeof u === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) ? u : safeUrl(u));
  const safePhoto = u => (typeof u === "string" && /^fs:[A-Za-z0-9_-]{1,80}$/.test(u) ? u : safeImg(u));
  const num = (v, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);
  const COMMISSION = 0.25;
  const BASE = location.origin + location.pathname.replace(/index\.html$/, "");
  const KIND = { truck: "Food truck", restaurant: "Restaurante" };
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slugify = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  const initials = s => (String(s || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("") || "?").toUpperCase();
  const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function ago(t) { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); if (m < 1) return "ahora"; if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`; }
  function miles(a, b) {
    const R = 3958.8, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // Entrega a domicilio (el servidor de pagos calcula el precio final con estos mismos números).
  const DLV = { base: 2.99, perMile: 1.25, minFee: 3.99, maxMiles: 8, roadFactor: 1.3, driverShare: 0.8 };
  const r2 = n => Math.round(n * 100) / 100;
  const dlvFee = mi => r2(Math.max(DLV.minFee, DLV.base + DLV.perMile * mi));
  const roadMi = (a, b) => r2(miles(a, b) * DLV.roadFactor);
  const fmtMi = m => (m < 0.1 ? "a pasos" : m < 10 ? m.toFixed(1) + " mi" : Math.round(m) + " mi");
  const ls = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
  };
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    orders: ic('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
    menu: ic('<path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z"/><path d="M3 7.5V16.5L12 21l9-4.5V7.5M12 12v9"/>'),
    rep: ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 17v-4M12 17V8M16 17v-6"/>'),
    prof: ic('<path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/><circle cx="12" cy="8" r="4"/>'),
    adm: ic('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>'),
    pin: ic('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    cash: ic('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
    bag: ic('<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
    pig: ic('<path d="M5 11a7 6 0 0 1 13-2h1.5v3H19a7 6 0 0 1-3 4v3h-3v-2h-2v2H8v-3a6 6 0 0 1-3-5z"/>'),
    alert: ic('<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17v.01"/>'),
    power: ic('<path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>'),
    search: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    target: ic('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>'),
    car: ic('<path d="M5 17h14M3 17v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4"/><path d="M3 13h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'),
    food: ic('<path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9"/><path d="M17 21V3c-2 0-3.5 2.5-3.5 6s1.5 4.5 3.5 4.5"/>'),
    store: ic('<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>'),
    tag: ic('<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
    help: ic('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.01"/>'),
    chat: ic('<path d="M4 5h16v11H9l-5 4V5z"/>'),
    down: ic('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    share: ic('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    gift: ic('<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>'),
  };

  let toastT = null;
  function toast(msg) { const t = $("#toast"); if (!t) return; try { S.toastChat = null; } catch (e) {} t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 5000); }
  function netState() { const nb = $("#netbar"); if (nb) nb.hidden = navigator.onLine !== false; }
  window.addEventListener("online", netState);
  window.addEventListener("offline", netState);
  netState();
  window.addEventListener("unhandledrejection", e => console.error("OnRoute:", e.reason));

  // Repinta sin perder el foco ni la posición del cursor en el campo donde se escribe.
  function paint(fn) {
    const ae = document.activeElement, id = ae && ae.id;
    let a = null, b = null;
    try { a = ae.selectionStart; b = ae.selectionEnd; } catch (e) {}
    try { fn(); } catch (e) { console.error("OnRoute: error al dibujar", e); }
    if (id && document.activeElement !== ae) {
      const el = document.getElementById(id);
      if (el && el !== ae) { el.focus({ preventScroll: true }); try { if (a != null) el.setSelectionRange(a, b); } catch (e) {} }
    }
  }

  // ---------------------------------------------------------------- Firebase
  let db = null, auth = null, storage = null;
  try {
    if (window.FIREBASE_CONFIG && window.firebase) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      // App Check: se activa solo cuando hay llave de reCAPTCHA en firebase-config.js.
      if (window.ONROUTE_APPCHECK_SITE_KEY && firebase.appCheck) {
        try {
          if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // pruebas locales
          const P = window.ONROUTE_APPCHECK_ENTERPRISE ? firebase.appCheck.ReCaptchaEnterpriseProvider : firebase.appCheck.ReCaptchaV3Provider;
          firebase.appCheck().activate(new P(window.ONROUTE_APPCHECK_SITE_KEY), true);
        } catch (e) { console.warn("OnRoute: App Check", e); }
      }
      db = firebase.firestore();
      auth = firebase.auth();
      try { storage = firebase.storage(); } catch (e) { storage = null; }
      if (window.ONROUTE_EMULATORS) {
        db.useEmulator("127.0.0.1", 8080);
        auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true });
        if (storage) storage.useEmulator("127.0.0.1", 9199);
      }
    }
  } catch (e) { console.error("OnRoute: Firebase", e); db = null; }
  if (!db) {
    $("#stage").innerHTML = `<div class="fatal"><h2>No se pudo conectar</h2><p class="hint">Revisa tu conexión a internet y vuelve a abrir OnRoute.</p></div>`;
    return;
  }
  // Tarjeta solo si el servidor de pagos está encendido y este negocio ya conectó su cuenta de Stripe.
  const cardOn = () => !!(window.ONROUTE_CARD_PAYMENTS && window.ONROUTE_API && S.R && S.R.stripeReady === true);
  // Formas de pago: tarjeta (Stripe) y a mano (Zelle, Cash App, efectivo). A mano se pueden combinar dos.
  const PAYN = { card: "Tarjeta", zelle: "Zelle", cashapp: "Cash App", cash: "Efectivo" };
  // Apple Pay y Google Pay van dentro del pago con tarjeta de Stripe: la página de pago los muestra sola
  // cuando el celular o navegador los tiene configurados. Aquí solo se destaca el que tiene el cliente.
  const WALLET = (() => { const ua = navigator.userAgent || ""; return /iPhone|iPad|iPod|Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/.test(ua) ? "Apple Pay" : /Android|Chrome/.test(ua) ? "Google Pay" : ""; })();
  function manualOf(R, dl) {
    const P = (R && R.payments) || {}, out = [];
    if (dl ? P.cashDelivery !== false : P.cash !== false) out.push("cash");
    if (window.ONROUTE_API && P.zelle) out.push("zelle");
    if (window.ONROUTE_API && P.cashapp) out.push("cashapp");
    return dl && !window.ONROUTE_API ? [] : out;
  }
  function payMethods(R, dl) { const c = window.ONROUTE_CARD_PAYMENTS && window.ONROUTE_API && R && R.stripeReady === true; return (c ? ["card"] : []).concat(manualOf(R, dl)); }
  const payLine = o => Array.isArray(o.payParts) && o.payParts.length ? o.payParts.map(p => `${PAYN[p.m] || p.m} ${money(p.amt)}`).join(" + ") : o.paid ? "Tarjeta" : "Efectivo";
  const cashOf = o => Array.isArray(o.payParts) ? r2(o.payParts.filter(p => p.m === "cash").reduce((a, p) => a + num(p.amt), 0)) : (o.paid ? 0 : num(o.total));
  const cashAppLink = (tag, amt) => `https://cash.app/${encodeURIComponent(String(tag).replace(/^\$?/, "$"))}/${Number(amt).toFixed(2)}`;
  // Regreso desde Stripe después de conectar la cuenta del negocio (?stripe=back#panel).
  const stripeBack = (() => { try { const q = new URLSearchParams(location.search), v = q.get("stripe"); if (v) { q.delete("stripe"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } return v || ""; } catch (e) { return ""; } })();

  // ---------------------------------------------------------------- estado
  const S = {
    route: { name: "home" },
    // Explorar
    rests: [], restsReady: false, dirErr: false, me: ls.get("onroute-me"), locMsg: "", q: "", filter: "all", dirMode: "list", hover: null,
    // Página de un negocio
    rid: null, R: null, Rerr: null, Rmenu: [], RmenuReady: false,
    cart: {}, pick: {}, vsel: {}, cat: "", view: "menu", pickup: "asap", name: ls.get("onroute-name", ""), payMode: "card",
    mode: ls.get("onroute-mode", "") || "", busy: false, payErr: "", myOrder: null, mine: null, mineReady: false,
    // Mi negocio
    user: null, authReady: false, authMsg: "", isAdmin: false, my: null, myReady: false, myMenu: [], myMenuReady: false,
    orders: [], ordersReady: false, ktab: "orders", reg: { kind: "truck" }, regMsg: "", regBusy: false,
    meDraft: null, meCfg: null, meDirty: false, meSaving: false, meMsg: "", meMsgCls: "", uploading: {},
    hRange: "today", hq: "", pf: null, pfDirty: false, pfMsg: "", all: [], allReady: false,
    // Cuentas y roles
    profile: null, profileReady: false, authRole: null, authName: "", returnTo: null, hist: [], histReady: false, atab: "orders", acctMsg: "",
    users: [], usersReady: false, admTab: "sum", stats: null, statsBusy: false,
  };

  // ---------------------------------------------------------------- menú: normalizar y precios
  function normMenu(items) {
    return (Array.isArray(items) ? items : [])
      .filter(x => x && x.id && Array.isArray(x.opts) && x.opts.length)
      .map(x => ({
        id: String(x.id), cat: String(x.cat || "Menú").slice(0, 30), name: String(x.name || ""), desc: String(x.desc || ""),
        photo: safePhoto(x.photo), soldOut: !!x.soldOut, noExtras: !!x.noExtras,
        opts: x.opts.map(o => (Array.isArray(o) ? { label: String(o[1] || ""), detail: String(o[2] || ""), price: num(Number(o[3])) } : { label: String(o.label || ""), detail: String(o.detail || ""), price: num(Number(o.price)) })),
      }));
  }
  function normExtras(arr) {
    return (Array.isArray(arr) ? arr : []).filter(x => x && x.id && String(x.label || "").trim()).slice(0, 20)
      .map(x => ({ id: String(x.id).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20), label: String(x.label).slice(0, 30), price: Math.max(0, num(Number(x.price))) }));
  }
  const variantOf = R => (R && R.variant && R.variant.label && num(R.variant.discount) > 0 ? { label: String(R.variant.label), discount: num(R.variant.discount) } : null);
  const menuCats = menu => { const c = []; menu.forEach(m => { if (!c.includes(m.cat)) c.push(m.cat); }); return c; };
  // Clave de cada renglón del carrito: platillo|opción|variante|extras (ej. "orig|0|1|agu.que").
  function parseKey(k, menu = S.Rmenu, R = S.R, extras = S.Rextras) {
    const [id, oi, v, ex] = k.split("|");
    const m = menu.find(x => x.id === id); if (!m) throw new Error("gone");
    const o = m.opts[Number(oi)]; if (!o) throw new Error("gone");
    const vr = v === "1" ? variantOf(R) : null; if (v === "1" && !vr) throw new Error("gone");
    const exs = (ex ? ex.split(".") : []).map(eid => { const e = (extras || []).find(x => x.id === eid); if (!e || m.noExtras) throw new Error("gone"); return e; });
    const price = Math.round((o.price - (vr ? vr.discount : 0) + exs.reduce((a, e) => a + e.price, 0)) * 100) / 100;
    const label = `${m.name}${m.opts.length > 1 ? " · " + o.label : ""}${vr ? " · " + vr.label : ""}${exs.length ? " · + " + exs.map(e => e.label).join(", ") : ""}`;
    return { m, o, oi: Number(oi), v: !!vr, exs, price, label };
  }
  const itemExtras = m => (m && !m.noExtras ? S.Rextras || [] : []);
  const cartCount = () => Object.values(S.cart).reduce((a, b) => a + b, 0);
  const subtotal = () => Object.entries(S.cart).reduce((a, [k, q]) => { try { return a + parseKey(k).price * q; } catch (e) { return a; } }, 0);
  function pruneCart() { for (const k of Object.keys(S.cart)) { try { const p = parseKey(k); if (p.m.soldOut) delete S.cart[k]; } catch (e) { delete S.cart[k]; } } }

  // ---------------------------------------------------------------- promociones y clientes frecuentes
  const cleanCode = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  // Promociones del negocio. Sin código se aplican solas; con código, solo si el cliente lo escribe.
  function promosOf(R, all) {
    return (R && Array.isArray(R.promos) ? R.promos : []).filter(p => p && p.id).slice(0, 10).map(p => ({
      id: String(p.id), title: String(p.title || "").slice(0, 40), kind: p.kind === "off" ? "off" : "pct",
      value: Math.max(0, num(Number(p.value))), min: Math.max(0, num(Number(p.min))), code: cleanCode(p.code), on: p.on !== false,
    })).filter(p => all || (p.on && p.value > 0 && (p.kind === "off" || p.value <= 90)));
  }
  const promoText = p => (p.kind === "pct" ? `${p.value}% de descuento` : `${money(p.value)} de descuento`);
  const promoShort = p => (p.kind === "pct" ? `${p.value}% off` : `−${money(p.value)}`);
  const promoDesc = p => `${p.title ? p.title + " · " : ""}${promoText(p)}${p.min ? ` en pedidos desde ${money(p.min)}` : ""}`;
  function promoOff(p, sub) { if (!(sub > 0) || sub < p.min) return 0; const off = p.kind === "pct" ? (sub * p.value) / 100 : p.value; return Math.round(Math.min(off, sub) * 100) / 100; }
  // La que más ahorra entre las automáticas y la del código escrito.
  function bestPromo(R, sub, code) {
    let best = null;
    promosOf(R).forEach(p => { if (p.code && p.code !== code) return; const off = promoOff(p, sub); if (off > 0 && (!best || off > best.off)) best = { p, off }; });
    return best;
  }
  const autoPromos = R => promosOf(R).filter(p => !p.code);
  function loyaltyOf(R) {
    const l = R && R.loyalty; if (!l || !l.on) return null;
    const every = Math.round(num(Number(l.every), 0)), reward = String(l.reward || "").trim().slice(0, 60);
    return every >= 2 && every <= 20 && reward ? { every, reward } : null;
  }
  // Tarjeta de sellos del cliente con cuenta: cada pedido suyo en este negocio es un sello.
  // Al completar la tarjeta, su siguiente pedido lleva el premio.
  function myStamps(rid, L) {
    if (!L || !S.user || !S.histReady) return null;
    const n = S.hist.filter(o => o.rid === rid).length, ready = n > 0 && n % L.every === 0;
    return { n, have: ready ? L.every : n % L.every, ready };
  }

  // ---------------------------------------------------------------- negocios: posición y estado
  function restPos(r) {
    if (r.kind === "truck" && r.loc && typeof r.loc.lat === "number" && typeof r.loc.lng === "number") return { lat: r.loc.lat, lng: r.loc.lng };
    if (typeof r.lat === "number" && typeof r.lng === "number") return { lat: r.lat, lng: r.lng };
    return null;
  }
  const truckLive = r => !!(r.kind === "truck" && r.loc && r.loc.sharing && Date.now() - num(r.loc.updatedAt) < 15 * 60000);
  // ---------- Horario ----------
  // restaurants/{id}.hours = { tz, days: [dom..sáb] }, cada día { open:"10:00", close:"18:00" } o { closed:true }.
  // Si el negocio no lo ha puesto: lunes a sábado 10 am – 6 pm, domingo cerrado (hora de San Antonio).
  const TZ = "America/Chicago";
  const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const WEEK = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
  const DEF_HOURS = { tz: TZ, days: [0, 1, 2, 3, 4, 5, 6].map(i => i === 0 ? { closed: true } : { open: "10:00", close: "18:00" }) };
  const okT = t => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  function hoursOf(r) {
    const h = r && r.hours;
    if (!h || !Array.isArray(h.days) || h.days.length !== 7) return DEF_HOURS;
    return { tz: typeof h.tz === "string" && h.tz ? h.tz : TZ, days: h.days.map(d => d && !d.closed && okT(d.open) && okT(d.close) ? { open: d.open, close: d.close } : { closed: true }) };
  }
  const mins = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  function nowIn(tz) {
    try {
      const p = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).forEach(x => p[x.type] = x.value);
      return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
    } catch (e) { const d = new Date(); return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function inHours(r) {
    const h = hoursOf(r), n = nowIn(h.tz), t = h.days[n.day], y = h.days[(n.day + 6) % 7];
    if (!t.closed) { const o = mins(t.open), c = mins(t.close); if (c > o ? n.min >= o && n.min < c : n.min >= o) return true; }
    // turno que pasa la medianoche (ej. 6 pm – 2 am)
    if (!y.closed && mins(y.close) <= mins(y.open) && n.min < mins(y.close)) return true;
    return false;
  }
  function fmt12(t) { const h = Number(t.slice(0, 2)), m = t.slice(3), hh = h % 12 || 12; return `${hh}${m !== "00" ? ":" + m : ""} ${h < 12 ? "am" : "pm"}`; }
  const dayText = d => d.closed ? "Cerrado" : d.open === "00:00" && (d.close === "23:59" || d.close === "00:00") ? "Abierto todo el día" : `${fmt12(d.open)} – ${fmt12(d.close)}`;
  function nextOpen(r) {
    const h = hoursOf(r), n = nowIn(h.tz);
    for (let k = 0; k < 8; k++) {
      const i = (n.day + k) % 7, d = h.days[i];
      if (d.closed || (k === 0 && mins(d.open) <= n.min)) continue;
      return `Abre ${k === 0 ? "hoy" : k === 1 ? "mañana" : DAYS[i].toLowerCase()} ${fmt12(d.open)}`;
    }
    return "";
  }
  const isOpen = r => !!r && !r.paused && inHours(r) && (r.kind !== "truck" || truckLive(r));
  function openText(r) {
    if (isOpen(r)) return r.kind === "truck" ? "Abierto · en ruta" : "Abierto";
    if (r.paused) return "No recibe pedidos ahora";
    if (!inHours(r)) { const nx = nextOpen(r); return nx ? `Cerrado · ${nx}` : "Cerrado"; }
    return "Fuera de ruta";
  }
  function logoHTML(r, cls = "rlogo") {
    const u = safeImg(r && r.logoUrl);
    return `<span class="${cls}">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : esc(initials(r && r.name))}</span>`;
  }

  // ---------------------------------------------------------------- mapas (Leaflet)
  const hasL = () => !!window.L;
  function makeMap(el, opts = {}) {
    if (!hasL() || !el) return null;
    const m = L.map(el, { zoomControl: opts.zoom !== false, scrollWheelZoom: opts.wheel !== false, attributionControl: true }).setView(opts.center || [29.4241, -98.4936], opts.zoomLevel || 11);
    m.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    try { new ResizeObserver(() => m.invalidateSize()).observe(el); } catch (e) {}
    return m;
  }
  const pinIcon = (r, cls = "") => L.divIcon({ className: "", iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -36],
    html: `<div class="pin ${cls}">${safeImg(r.logoUrl) ? `<img src="${esc(safeImg(r.logoUrl))}" alt="">` : `<span>${esc(initials(r.name))}</span>`}</div>` });
  const meIcon = () => L.divIcon({ className: "", iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="mepin"></div>' });

  // ---------------------------------------------------------------- rutas
  // ---------------------------------------------------------------- modo: pedir comida o mi negocio
  // Cada quien elige al entrar por primera vez y la app lo recuerda: los clientes ven el directorio,
  // los negocios entran directo a su panel. Se puede cambiar desde la cuenta o el perfil.
  const MODE_K = "onroute-mode";
  (() => { try { const q = new URLSearchParams(location.search), m = q.get("modo"); if (m === "cliente" || m === "negocio" || m === "repartidor") { ls.set(MODE_K, m); q.delete("modo"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + (!location.hash ? (m === "negocio" ? "#panel" : m === "repartidor" ? "#repartir" : "") : location.hash)); } } catch (e) {} })();
  function setMode(m, nav = true) {
    S.mode = m; ls.set(MODE_K, m); S.authMsg = "";
    S.authRole = m === "negocio" ? "business" : m === "repartidor" ? "driver" : "customer";
    if (nav) go(m === "negocio" ? "panel" : m === "repartidor" ? "driver" : "home"); else renderNav();
  }
  function parseRoute() {
    const h = location.hash.slice(1);
    if (h === "ayuda" || h.startsWith("ayuda/")) return { name: "help", sec: h.slice(6).replace(/[^a-z-]/g, "") };
    if (h === "panel" || h === "cocina") return { name: "panel" };
    if (h === "cuenta" || h === "entrar") return { name: "account" };
    if (h === "admin") return { name: "admin" };
    const r = new URLSearchParams(location.search).get("r");
    if (r && /^[a-z0-9-]{3,40}$/i.test(r)) return { name: "rest", rid: r.toLowerCase() };
    if (h === "inicio") return { name: "welcome" };
    if (h === "repartir") return { name: "driver" };
    if (h === "explorar") return { name: "home" };
    // Al abrir OnRoute siempre se pregunta cómo quiere entrar (cliente, negocio o repartidor).
    // Los enlaces directos (menú de un negocio, #panel, #repartir, atajos de la app) no pasan por aquí.
    return { name: "welcome" };
  }
  function go(name, rid) {
    const url = name === "help" ? `${BASE}#ayuda${rid ? "/" + rid : ""}` : name === "welcome" ? BASE : name === "driver" ? `${BASE}#repartir` : name === "home" ? `${BASE}#explorar` : name === "rest" ? `${BASE}?r=${encodeURIComponent(rid)}` : name === "account" ? `${BASE}#cuenta` : name === "admin" ? `${BASE}#admin` : `${BASE}#panel`;
    if (location.href !== url) history.pushState(null, "", url);
    route();
  }
  function route() {
    const r = parseRoute(), prev = S.route;
    S.route = r;
    document.body.dataset.app = r.name;
    if (r.name === "welcome" && location.hash === "#inicio") history.replaceState(null, "", BASE + location.search);
    if (r.name === "home" && S.mode !== "cliente") { S.mode = "cliente"; ls.set(MODE_K, "cliente"); }
    // Quien abre el panel (enlace, QR de negocios, marcador viejo) queda en modo negocio.
    if (r.name === "panel" && S.mode !== "negocio") { S.mode = "negocio"; ls.set(MODE_K, "negocio"); }
    if (r.name === "driver" && S.mode !== "repartidor") { S.mode = "repartidor"; ls.set(MODE_K, "repartidor"); }
    $("#vDriver").hidden = r.name !== "driver";
    if (r.name === "driver") paint(renderDriver);
    $("#vWelcome").hidden = r.name !== "welcome";
    if (r.name === "welcome") { $("#vWelcome").dataset.built = ""; paint(renderWelcome); }
    document.body.dataset.umode = S.mode || "";
    $("#vHome").hidden = r.name !== "home";
    $("#vRest").hidden = r.name !== "rest";
    $("#vPanel").hidden = r.name !== "panel";
    $("#vAcct").hidden = r.name !== "account";
    $("#vAdmin").hidden = r.name !== "admin";
    $("#vHelp").hidden = r.name !== "help";
    if (r.name === "help") paint(renderHelp);
    closeDrawer();
    renderNav();
    if (r.name !== "rest" && S.rid) closeRest();
    if (r.name === "rest" && (prev.name !== "rest" || prev.rid !== r.rid)) openRest(r.rid);
    if (r.name === "home") { ensureDir(); paint(renderHome); }
    if (r.name === "panel") paint(renderPanel);
    if (r.name === "account") { ensureDir(); paint(renderAccount); }
    if (r.name === "admin") paint(renderAdmin);
    document.title = r.name === "panel" ? "Mi negocio · OnRoute" : r.name === "account" ? "Mi cuenta · OnRoute" : r.name === "admin" ? "Administración · OnRoute" : r.name === "help" ? `${(helpDocs().find(x => x.id === r.sec) || { title: "Centro de ayuda" }).title} · OnRoute` : r.name === "rest" ? `${S.R ? S.R.name + " · " : ""}OnRoute` : "OnRoute · Comida cerca de ti";
    setTimeout(() => { [dirMap, restMap, pfMap].forEach(m => { try { m && m.invalidateSize(); } catch (e) {} }); }, 60);
  }
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);

  // ================================================================ EXPLORAR
  let dirUnsub = null, dirMap = null, dirLayer = null, dirFitted = false;
  function ensureDir() {
    if (dirUnsub) return;
    dirUnsub = db.collection("restaurants").where("status", "==", "active").onSnapshot(
      snap => { S.rests = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.restsReady = true; S.dirErr = false; paint(renderHome); },
      err => { console.error("OnRoute: directorio", err); S.restsReady = true; S.dirErr = true; paint(renderHome); }
    );
    try { navigator.permissions && navigator.permissions.query({ name: "geolocation" }).then(p => { if (p.state === "granted") locate(true); }).catch(() => {}); } catch (e) {}
  }
  function locate(quiet) {
    if (!navigator.geolocation) { S.locMsg = "Tu navegador no comparte ubicación."; paint(renderHome); return; }
    if (!quiet) { S.locMsg = "Buscando tu ubicación…"; paint(renderHome); }
    navigator.geolocation.getCurrentPosition(
      p => { S.me = { lat: p.coords.latitude, lng: p.coords.longitude, at: Date.now() }; ls.set("onroute-me", S.me); S.locMsg = ""; dirFitted = false; paint(renderHome); },
      e => { S.locMsg = e.code === 1 ? "No diste permiso de ubicación. Puedes buscar por nombre." : "No pudimos ubicarte. Intenta otra vez."; paint(renderHome); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }
  function dirList() {
    const q = norm(S.q.trim());
    let list = S.rests.filter(r => {
      if (S.filter === "truck" && r.kind !== "truck") return false;
      if (S.filter === "restaurant" && r.kind !== "restaurant") return false;
      if (S.filter === "open" && !isOpen(r)) return false;
      if (q && !norm(`${r.name} ${r.cuisine || ""} ${r.description || ""}`).includes(q)) return false;
      return true;
    }).map(r => { const p = restPos(r); return { r, p, d: S.me && p ? miles(S.me, p) : null }; });
    list.sort((a, b) => {
      if (S.me) { if (a.d == null && b.d != null) return 1; if (b.d == null && a.d != null) return -1; if (a.d != null && b.d != null && a.d !== b.d) return a.d - b.d; }
      const o = (isOpen(b.r) ? 1 : 0) - (isOpen(a.r) ? 1 : 0); if (o) return o;
      return a.r.name.localeCompare(b.r.name, "es");
    });
    return list;
  }
  function renderHome() {
    const v = $("#vHome");
    if (!v.dataset.built) {
      v.dataset.built = "1";
      v.innerHTML = `<div class="dir" id="dir" data-mode="list">
        <div class="dir-list scroll">
          <div class="dir-hero"><h1>¿Qué se te antoja hoy?</h1><p>Food trucks y restaurantes cerca de ti. Pides directo al negocio, sin comisiones de apps de delivery.</p></div>
          <div class="dir-search field">${I.search}<label class="sr" for="dirQ">Buscar</label><input id="dirQ" class="input" type="search" placeholder="Busca tortas, tacos, BBQ o un nombre" autocomplete="off"></div>
          <div class="dir-bar">
            <div class="filters" id="dirFilters" role="group" aria-label="Filtrar">
              <button data-filter="all">Todos</button><button data-filter="open">Abiertos</button><button data-filter="truck">Food trucks</button><button data-filter="restaurant">Restaurantes</button>
            </div>
            <button class="locbtn" id="dirLoc" data-act="locate">${I.target}<span>Usar mi ubicación</span></button>
          </div>
          <p class="hint" id="dirLocMsg" hidden></p>
          <div class="dir-toggle"><div class="seg" role="group" aria-label="Vista"><button data-dirmode="list">Lista</button><button data-dirmode="map">Mapa</button></div></div>
          <div class="cards" id="dirCards"></div>
          <div class="dir-join"><div><b>¿Tienes un food truck o restaurante?</b><span>Regístralo y recibe pedidos directos, sin pagar comisión por pedido.</span></div><a class="btn green sm" href="./#panel" data-pick="negocio">Registrar mi negocio</a></div>
        </div>
        <div class="dir-map"><div class="map" id="dirMap" aria-label="Mapa de negocios"></div></div>
      </div>`;
      $("#dirQ").addEventListener("input", e => { S.q = e.target.value; paint(renderHome); });
    }
    $("#dir").dataset.mode = S.dirMode;
    $$("#dirFilters button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === S.filter)));
    $$("[data-dirmode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.dirmode === S.dirMode)));
    $("#dirLoc span").textContent = S.me ? "Actualizar mi ubicación" : "Usar mi ubicación";
    const lm = $("#dirLocMsg"); lm.hidden = !S.locMsg; lm.textContent = S.locMsg;
    const list = dirList();
    let html;
    if (!S.restsReady) html = `<div class="empty-box">Cargando negocios…</div>`;
    else if (S.dirErr) html = `<div class="dir-empty"><h3>No pudimos cargar los negocios</h3><p>Revisa tu conexión y recarga la página.</p></div>`;
    else if (!S.rests.length) html = `<div class="dir-empty"><h3>Muy pronto verás negocios aquí</h3><p>Estamos sumando food trucks y restaurantes de tu zona.</p></div>`;
    else if (!list.length) html = `<div class="dir-empty"><h3>Sin resultados</h3><p>Prueba con otra palabra o quita el filtro.</p></div>`;
    else html = list.map(({ r, d }) => `<a class="rcard ${S.hover === r.id ? "sel" : ""}" href="./?r=${esc(r.id)}" data-rest="${esc(r.id)}">
        ${logoHTML(r)}
        <div style="min-width:0"><h3>${esc(r.name)}</h3><span class="chip cdot rstat ${isOpen(r) ? "open" : "closed"}">${esc(openText(r))}</span><p class="meta">${esc(KIND[r.kind] || "")}${r.cuisine ? " · " + esc(r.cuisine) : ""}</p><p class="meta">${esc(r.kind === "truck" && r.loc && r.loc.stop ? r.loc.stop : r.address || r.description || "")}</p>${(() => { const ps = autoPromos(r), L = loyaltyOf(r); return ps.length || L ? `<p class="meta perk-line">${I.tag}${esc(ps.length ? ps.map(p => p.title || promoShort(p)).join(" · ") : "Tarjeta de cliente frecuente")}</p>` : ""; })()}</div>
        <div class="side">${d != null ? `<span class="dist mono">${fmtMi(d)}</span>` : ""}</div></a>`).join("");
    $("#dirCards").innerHTML = html;
    drawDirMap(list);
  }
  function drawDirMap(list) {
    const el = $("#dirMap");
    if (!hasL() || !el || el.offsetParent === null && S.dirMode !== "map" && innerWidth < 900) { if (!dirMap) return; }
    if (!dirMap) { dirMap = makeMap(el, { zoomLevel: 11 }); if (!dirMap) return; dirLayer = L.layerGroup().addTo(dirMap); }
    dirLayer.clearLayers();
    const pts = [];
    list.forEach(({ r, p }) => {
      if (!p) return;
      pts.push([p.lat, p.lng]);
      L.marker([p.lat, p.lng], { icon: pinIcon(r, S.hover === r.id ? "sel" : isOpen(r) ? "" : "closed"), title: r.name })
        .bindPopup(`<div class="popup"><b>${esc(r.name)}</b><span>${esc(KIND[r.kind] || "")}${r.cuisine ? " · " + esc(r.cuisine) : ""} · ${esc(openText(r))}</span><a class="btn sm" href="./?r=${esc(r.id)}" data-rest="${esc(r.id)}">Ver menú</a></div>`)
        .addTo(dirLayer);
    });
    if (S.me) { L.marker([S.me.lat, S.me.lng], { icon: meIcon(), title: "Tú", interactive: false }).addTo(dirLayer); pts.push([S.me.lat, S.me.lng]); }
    if (!dirFitted && pts.length) {
      dirFitted = true;
      if (pts.length === 1) dirMap.setView(pts[0], 14); else dirMap.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
    }
  }

  // ================================================================ PÁGINA DE UN NEGOCIO
  let rUnsubs = [], mineUnsub = null, restMap = null, restMarker = null;
  function openRest(rid) {
    closeRest();
    Object.assign(S, { rid, R: null, Rerr: null, Rmenu: [], Rextras: [], RmenuReady: false, cart: {}, pick: {}, vsel: {}, esel: {}, note: "", cat: "", view: "menu", payErr: "", busy: false, mine: null, mineReady: false, promoCode: "", promoInput: "", promoMsg: "", promoOk: false });
    S.myOrder = ss.get(`onroute-my-${rid}`) || null;
    if (S.myOrder) S.view = "status";
    handleStripeReturn(rid);
    $("#vRest").innerHTML = ""; delete $("#vRest").dataset.built; restMap = null; restMarker = null;
    rUnsubs.push(db.doc(`restaurants/${rid}`).onSnapshot(
      s => { if (!s.exists) { S.R = null; S.Rerr = "none"; } else { S.R = { id: s.id, ...s.data() }; S.Rerr = null; document.title = `${S.R.name} · OnRoute`; } pruneCart(); paint(renderRest); },
      () => { S.R = null; S.Rerr = "none"; paint(renderRest); }
    ));
    rUnsubs.push(db.doc(`restaurants/${rid}/menu/main`).onSnapshot(
      s => { const d = s.exists ? s.data() : {}; S.Rmenu = normMenu(d.items); S.Rextras = normExtras(d.extras); S.RmenuReady = true; pruneCart(); paint(renderRest); },
      () => { S.RmenuReady = true; paint(renderRest); }
    ));
    if (S.myOrder) watchMine();
    paint(renderRest);
  }
  function closeRest() { rUnsubs.forEach(u => { try { u(); } catch (e) {} }); rUnsubs = []; if (mineUnsub) { mineUnsub(); mineUnsub = null; } if (mineDlvUnsub) { mineDlvUnsub(); mineDlvUnsub = null; } S.rid = null; }
  let mineDlvUnsub = null;
  function watchMine() {
    if (mineDlvUnsub) { mineDlvUnsub(); mineDlvUnsub = null; } S.mineDlv = null;
    if (mineUnsub) mineUnsub();
    const rid = S.rid, id = S.myOrder; S.mineReady = false;
    mineUnsub = db.doc(`restaurants/${rid}/orders/${id}`).onSnapshot(
      d => {
        const prev = S.mine && S.mine.id === id ? S.mine.status : null;
        const dprev = S.mine && S.mine.id === id && S.mine.delivery ? S.mine.delivery.status : null;
        S.mine = d.exists ? { id: d.id, ...d.data() } : null; S.mineReady = true;
        if (S.mine && !S.mine.delivery && S.mine.status === "ready" && prev && prev !== "ready") readyAlert(S.mine);
        if (S.mine && prev === "await" && S.mine.status === "new") readyAlert(S.mine, "¡Pedido confirmado! ✅", `${S.R ? S.R.name : "El negocio"} confirmó tu pedido y ya lo están preparando.`);
        if (S.mine && !["pending", "cancelled"].includes(S.mine.status)) chatWatch(rid, id, S.mine.delivery ? ["cb", "dc"] : ["cb"], "customer");
        if (S.mine && S.mine.delivery) {
          const ds = S.mine.delivery.status;
          if (["searching", "assigned", "picked"].includes(ds) && !mineDlvUnsub) mineDlvUnsub = db.doc(`deliveries/${id}`).onSnapshot(x => { S.mineDlv = x.exists ? x.data() : null; paint(renderRest); }, () => {});
          if (dprev && dprev !== ds && ds === "picked") readyAlert({ ...S.mine, num: S.mine.num }, "¡Tu pedido va en camino! 🚗", "Tu repartidor ya recogió tu pedido.");
          if (dprev && dprev !== ds && ds === "delivered") { readyAlert(S.mine, "¡Pedido entregado! 🌮", "Tu repartidor marcó tu pedido como entregado. ¡Buen provecho!"); if (mineDlvUnsub) { mineDlvUnsub(); mineDlvUnsub = null; } }
        }
        paint(renderRest);
      },
      () => { S.mine = null; S.mineReady = true; paint(renderRest); }
    );
  }
  function handleStripeReturn(rid) {
    try {
      const q = new URLSearchParams(location.search), id = q.get("pedido"), pago = q.get("pago");
      if (!id || !pago) return;
      history.replaceState(null, "", `${BASE}?r=${encodeURIComponent(rid)}`);
      const pend = ls.get("onroute-pending");
      if (pago === "ok") {
        S.myOrder = id; S.view = "status"; ss.set(`onroute-my-${rid}`, id);
        if (pend && pend.orderId === id) { ls.set(`onroute-last-${rid}`, { cart: pend.cart, name: pend.name, at: Date.now() }); ls.del("onroute-pending"); }
      } else {
        if (pend && pend.orderId === id) { S.cart = pend.cart || {}; S.name = pend.name || S.name; ls.del("onroute-pending"); }
        S.view = Object.keys(S.cart).length ? "cart" : "menu";
        S.payErr = "Cancelaste el pago. Tu pedido sigue en el carrito.";
        if (window.ONROUTE_API) fetch(window.ONROUTE_API + "/cancelCheckout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rid, orderId: id }) }).catch(() => {});
      }
    } catch (e) {}
  }
  function getLast(rid) {
    const d = ls.get(`onroute-last-${rid}`); if (!d || !d.cart) return null;
    const cart = {};
    for (const [k, q] of Object.entries(d.cart)) { try { const p = parseKey(k); if (!p.m.soldOut && q > 0) cart[k] = Math.min(20, Math.floor(q)); } catch (e) {} }
    return Object.keys(cart).length ? { ...d, cart } : null;
  }
  function daysAgo(t) { const d = Math.floor((todayStart() - new Date(t).setHours(0, 0, 0, 0)) / 86400000); return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`; }

  function renderRest() {
    const v = $("#vRest");
    if (S.Rerr) {
      v.dataset.built = "";
      v.innerHTML = `<div class="fatal"><h2>No encontramos este negocio</h2><p class="hint">Puede que el enlace esté mal escrito o que el negocio ya no esté en OnRoute.</p><p><a class="btn dark" href="./" data-nav="home">Ver todos los negocios</a></p></div>`;
      return;
    }
    if (!S.R) { if (!v.dataset.built) v.innerHTML = `<div class="empty-box">Cargando…</div>`; return; }
    if (v.dataset.built !== S.rid) {
      v.dataset.built = S.rid; restMap = null; restMarker = null;
      v.innerHTML = `<div class="client" id="client" data-view="menu">
        <div class="main-col">
          <div class="hero">
            <a class="back-link" href="./" data-nav="home">← Todos los negocios</a>
            <div id="rId"></div>
            <div class="loc"><div class="map" id="restMap"></div><div class="loc-info" id="rLoc"></div></div>
            <ol class="howto" aria-label="Cómo pedir">
              <li><b>Elige</b><span>Arma tu pedido con el menú.</span></li>
              <li><b>Paga</b><span>Con tarjeta ahora o al recoger.</span></li>
              <li><b>Recoge</b><span>Te avisamos cuando esté listo. Sin filas.</span></li>
            </ol>
          </div>
          <div class="menu-pane" id="menuPane"></div>
        </div>
        <aside class="side-pane" id="sidePane" aria-label="Tu pedido"></aside>
        <button class="cartbar" id="cartbar" hidden></button>
      </div>`;
    }
    const R = S.R, open = isOpen(R), pos = restPos(R);
    $("#client").dataset.view = S.view;
    $("#rId").innerHTML = `<div class="hero-id">${logoHTML(R)}<div style="min-width:0"><div class="hero-kind">${esc(KIND[R.kind] || "")}${R.cuisine ? " · " + esc(R.cuisine) : ""}</div><h1 class="truck-name">${esc(R.name)}</h1></div></div>
      ${R.description ? `<p class="hero-desc">${esc(R.description)}</p>` : ""}
      <div class="hero-facts"><button class="fav" data-act="fav" aria-pressed="${isFav(R.id)}">${isFav(R.id) ? "♥ Guardado" : "♡ Guardar"}</button><span class="chip cdot ${open ? "open" : "closed"}">${esc(openText(R))}</span>${R.phone ? `<span class="chip">${esc(R.phone)}</span>` : ""}${R.status !== "active" ? `<span class="chip">Vista previa · aún no publicado</span>` : ""}</div>`;
    const where = R.kind === "truck" ? (R.loc && R.loc.stop) || "" : R.address || "";
    const when = R.kind === "truck" && R.loc && R.loc.updatedAt ? (truckLive(R) ? "Ubicación en vivo · " : "Última ubicación · ") + ago(R.loc.updatedAt) : R.kind === "truck" ? "Todavía no comparte su ubicación" : "";
    const hh = hoursOf(R), td = nowIn(hh.tz).day, hOpen = !!($("#rLoc details.hrs") || {}).open;
    $("#rLoc").innerHTML = `<div><strong>${esc(where || (pos ? "Ubicación" : "Ubicación no disponible"))}</strong><span>${esc(when)}</span>
        <details class="hrs"${hOpen ? " open" : ""}><summary>Hoy: ${esc(dayText(hh.days[td]))}</summary><ul>${WEEK.map(i => `<li class="${i === td ? "today" : ""}"><span>${DAYS[i]}</span><span>${esc(dayText(hh.days[i]))}</span></li>`).join("")}</ul></details></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${truckLive(R) ? '<span class="live"><i></i>GPS</span>' : ""}${pos ? `<a class="go" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}">Cómo llegar</a>` : ""}</div>`;
    const mapEl = $("#restMap");
    mapEl.parentElement.querySelector(".map").hidden = !pos;
    if (pos && hasL()) {
      if (!restMap) { restMap = makeMap(mapEl, { zoom: false, wheel: false, center: [pos.lat, pos.lng], zoomLevel: 15 }); }
      if (restMap) { if (!restMarker) restMarker = L.marker([pos.lat, pos.lng], { icon: pinIcon(R), interactive: false }).addTo(restMap); else restMarker.setLatLng([pos.lat, pos.lng]); restMap.panTo([pos.lat, pos.lng]); }
    }
    // Pedido (columna derecha en escritorio, pantalla propia en celular)
    const side = $("#sidePane");
    if (S.view === "status") side.innerHTML = statusHTML();
    else if (cartCount()) side.innerHTML = cartHTML();
    else side.innerHTML = `<div class="empty-cart"><h2>Tu pedido</h2><p>${S.RmenuReady && !S.Rmenu.length ? "Este negocio todavía está preparando su menú." : "Todavía no agregas nada. Elige del menú y aquí verás tu pedido y el total."}</p></div>`;
    $("#menuPane").innerHTML = menuHTML();
    const n = cartCount(), bar = $("#cartbar");
    bar.hidden = !n;
    bar.innerHTML = `<span><span class="count mono">${n}</span>Ver pedido</span><span class="mono">${money(subtotal())}</span>`;
  }
  function menuHTML() {
    const R = S.R;
    if (!S.RmenuReady) return `<div class="empty-box">Cargando menú…</div>`;
    if (!S.Rmenu.length) return `<div class="empty-cart"><h2>Menú en preparación</h2><p>${esc(R.name)} todavía no publica su menú. Vuelve pronto.</p></div>`;
    const cats = menuCats(S.Rmenu);
    if (!cats.includes(S.cat)) S.cat = cats[0];
    const items = S.Rmenu.filter(m => m.cat === S.cat), vr = variantOf(R), closed = !isOpen(R) || R.status !== "active";
    const last = getLast(S.rid), ap = autoPromos(R), L = loyaltyOf(R);
    return `${ap.length || L ? `<div class="perks">${ap.map(p => `<div class="perk promo">${I.tag}<span><b>${esc(p.title || promoText(p))}</b>${p.title ? " · " + esc(promoText(p)) : ""}${p.min ? ` en pedidos desde ${money(p.min)}` : ""}. Se aplica solo en tu pedido.</span></div>`).join("")}${L ? loyaltyHTML(R, L) : ""}</div>` : ""}
      ${last && !closed ? (() => { const tot = Object.entries(last.cart).reduce((a, [k, q]) => a + parseKey(k).price * q, 0);
        return `<div class="last"><div class="last-top"><b>Tu último pedido</b><small>${daysAgo(last.at)}</small></div><ul>${Object.entries(last.cart).map(([k, q]) => `<li>${q} × ${esc(parseKey(k).label)}</li>`).join("")}</ul><button class="btn dark" data-act="repeat">Pedir lo mismo · <span class="mono">${money(tot)}</span></button></div>`; })() : ""}
      ${cats.length > 1 ? `<div class="cats" role="group" aria-label="Categorías">${cats.map(c => `<button aria-pressed="${c === S.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
      ${closed ? `<div class="note">${R.status !== "active" ? "Este negocio todavía no está publicado. Puedes ver el menú, pero aún no recibe pedidos." : R.paused ? "El negocio pausó los pedidos en línea. Vuelve en unos minutos." : R.kind === "truck" ? "El food truck no está en ruta ahora mismo. Puedes ver el menú; los pedidos se abren cuando comparta su ubicación." : "El negocio está cerrado por ahora."}</div>` : ""}
      ${R.menuNote ? `<p class="hint">${esc(R.menuNote)}</p>` : ""}
      <div class="menu">${items.map(m => {
        const oi = Math.min(Number(S.pick[m.id] || 0), m.opts.length - 1), o = m.opts[oi], vsel = !!(vr && S.vsel[m.id]);
        const xs = itemExtras(m), sel = S.esel[m.id] || [];
        const price = o.price - (vsel ? vr.discount : 0) + xs.filter(e => sel.includes(e.id)).reduce((a, e) => a + e.price, 0);
        return `<article class="item ${m.soldOut ? "sold" : ""} ${m.photo ? "" : "nophoto"}">
          <div class="ph">${m.photo && photoSrc(S.rid, m.photo) ? `<img src="${esc(photoSrc(S.rid, m.photo))}" alt="${esc(m.name)}" loading="lazy">` : ""}</div>
          <div class="body">
            <div><h3>${esc(m.name)}${m.soldOut ? ' <span class="sold-tag">Agotado</span>' : ""}</h3>${m.desc ? `<p>${esc(m.desc)}</p>` : ""}</div>
            ${m.opts.length > 1 ? `<div class="opts" role="group" aria-label="Opciones">${m.opts.map((x, j) => `<button data-opt="${esc(m.id)}|${j}" aria-pressed="${j === oi}"><b>${esc(x.label || String.fromCharCode(65 + j))} · ${money(x.price)}</b>${esc(x.detail)}</button>`).join("")}</div>` : (o.detail ? `<p class="hint">${esc(o.detail)}</p>` : "")}
            ${xs.length && !m.soldOut ? `<div class="xtras" role="group" aria-label="Extras"><span class="hint">Extras:</span>${xs.map(e => `<button class="xchip" data-xtra="${esc(m.id)}|${esc(e.id)}" aria-pressed="${sel.includes(e.id)}">+ ${esc(e.label)}${e.price ? ` <b class="mono">${money(e.price)}</b>` : ""}</button>`).join("")}</div>` : ""}
            <div class="row">
              ${vr ? `<label class="vari"><input type="checkbox" id="v-${esc(m.id)}" data-vari="${esc(m.id)}" ${vsel ? "checked" : ""}> ${esc(vr.label)} (−${money(vr.discount)})</label>` : `<span class="price mono">${money(price)}</span>`}
              <button class="addbtn" data-add="${esc(m.id)}" ${closed || m.soldOut ? "disabled" : ""}>${m.soldOut ? "Agotado" : `Agregar · <span class="mono">${money(price)}</span>`}</button>
            </div>
          </div></article>`;
      }).join("")}</div>`;
  }
  function loyaltyHTML(R, L) {
    const st = myStamps(R.id, L);
    const dots = n => `<div class="stamps" aria-hidden="true">${Array.from({ length: L.every }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div>`;
    if (!S.user) return `<div class="perk loyal">${I.gift}<span><b>Cliente frecuente</b> · Junta ${L.every} sellos y tu siguiente pedido lleva: ${esc(L.reward)}. <a href="./#cuenta" data-act="loginreturn">Crea tu cuenta o entra</a> para juntar sellos.</span></div>`;
    if (!st) return `<div class="perk loyal">${I.gift}<span><b>Cliente frecuente</b> · Cargando tus sellos…</span></div>`;
    return `<div class="perk loyal ${st.ready ? "ready" : ""}">${I.gift}<div class="loyal-in"><span>${st.ready ? `<b>¡Completaste tu tarjeta!</b> Tu siguiente pedido lleva: ${esc(L.reward)}.` : `<b>Cliente frecuente · ${st.have} de ${L.every} sellos</b> · Al juntar ${L.every}, tu siguiente pedido lleva: ${esc(L.reward)}.`}</span>${dots(st.have)}</div></div>`;
  }
  // Total con la promoción que aplique (solo en pedidos que se pagan al recoger).
  const dlvOn = R => !!(R && R.delivery && R.delivery.on && restPos(R) && payMethods(R, true).length);
  const isDlv = () => S.recv === "delivery" && dlvOn(S.R);
  function dlvQuote() {
    const R = S.R, D = S.dlv || {};
    if (!isDlv() || typeof D.lat !== "number") return null;
    const mi = roadMi(restPos(R), D), radius = Math.min(Number(R.delivery.radius) || 5, DLV.maxMiles);
    return { mi, radius, far: mi > radius, fee: dlvFee(mi) };
  }
  function cartTotals() {
    const sub = Math.round(subtotal() * 100) / 100, dl = isDlv(), ms = payMethods(S.R, dl);
    if (S.payMode !== "split" && !ms.includes(S.payMode)) S.payMode = ms[0] || "cash";
    if (S.payMode === "split" && manualOf(S.R, dl).length < 2) S.payMode = ms[0] || "cash";
    const card = S.payMode === "card";
    const pr = card ? null : bestPromo(S.R, sub, S.promoCode);
    const q = dl ? dlvQuote() : null, fee = q && !q.far ? q.fee : 0, tip = dl ? r2(Number(S.tip) || 0) : 0;
    return { sub, pr, tot: Math.round((sub - (pr ? pr.off : 0) + fee + tip) * 100) / 100, card, dl, q, fee, tip };
  }
  // Direcciones: búsqueda con OpenStreetMap (Photon), cerca del negocio.
  let addrTimer = null, addrSeq = 0;
  function addrSearch(q) {
    clearTimeout(addrTimer);
    if (q.trim().length < 4) { S.dlvSug = []; paintSug(); return; }
    addrTimer = setTimeout(async () => {
      const seq = ++addrSeq, near = restPos(S.R) || { lat: 29.42, lng: -98.49 };
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${near.lat}&lon=${near.lng}&limit=5&lang=en`);
        const j = await r.json(); if (seq !== addrSeq) return;
        S.dlvSug = (j.features || []).map(f => { const p = f.properties || {}, c = f.geometry && f.geometry.coordinates;
          const line1 = [p.housenumber, p.street || p.name].filter(Boolean).join(" "), line2 = [p.city || p.district, p.state, p.postcode].filter(Boolean).join(", ");
          return c ? { label: [line1, line2].filter(Boolean).join(", "), lat: c[1], lng: c[0] } : null; }).filter(Boolean);
      } catch (e) { S.dlvSug = []; }
      if (!S.dlvSug.length) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(q)}&viewbox=${near.lng - 0.6},${near.lat + 0.6},${near.lng + 0.6},${near.lat - 0.6}`);
          const j = await r.json(); if (seq !== addrSeq) return;
          S.dlvSug = (j || []).map(x => ({ label: String(x.display_name || "").split(", ").slice(0, 4).join(", "), lat: Number(x.lat), lng: Number(x.lon) })).filter(x => x.label && !isNaN(x.lat));
        } catch (e) { S.dlvSug = []; }
      }
      S.dlvNoSug = !S.dlvSug.length && q.trim().length >= 6;
      paintSug();
    }, 350);
  }
  function paintSug() {
    const box = $("#dlvSug"); if (!box) return;
    box.innerHTML = (S.dlvSug || []).map((x, i) => `<button type="button" data-sug="${i}">${I.pin}<span>${esc(x.label)}</span></button>`).join("");
    box.hidden = !(S.dlvSug || []).length && !S.dlvNoSug;
    if (!(S.dlvSug || []).length && S.dlvNoSug) box.innerHTML = `<p class="hint" style="padding:10px 12px;margin:0">No encontramos esa dirección. Escribe calle, número y ciudad (ej. 500 Oak St, San Antonio) o toca <b>Aquí</b> para usar tu ubicación.</p>`;
  }
  function dlvHere() {
    if (!navigator.geolocation) return toast("Este navegador no tiene GPS.");
    S.dlvMsg = "Buscando tu ubicación…"; paint(renderRest);
    navigator.geolocation.getCurrentPosition(async p => {
      const lat = p.coords.latitude, lng = p.coords.longitude; let label = "";
      try { const j = await (await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`)).json(); const q = (j.features || [])[0]; if (q) { const x = q.properties; label = [[x.housenumber, x.street || x.name].filter(Boolean).join(" "), x.city, x.state].filter(Boolean).join(", "); } } catch (e) {}
      S.dlv = { ...(S.dlv || {}), lat, lng, address: label || `Mi ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})` }; S.dlvMsg = label ? "" : "Revisa que la dirección sea correcta y agrega detalles abajo."; ls.set("onroute-dlv", S.dlv); paint(renderRest);
    }, () => { S.dlvMsg = "No pudimos obtener tu ubicación. Escribe tu dirección."; paint(renderRest); }, { enableHighAccuracy: true, timeout: 12000 });
  }
  function dlvHTML(R, q, sub) {
    const D = S.dlv || {}, tips = [0, 2, 3, 5];
    return `<div class="dlv-box">
      <div class="field"><label for="dlvAddr">Dirección de entrega</label>
        <div class="addr-in"><input id="dlvAddr" autocomplete="street-address" placeholder="Calle y número, ciudad" value="${esc(D.address || "")}"><button class="btn sec sm" data-act="dlvhere" type="button">${I.target} Aquí</button></div>
        <div class="sug" id="dlvSug" hidden></div>
        ${S.dlvMsg ? `<p class="hint">${esc(S.dlvMsg)}</p>` : ""}
        ${q ? (q.far ? `<p class="err">Tu dirección está a ${q.mi.toFixed(1)} mi y ${esc(R.name)} entrega hasta ${q.radius} mi. Elige recoger en el negocio.</p>` : `<p class="ok-msg">${q.mi.toFixed(1)} mi · envío ${money(q.fee)}</p>`) : `<p class="hint">Envío desde ${money(DLV.minFee)} según las millas (hasta ${Math.min(Number(R.delivery.radius) || 5, DLV.maxMiles)} mi).</p>`}</div>
      <div class="dgrid"><div class="field"><label for="dlvUnit">Depto., casa o portón <span class="hint">(opcional)</span></label><input id="dlvUnit" data-dlv="unit" maxlength="40" value="${esc(D.unit || "")}" placeholder="Ej. Depto 4B, código 1234"></div>
        <div class="field"><label for="dlvPhone">Teléfono</label><input id="dlvPhone" data-dlv="phone" maxlength="30" inputmode="tel" autocomplete="tel" value="${esc(D.phone || (S.profile && S.profile.phone) || "")}" placeholder="Para que el repartidor te llame"></div></div>
      <div class="field"><label for="dlvNotes">Indicaciones para el repartidor <span class="hint">(opcional)</span></label><input id="dlvNotes" data-dlv="notes" maxlength="200" value="${esc(D.notes || "")}" placeholder="Ej. casa azul, dejar en la puerta"></div>
      <div class="field"><span class="flabel">Propina para el repartidor <span class="hint">(100% para él)</span></span>
        <div class="tips">${tips.map(t => `<button type="button" data-tip="${t}" aria-pressed="${Number(S.tip || 0) === t}">${t ? money(t) : "Sin propina"}</button>`).join("")}</div></div>
    </div>`;
  }
  function payPickHTML(R, dl, tot) {
    const ms = payMethods(R, dl), man = manualOf(R, dl);
    if (!ms.length) return `<p class="err">Este negocio todavía no configura sus formas de pago.</p>`;
    if (ms.length === 1 && ms[0] === "cash" && !dl) return "";
    const sub = { card: "Apple Pay · Google Pay", zelle: "Desde tu banco", cashapp: "Desde tu app", cash: dl ? "Al repartidor" : "Al recoger" };
    const sp = S.split || {}, a = man.includes(sp.a) ? sp.a : (man.find(m => m !== "cash") || man[0]), b = man.includes(sp.b) && sp.b !== a ? sp.b : (man.includes("cash") && a !== "cash" ? "cash" : man.find(m => m !== a));
    if (S.payMode === "split") S.split = { a, b, amt: sp.amt };
    const amt = num(Number((S.split || {}).amt)), rest = r2(tot - amt);
    return `<div class="field"><span class="flabel">¿Cómo quieres pagar?</span><div class="choices pays">
      ${ms.map(m => `<button data-paymode="${m}" aria-pressed="${S.payMode === m}"><b>${m === "card" ? (WALLET ? `${WALLET} o tarjeta` : "Tarjeta") : PAYN[m]}</b>${m === "card" ? (WALLET ? "Pago seguro con Stripe" : sub.card) : sub[m]}</button>`).join("")}
      ${man.length >= 2 ? `<button data-paymode="split" aria-pressed="${S.payMode === "split"}"><b>Combinar</b>Dos formas de pago</button>` : ""}</div>
      ${S.payMode === "split" ? `<div class="split">
        <div class="split-row"><select id="splitA" aria-label="Primera forma de pago">${man.map(m => `<option value="${m}" ${m === a ? "selected" : ""}>${PAYN[m]}</option>`).join("")}</select>
          <span class="split-amt"><span>$</span><input id="splitAmt" inputmode="decimal" placeholder="0.00" value="${amt ? amt.toFixed(2) : ""}" aria-label="Cuánto pagas con la primera"></span></div>
        <div class="split-row"><select id="splitB" aria-label="Segunda forma de pago">${man.filter(m => m !== a).map(m => `<option value="${m}" ${m === b ? "selected" : ""}>${PAYN[m]}</option>`).join("")}</select>
          <b class="mono" id="splitRest">${amt > 0 && rest > 0 ? money(rest) : "el resto"}</b></div>
        <p class="hint">Ej. una parte por Zelle y el resto en efectivo. Cada parte de al menos $1.00.</p></div>` : ""}</div>`;
  }
  function payPartsOf(tot) {
    if (S.payMode !== "split") return { parts: [{ m: S.payMode }] };
    const sp = S.split || {}, amt = r2(num(Number(sp.amt)));
    if (!(amt >= 1) || !(tot - amt >= 1)) return { err: `Escribe cuánto pagas con ${PAYN[sp.a] || "la primera forma"} (entre $1.00 y ${money(tot - 1)}).` };
    return { parts: [{ m: sp.a, amt }, { m: sp.b }] };
  }
  function cartHTML() {
    const R = S.R, { sub, pr, tot, card, dl, q, fee, tip } = cartTotals(), closed = !isOpen(R) || R.status !== "active";
    const L = loyaltyOf(R), st = myStamps(S.rid, L), hasCodes = promosOf(R).some(p => p.code);
    const near = !pr && !card ? autoPromos(R).filter(p => p.min > sub).sort((a, b) => a.min - b.min)[0] : null;
    if (!S.name && S.profile && S.profile.name) S.name = S.profile.name;
    return `<button class="back m-only" data-act="tomenu">← Seguir pidiendo</button>
      <div class="sheet">
        <h2>Tu pedido</h2>
        <p class="hint">${esc(R.name)}</p>
        <div class="lines">${Object.entries(S.cart).map(([k, q]) => { const p = parseKey(k); return `
          <div class="line"><div class="nm"><b>${esc(p.m.name)}</b><small>${esc([p.m.opts.length > 1 ? p.o.label : "", p.v ? variantOf(R).label : "", p.exs.length ? "+ " + p.exs.map(e => e.label).join(", ") : ""].filter(Boolean).join(" · "))}${p.m.opts.length > 1 || p.v || p.exs.length ? " · " : ""}<span class="mono">${money(p.price)}</span></small></div>
          <div class="qty"><button data-dec="${esc(k)}" aria-label="Quitar uno">−</button><b class="mono">${q}</b><button data-inc="${esc(k)}" aria-label="Agregar uno">+</button></div></div>`; }).join("")}</div>
        ${dlvOn(R) ? `<div class="field"><span class="flabel">¿Cómo lo recibes?</span>
          <div class="choices">
            <button data-recv="pickup" aria-pressed="${!dl}"><b>Recoger</b>En el negocio, sin costo</button>
            <button data-recv="delivery" aria-pressed="${dl}"><b>${I.car} A domicilio</b>Te lo lleva un repartidor</button>
          </div></div>` : ""}
        ${dl ? dlvHTML(R, q, sub) : `<div class="field"><span class="flabel">¿Cuándo pasas por él?</span>
          <div class="choices">
            <button data-pickup="asap" aria-pressed="${S.pickup === "asap"}"><b>Lo antes posible</b>Unos 15 min</button>
            <button data-pickup="30" aria-pressed="${S.pickup === "30"}"><b>En 30 minutos</b>Llego más tarde</button>
          </div></div>`}
        <div class="field"><label for="noteInput">Notas para la cocina <span class="hint">(opcional)</span></label><textarea id="noteInput" maxlength="200" rows="2" placeholder="Ej. sin cebolla, salsa aparte">${esc(S.note || "")}</textarea></div>
        <div class="field"><label for="nameInput">Nombre para el pedido</label><input id="nameInput" maxlength="40" placeholder="Ej. Ana" value="${esc(S.name)}" autocomplete="given-name"></div>
        ${payPickHTML(R, dl, tot)}
        ${hasCodes && !card ? `<div class="field"><label for="promoInput">Código de promoción <span class="hint">(opcional)</span></label>
          <div class="promo-in"><input id="promoInput" maxlength="15" value="${esc(S.promoInput || "")}" placeholder="Ej. TORTAMARTES" autocapitalize="characters" autocomplete="off"><button class="btn sec sm" data-act="promo">Aplicar</button></div>
          ${S.promoMsg ? `<p class="${S.promoOk ? "ok-msg" : "err"}" role="status">${esc(S.promoMsg)}</p>` : ""}</div>` : ""}
        ${near ? `<div class="promo-hint">${I.tag}<span>Te faltan <b class="mono">${money(near.min - sub)}</b> para ${esc(near.title || promoText(near))}.</span></div>` : ""}
        ${st && st.ready ? (card ? `<div class="promo-hint">${I.gift}<span>Completaste tu tarjeta de sellos. Para recibir tu premio (${esc(L.reward)}) elige otra forma de pago que no sea tarjeta.</span></div>` : `<div class="reward">${I.gift}<span><b>¡Premio de cliente frecuente!</b> Este pedido lleva: ${esc(L.reward)}.</span></div>`) : ""}
        ${card && promosOf(R).length ? `<p class="hint">Las promociones aplican cuando pagas con efectivo, Zelle o Cash App.</p>` : ""}
        <div class="totals">${pr ? `<div class="sub"><span>Subtotal</span><span class="mono">${money(sub)}</span></div><div class="disc"><span>${esc(pr.p.title || promoText(pr.p))}${pr.p.code ? " · " + esc(pr.p.code) : ""}</span><span class="mono">−${money(pr.off)}</span></div>` : ""}${dl ? `<div class="sub"><span>Comida</span><span class="mono">${money(sub)}</span></div><div class="sub"><span>Envío${q && !q.far ? ` (${q.mi.toFixed(1)} mi)` : ""}</span><span class="mono">${q && !q.far ? money(fee) : "—"}</span></div>${tip ? `<div class="sub"><span>Propina</span><span class="mono">${money(tip)}</span></div>` : ""}` : ""}<div class="grand"><span>Total</span><span class="mono">${money(tot)}</span></div><p class="hint">${esc(R.menuNote && /impuesto/i.test(R.menuNote) ? "Impuesto incluido." : "")}</p></div>
        <div class="saving">Pidiendo directo y no en una app de delivery, ${esc(R.name)} se queda con unos ${money(tot * COMMISSION)} más.</div>
        ${S.payErr ? `<p class="err" role="alert">${esc(S.payErr)}</p>` : ""}
        <button class="pay" data-act="pay" ${closed || S.busy || (dl && (!q || q.far)) || !payMethods(R, dl).length ? "disabled" : ""}>${closed ? "Este negocio no recibe pedidos ahora" : S.busy ? (card ? "Abriendo pago seguro…" : "Enviando…") : dl && !q ? "Elige tu dirección de la lista para continuar" : dl && q.far ? "Tu dirección está fuera del área de entrega" : card ? `Pagar ${money(tot)}${WALLET ? ` con ${WALLET} o tarjeta` : " con tarjeta"}` : S.payMode === "cash" ? `Enviar pedido · pagas ${money(tot)} ${dl ? "al recibirlo" : "al recoger"}` : `Enviar pedido · ${money(tot)} por ${S.payMode === "split" ? "dos formas de pago" : PAYN[S.payMode]}`}</button>
        ${S.user ? `<p class="hint" style="text-align:center">Pides como ${esc(S.user.email || "")}. Lo verás en Mis pedidos.</p>` : `<p class="hint" style="text-align:center"><a href="./#cuenta" data-act="loginreturn">Crea tu cuenta o entra</a> para guardar tus pedidos. También puedes pedir sin cuenta.</p>`}
        <p class="hint" style="text-align:center">${card ? (window.ONROUTE_STRIPE_TEST !== false ? "Modo de prueba: usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC." : "Te llevamos a la página de pago segura de Stripe. Ahí aparece Apple Pay o Google Pay si lo tienes en tu celular.") : S.payMode === "cash" ? (dl ? "Pagas en efectivo al repartidor cuando te entregue." : "Pagas en efectivo al recoger.") : "Al enviar tu pedido te mostramos a dónde mandar el pago. Entra a la cocina cuando el negocio lo confirme."}</p>
      </div>`;
  }
  function dlvStatusHTML(o) {
    const D = o.delivery, ds = D.status, live = S.mineDlv;
    const steps = [["Pedido recibido", "El negocio ya lo tiene"], ["Preparando tu comida", o.status === "ready" || o.status === "done" ? "Listo en la cocina" : "En la cocina"],
      ["Repartidor asignado", D.driverName ? `${D.driverName}${D.driverCar ? " · " + D.driverCar : ""}${D.driverPlate ? " · " + D.driverPlate : ""}${D.arrivedAt && ds === "assigned" ? " · ya llegó al negocio" : ""}` : "Buscando un repartidor cerca"], ["En camino a tu casa", "Ya recogió tu pedido"], ["Entregado", "¡Buen provecho!"]];
    const idx = ds === "delivered" ? 4 : ds === "picked" ? 3 : ds === "assigned" ? (o.status === "prep" || o.status === "ready" || o.status === "done" ? 2 : 2) : o.status === "prep" || o.status === "ready" ? 1 : 0;
    const title = ds === "delivered" ? "¡Pedido entregado!" : ds === "picked" ? "¡Va en camino!" : ds === "assigned" ? `${esc(D.driverName || "Tu repartidor")} va por tu pedido` : "Gracias, " + esc(o.who);
    setTimeout(drawDlvMap, 30);
    return `<div class="status">
      <h2>${title}</h2>
      <div class="ticket"><div class="num">#${esc(o.num)}</div><p>A domicilio · ${esc(S.R.name)}</p><span class="paychip ${o.paid || !cashOf(o) ? "paid" : ""}">${o.paid ? "Pagado con tarjeta" : cashOf(o) && ds !== "delivered" ? `Paga ${money(cashOf(o))} en efectivo al repartidor` : `Pagado · ${esc(payLine(o))}`}</span></div>
      ${ds === "delivered" ? "" : notifyHTML({ ...o, status: "prep" }).replace(/cuando esté listo/g, "cuando vaya en camino y cuando llegue")}
      ${(ds === "assigned" || ds === "picked") ? `<div class="dlv-map" id="dlvMap"></div>${live && live.driverLoc ? `<p class="hint">Ubicación del repartidor ${ago(live.driverLoc.t || Date.now())}.</p>` : `<p class="hint">Verás al repartidor en el mapa cuando comparta su ubicación.</p>`}` : ""}
      <ol class="steps">${steps.map((x, i) => { const done = i < idx || (i === 4 && idx === 4); return `<li class="${done ? "done" : i === idx ? "now" : ""}"><span class="dot">${done ? "✓" : i + 1}</span><div><b>${x[0]}</b><small>${esc(x[1])}</small></div></li>`; }).join("")}</ol>
      ${ds !== "delivered" ? `<div class="chat-row">${chatBtn(o.id, "cb", "customer", "Negocio")}${ds === "assigned" || ds === "picked" || (chatData[ckey(o.id, "dc")] || []).length ? chatBtn(o.id, "dc", "customer", "Repartidor", "hot") : ""}</div>` : ""}
      <div class="onote"><b>Entrega en:</b> ${esc(D.address)}${D.unit ? " · " + esc(D.unit) : ""}</div>
      <div class="points"><span>Comida ${money(o.food || 0)} · envío ${money(D.fee)}${D.tip ? ` · propina ${money(D.tip)}` : ""}</span><strong class="mono">${money(o.total)}</strong></div>
      <button class="ghost" data-act="neworder">Hacer otro pedido</button></div>`;
  }
  let dlvMapObj = null, dlvMarks = {};
  function drawDlvMap() {
    const el = $("#dlvMap"), o = S.mine, live = S.mineDlv; if (!el || !o || !o.delivery || !hasL()) return;
    if (!dlvMapObj || dlvMapObj._container !== el) { dlvMapObj = makeMap(el, { center: [o.delivery.lat, o.delivery.lng], zoomLevel: 13 }); dlvMarks = {}; if (!dlvMapObj) return; }
    const home = [o.delivery.lat, o.delivery.lng];
    if (!dlvMarks.home) dlvMarks.home = L.marker(home, { icon: L.divIcon({ className: "", html: `<div class="pin home"><span>🏠</span></div>`, iconSize: [36, 44], iconAnchor: [18, 44] }) }).addTo(dlvMapObj);
    const dl = live && live.driverLoc;
    if (dl) {
      const p = [dl.lat, dl.lng];
      if (dlvMarks.car) dlvMarks.car.setLatLng(p); else dlvMarks.car = L.marker(p, { icon: L.divIcon({ className: "", html: `<div class="pin car"><span>🚗</span></div>`, iconSize: [36, 44], iconAnchor: [18, 44] }) }).addTo(dlvMapObj);
      try { dlvMapObj.fitBounds([home, p], { padding: [40, 40], maxZoom: 15 }); } catch (e) {}
    }
  }
  // Pedido pagado a mano que el negocio aún no confirma: a dónde mandar el dinero.
  function awaitHTML(o) {
    const R = S.R, P = R.payments || {}, parts = o.payParts || [], pre = parts.filter(p => p.m !== "cash"), cash = cashOf(o);
    const how = p => p.m === "zelle" ? `<div class="paybox"><b>Zelle · <span class="mono">${money(p.amt)}</span></b><span>Desde la app de tu banco manda el pago a:</span>
        <div class="payto"><code>${esc(P.zelle || "")}</code><button class="btn sm sec" data-copy="${esc(P.zelle || "")}">Copiar</button></div><span class="hint">En la nota escribe <b>#${esc(o.num)}</b>.</span></div>`
      : p.m === "cashapp" ? `<div class="paybox"><b>Cash App · <span class="mono">${money(p.amt)}</span></b><span>Manda el pago a <code>${esc(P.cashapp || "")}</code> con la nota <b>#${esc(o.num)}</b>.</span>
        <div class="payto"><a class="btn sm green" href="${esc(cashAppLink(P.cashapp || "", p.amt))}" target="_blank" rel="noopener">Abrir Cash App</a><button class="btn sm sec" data-copy="${esc(P.cashapp || "")}">Copiar $cashtag</button></div></div>`
      : `<div class="paybox"><b>Efectivo · <span class="mono">${money(p.amt)}</span></b><span>${o.delivery ? "Se lo pagas al repartidor cuando te entregue." : "Lo pagas al recoger."}</span></div>`;
    return `<div class="status">
      <h2>${pre.length ? "Manda tu pago" : "Esperando al negocio"}</h2>
      <div class="ticket"><div class="num">#${esc(o.num)}</div><p>${o.delivery ? "A domicilio" : o.pickup === "30" ? "Pasas en 30 min" : "Para recoger"} · ${esc(R.name)}</p><span class="paychip">Por confirmar · ${esc(payLine(o))}</span></div>
      ${parts.map(how).join("")}
      <div class="banner info"><span>${pre.length ? `Cuando ${esc(R.name)} vea tu pago, tu pedido entra a la cocina y aquí te avisamos.` : `${esc(R.name)} está revisando tu pedido. En cuanto lo acepte entra a la cocina.`}${cash && pre.length ? ` El resto (${money(cash)}) en efectivo.` : ""}</span></div>
      <div class="chat-row">${chatBtn(o.id, "cb", "customer", "Escribir al negocio")}</div>
      <div class="points"><span>Total del pedido</span><strong class="mono">${money(o.total)}</strong></div>
      <button class="ghost" data-act="neworder">Volver al menú</button></div>`;
  }
  function statusHTML() {
    const o = S.mine;
    if (!o) return S.mineReady ? `<div class="status"><h2>No encontramos tu pedido</h2><button class="ghost" data-act="neworder">Hacer un pedido</button></div>` : `<div class="empty-box">Cargando tu pedido…</div>`;
    const st = o.status;
    if (st === "await") return awaitHTML(o);
    if (st === "cancelled" && o.payParts) return `<div class="status"><h2>Pedido no confirmado</h2>
      <div class="ticket"><div class="num">#${esc(o.num)}</div><p>${esc(S.R.name)} no pudo confirmar este pedido. Si ya mandaste dinero por Zelle o Cash App, escríbele al negocio o a soporte para que te lo regrese.</p></div>
      <div class="chat-row">${chatBtn(o.id, "cb", "customer", "Escribir al negocio")}</div>
      <a class="ghost" href="./#ayuda/contacto" data-help="contacto" style="text-align:center">Contacto y soporte</a>
      <button class="ghost" data-act="neworder">Hacer otro pedido</button></div>`;
    if (st === "pending" || st === "cancelled") return `<div class="status"><h2>${st === "pending" ? "Confirmando tu pago…" : "Pago no completado"}</h2>
      <div class="ticket"><div class="num">#${esc(o.num)}</div><p>${st === "pending" ? "En cuanto se confirme el pago, tu pedido entra a la cocina." : "Este pedido no se cobró y no llegó a la cocina."}</p></div>
      <button class="ghost" data-act="neworder">${st === "pending" ? "Volver al menú" : "Hacer otro pedido"}</button></div>`;
    if (o.delivery) return dlvStatusHTML(o);
    const idx = { new: 0, prep: 1, ready: 2, done: 3 }[st] ?? 0;
    const steps = [["Pedido recibido", "El negocio ya lo tiene en su pantalla"], ["En preparación", "Lo están preparando"], ["Listo para recoger", "Pasa con tu número"]];
    return `<div class="status">
      <h2>${st === "ready" ? "¡Tu pedido está listo!" : st === "done" ? "¡Buen provecho!" : "Gracias, " + esc(o.who)}</h2>
      <div class="ticket"><div class="num">#${esc(o.num)}</div><p>${o.pickup === "30" ? "Pasas en 30 min" : "Listo en unos 15 min"} · ${esc(S.R.name)}</p><span class="paychip ${o.paid || (o.paidOk && !cashOf(o)) ? "paid" : ""}">${o.paid ? "Pagado con tarjeta" : o.payParts ? (cashOf(o) ? `${o.paidOk && cashOf(o) < o.total ? "Pago recibido · " : ""}${money(cashOf(o))} en efectivo al recoger` : `Pagado · ${esc(payLine(o))}`) : "Pagas al recoger"}</span></div>
      ${notifyHTML(o)}
      <ol class="steps">${steps.map((s, i) => { const done = i < idx || (i === 2 && idx >= 2); return `<li class="${done ? "done" : i === idx ? "now" : ""}"><span class="dot">${done ? "✓" : i + 1}</span><div><b>${s[0]}</b><small>${s[1]}</small></div></li>`; }).join("")}</ol>
      ${st !== "done" ? `<div class="chat-row">${chatBtn(o.id, "cb", "customer", "Escribir al negocio")}</div>` : ""}
      ${o.note ? `<div class="onote"><b>Tu nota:</b> ${esc(o.note)}</div>` : ""}
      ${o.promo ? `<div class="promo-hint">${I.tag}<span>${esc(o.promo.title || "Promoción")}: ahorraste <b class="mono">${money(o.promo.off)}</b></span></div>` : ""}
      ${o.reward ? `<div class="reward">${I.gift}<span><b>Premio de cliente frecuente:</b> ${esc(o.reward)}. Recógelo con tu pedido.</span></div>` : ""}
      <div class="points"><span>Total del pedido</span><strong class="mono">${money(o.total)}</strong></div>
      <button class="ghost" data-act="neworder">Hacer otro pedido</button></div>`;
  }
  // Zelle, Cash App, efectivo a domicilio o dos combinados: el servidor arma el pedido con los precios reales.
  async function placeManual(nm, tot) {
    const pp = payPartsOf(tot);
    if (pp.err) { S.payErr = pp.err; paint(renderRest); return; }
    const rid = S.rid; S.busy = true; paint(renderRest);
    try {
      const j = await payApi("createOrder", { rid, name: nm, pickup: S.pickup, note: String(S.note || "").trim().slice(0, 200), promoCode: S.promoCode || "",
        items: Object.entries(S.cart).map(([key, qty]) => ({ key, qty })), pay: pp, ...(isDlv() ? { delivery: { ...S.dlv }, tip: Number(S.tip) || 0 } : {}) });
      S.myOrder = j.orderId; ss.set(`onroute-my-${rid}`, j.orderId);
      ls.set(`onroute-last-${rid}`, { cart: S.cart, name: nm, at: Date.now() });
      S.cart = {}; S.note = ""; S.promoCode = ""; S.promoInput = ""; S.promoMsg = ""; S.view = "status"; S.busy = false; watchMine(); paint(renderRest);
      const c = $("#client"); if (c) c.scrollTop = 0;
    } catch (e) { S.busy = false; S.payErr = String(e.message || "").split(" Detalle:")[0] || "No se pudo enviar el pedido."; if (/Failed to fetch/.test(S.payErr)) S.payErr = "No se pudo conectar. Revisa tu conexión e intenta otra vez."; paint(renderRest); }
  }
  async function placeOrder() {
    const nm = (($("#nameInput") || {}).value || "").trim().slice(0, 40);
    if (!nm) { S.payErr = "Escribe tu nombre para que te llamen cuando esté listo."; paint(renderRest); const i = $("#nameInput"); if (i) i.focus(); return; }
    S.name = nm; ls.set("onroute-name", nm); S.payErr = "";
    const rid = S.rid;
    if (isDlv()) {
      const D = S.dlv || {}, q = dlvQuote();
      if (!q) { S.payErr = "Escribe tu dirección de entrega y elígela de la lista."; paint(renderRest); return; }
      if (q.far) { S.payErr = "Tu dirección está fuera del área de entrega de este negocio."; paint(renderRest); return; }
      if (String(D.phone || (S.profile && S.profile.phone) || "").replace(/\D/g, "").length < 7) { S.payErr = "Escribe tu teléfono para que el repartidor te pueda llamar."; paint(renderRest); return; }
      if (!D.phone && S.profile && S.profile.phone) S.dlv.phone = S.profile.phone;
      ls.set("onroute-dlv", S.dlv);
    }
    const { tot: totNow } = cartTotals();
    if (S.payMode !== "card" && (isDlv() || S.payMode !== "cash")) { placeManual(nm, totNow); return; }
    if (S.payMode === "card") {
      S.busy = true; paint(renderRest);
      try {
        const headers = { "Content-Type": "application/json" };
        if (S.user) { try { headers.Authorization = "Bearer " + (await S.user.getIdToken()); } catch (e) {} }
        const r = await fetch(window.ONROUTE_API + "/createCheckout", { method: "POST", headers,
          body: JSON.stringify({ rid, name: nm, pickup: S.pickup, note: String(S.note || "").trim().slice(0, 200), cart: S.cart, items: Object.entries(S.cart).map(([key, qty]) => ({ key, qty })),
            ...(isDlv() ? { delivery: { ...S.dlv }, tip: Number(S.tip) || 0 } : {}) }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.url) throw new Error(j.error || "No se pudo iniciar el pago.");
        ls.set("onroute-pending", { cart: S.cart, name: nm, orderId: j.orderId, rid, at: Date.now() });
        location.href = j.url;
      } catch (e) { S.busy = false; S.payErr = e.message && e.message !== "Failed to fetch" ? e.message : "No se pudo conectar con el pago. Revisa tu conexión o elige otra forma de pago."; paint(renderRest); }
      return;
    }
    const { sub, pr, tot } = cartTotals(), L = loyaltyOf(S.R), st = myStamps(rid, L);
    const order = { num: "T" + String(Math.floor(100 + Math.random() * 900)), who: nm, items: Object.entries(S.cart).map(([k, q]) => ({ name: parseKey(k).label, qty: q })),
      total: tot, status: "new", pickup: S.pickup, createdAt: Date.now(), pay: "cash" };
    const note = String(S.note || "").trim().slice(0, 200); if (note) order.note = note;
    if (pr) { order.subtotal = sub; order.promo = { title: (pr.p.title || promoText(pr.p)).slice(0, 40), code: pr.p.code, off: pr.off }; }
    if (S.user) order.uid = S.user.uid;
    if (S.user && st && st.ready) order.reward = L.reward;
    S.busy = true; paint(renderRest);
    try {
      const ref = db.collection(`restaurants/${rid}/orders`).doc();
      await ref.set(order);
      S.myOrder = ref.id; ss.set(`onroute-my-${rid}`, ref.id);
      ls.set(`onroute-last-${rid}`, { cart: S.cart, name: nm, at: Date.now() });
      if (S.user) db.doc(`users/${S.user.uid}/orders/${ref.id}`).set({ rid, rname: S.R.name, num: order.num, total: order.total, items: order.items, cart: S.cart, pay: "cash", createdAt: order.createdAt })
        .catch(e => console.error("OnRoute: historial", e));
      S.cart = {}; S.note = ""; S.promoCode = ""; S.promoInput = ""; S.promoMsg = ""; S.view = "status"; S.busy = false; watchMine(); paint(renderRest);
      const c = $("#client"); if (c) c.scrollTop = 0;
    } catch (e) {
      console.error("OnRoute: pedido", e); S.busy = false;
      S.payErr = e && e.code === "permission-denied" ? "Este negocio no está recibiendo pedidos en este momento." : "No se pudo enviar el pedido. Revisa tu conexión e intenta otra vez.";
      paint(renderRest);
    }
  }

  // ================================================================ MI NEGOCIO
  let authUnsub = null, myUnsub = null, ordUnsub = null, myMenuUnsub = null, allUnsub = null, profUnsub = null, histUnsub = null, usersUnsub = null, pfMap = null, pfMarker = null;
  // Una sola sesión para toda la app: define el rol (cliente, negocio o administrador).
  function initAuth() {
    authUnsub = auth.onAuthStateChanged(u => {
      S.user = u; S.authReady = true; S.isAdmin = false; S.my = null; S.myReady = false; S.profile = null; S.profileReady = false;
      S.hist = []; S.histReady = false; S.users = []; S.usersReady = false; S.all = []; S.allReady = false; S.stats = null;
      S.drv = null; S.drvReady = false; S.drvForm = null; S.drvLic = ""; S.drivers = []; S.driversReady = false;
      [drvUnsub, driversUnsub, availUnsub, curUnsub, mineDUnsub].forEach(f => { try { f && f(); } catch (e) {} }); drvUnsub = driversUnsub = availUnsub = curUnsub = mineDUnsub = null;
      S.avail = []; S.cur = null; S.curId = null; S.curInfo = null; S.myDlv = []; if (drvWatch !== null) drvGps(false);
      [myUnsub, ordUnsub, myMenuUnsub, allUnsub, profUnsub, histUnsub, usersUnsub].forEach(f => { try { f && f(); } catch (e) {} });
      myUnsub = ordUnsub = myMenuUnsub = allUnsub = profUnsub = histUnsub = usersUnsub = null;
      [supUnsub, mySupUnsub].forEach(f => { try { f && f(); } catch (e) {} }); supUnsub = mySupUnsub = null; S.sup = []; S.supReady = false; S.mySup = null;
      stopGps(true);
      if (u) {
        db.doc("meta/owner").get().then(d => { S.isAdmin = !!(d.exists && d.data().uid === u.uid); if (S.isAdmin) { watchAll(); watchUsers(); watchDrivers(); watchSupport(); } afterAuth(); }).catch(() => afterAuth());
        drvUnsub = db.doc(`drivers/${u.uid}`).onSnapshot(s => { S.drv = s.exists ? { id: s.id, ...s.data() } : null; S.drvReady = true; afterAuth(); }, () => { S.drvReady = true; afterAuth(); });
        profUnsub = db.doc(`users/${u.uid}`).onSnapshot(s => { S.profile = s.exists ? s.data() : null; S.profileReady = true; afterAuth(); }, () => { S.profileReady = true; afterAuth(); });
        myUnsub = db.collection("restaurants").where("ownerUid", "==", u.uid).limit(1).onSnapshot(snap => {
          const d = snap.docs[0], prev = S.my && S.my.id;
          S.my = d ? { id: d.id, ...d.data() } : null; S.myReady = true;
          if (S.my && S.my.id !== prev) watchMine2(S.my.id);
          if (S.my && !S.pfDirty) S.pf = null;
          if (S.my && !S.prDirty) S.pr = null;
          afterAuth();
        }, err => { console.error("OnRoute: mi negocio", err); S.myReady = true; afterAuth(); });
        histUnsub = db.collection(`users/${u.uid}/orders`).orderBy("createdAt", "desc").limit(100).onSnapshot(
          snap => { S.hist = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.histReady = true; if (S.route.name === "account") paint(renderAccount); if (S.route.name === "rest") paint(renderRest); },
          () => { S.histReady = true; });
      }
      afterAuth();
    });
  }
  let drvUnsub = null, driversUnsub = null, admDlvUnsub = null, owedUnsub = null, ledUnsub = null;
  function watchDrivers() {
    if (driversUnsub) return;
    driversUnsub = db.collection("drivers").onSnapshot(snap => { S.drivers = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.driversReady = true; if (S.route.name === "admin") paint(renderAdmin); }, e => { console.warn("OnRoute: repartidores", e); S.driversReady = true; });
  }
  // ================================================================ CENTRO DE AYUDA, MENÚ Y SOPORTE
  let supUnsub = null, mySupUnsub = null;
  const SUP_TOPICS = { order: "Un pedido", pay: "Pago o reembolso", biz: "Mi negocio", drv: "Repartidor / entregas", acct: "Mi cuenta", bug: "La app no funciona bien", other: "Otro" };
  const APP_VER = "1.39";
  let docsCache = null;
  function helpDocs() { if (!docsCache) docsCache = typeof window.ONROUTE_DOCS === "function" ? window.ONROUTE_DOCS(DLV) : []; return docsCache; }
  function renderHelp() {
    const v = $("#vHelp"), docs = helpDocs(), sec = S.route.sec || "", doc = docs.find(x => x.id === sec);
    const groups = [...new Set(docs.map(x => x.group))];
    const side = `<nav class="hl-side scroll" aria-label="Secciones de ayuda"><a class="hl-home" href="./#ayuda" data-help="" aria-current="${!doc}">Centro de ayuda</a>${groups.map(g => `<p class="hl-g">${esc(g)}</p>${docs.filter(x => x.group === g).map(x => `<a href="./#ayuda/${x.id}" data-help="${x.id}" aria-current="${x.id === sec}"><span aria-hidden="true">${x.icon}</span>${esc(x.title)}</a>`).join("")}`).join("")}</nav>`;
    let main;
    if (!doc) {
      main = `<div class="hl-hero"><h1>Centro de ayuda</h1><p>Todo lo que necesitas para pedir, vender y repartir con OnRoute.</p></div>
        ${groups.map(g => `<h2 class="hl-gt">${esc(g)}</h2><div class="hl-grid">${docs.filter(x => x.group === g).map(x => `<a class="hl-card" href="./#ayuda/${x.id}" data-help="${x.id}"><span class="hl-ic" aria-hidden="true">${x.icon}</span><b>${esc(x.title)}</b></a>`).join("")}</div>`).join("")}
        <p class="hint hl-ver">OnRoute v${APP_VER} · © ${new Date().getFullYear()} InnovationTECH · San Antonio, TX</p>`;
    } else {
      const i = docs.indexOf(doc), prev = docs[i - 1], next = docs[i + 1];
      main = `<a class="back-link hl-back" href="./#ayuda" data-help="">← Centro de ayuda</a>
        <article class="doc"><p class="hl-kicker">${esc(doc.group)}</p><h1>${esc(doc.title)}</h1>${doc.html}</article>
        <div class="hl-pn">${prev ? `<a href="./#ayuda/${prev.id}" data-help="${prev.id}"><small>Anterior</small>${esc(prev.title)}</a>` : "<span></span>"}${next ? `<a class="nx" href="./#ayuda/${next.id}" data-help="${next.id}"><small>Siguiente</small>${esc(next.title)}</a>` : ""}</div>
        ${doc.id !== "contacto" ? `<div class="hl-more"><b>¿No encontraste lo que buscabas?</b><a class="btn sec sm" href="./#ayuda/contacto" data-help="contacto">Escríbenos</a></div>` : ""}`;
    }
    v.innerHTML = `<div class="help">${side}<div class="hl-main scroll" id="hlMain"><div class="hl-in">${main}</div></div></div>`;
    $("#hlMain").scrollTop = 0;
    if (doc && doc.id === "contacto") { paintSupport(); watchMySupport(); }
  }
  // --- Formulario de soporte (cualquiera puede escribir; solo el admin ve todos los reportes)
  function paintSupport() {
    const box = $("#supportBox"); if (!box) return;
    if ($("#supMsg")) readSup();
    const f = S.supForm || (S.supForm = { name: (S.profile && S.profile.name) || (S.user && S.user.displayName) || "", email: (S.user && S.user.email) || "", topic: "", ref: "", msg: "" });
    if (!f.name) f.name = (S.profile && S.profile.name) || (S.user && S.user.displayName) || "";
    if (!f.email) f.email = (S.user && S.user.email) || "";
    const mail = window.ONROUTE_SUPPORT_EMAIL;
    box.innerHTML = `${S.supSent ? `<div class="banner ok"><span><b>¡Recibimos tu mensaje!</b> Te contestamos ${S.user ? "aquí mismo y " : ""}a tu correo lo antes posible.</span><button class="btn sm sec" data-act="supnew">Escribir otro</button></div>` : `
      <div class="sup-form">
        <div class="frow"><div class="field"><label for="supName">Tu nombre</label><input id="supName" maxlength="60" autocomplete="name" value="${esc(f.name)}"></div>
          <div class="field"><label for="supEmail">Correo para responderte</label><input id="supEmail" type="email" maxlength="120" autocomplete="email" value="${esc(f.email)}"></div></div>
        <div class="frow"><div class="field"><label for="supTopic">¿Sobre qué es?</label><select id="supTopic"><option value="">Elige una opción</option>${Object.entries(SUP_TOPICS).map(([k, l]) => `<option value="${k}" ${f.topic === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
          <div class="field"><label for="supRef">Número de pedido <span class="hint">(si aplica)</span></label><input id="supRef" maxlength="40" value="${esc(f.ref)}" placeholder="Ej. 1042"></div></div>
        <div class="field"><label for="supMsg">Cuéntanos qué pasó</label><textarea id="supMsg" rows="5" maxlength="2000" placeholder="Con más detalle te ayudamos más rápido.">${esc(f.msg)}</textarea></div>
        <p class="hint">Nunca te pediremos tu contraseña ni los datos de tu tarjeta. No los escribas aquí.</p>
        ${S.supMsg ? `<p class="err" role="alert">${esc(S.supMsg)}</p>` : ""}
        <button class="btn green" data-act="sup" ${S.supBusy ? "disabled" : ""}>${S.supBusy ? "Enviando…" : "Enviar mensaje"}</button>
      </div>`}
      ${mail ? `<p class="hint" style="margin-top:12px">También puedes escribir a <a href="mailto:${esc(mail)}">${esc(mail)}</a>.</p>` : ""}
      ${S.user ? `<div class="sup-mine"><h3>Mis reportes</h3>${S.mySup === null ? `<p class="hint">Cargando…</p>` : !S.mySup.length ? `<p class="hint">Todavía no has mandado reportes.</p>` : S.mySup.map(x => `<div class="sup-row ${x.status === "open" ? "open" : ""}"><div class="sup-h"><b>${esc(SUP_TOPICS[x.topic] || x.topic)}${x.ref ? " · pedido " + esc(x.ref) : ""}</b><span class="chip cdot ${x.status === "open" ? "closed" : "open"}">${x.status === "open" ? "En revisión" : "Resuelto"}</span></div><span class="hint">${ago(num(x.createdAt))}</span><p class="sup-msg">${esc(x.msg)}</p>${x.reply ? `<p class="sup-reply"><b>Respuesta de OnRoute:</b> ${esc(x.reply)}</p>` : ""}</div>`).join("")}</div>` : `<p class="hint" style="margin-top:14px"><a href="./#cuenta" data-nav="account">Entra a tu cuenta</a> para ver las respuestas a tus reportes dentro de la app.</p>`}`;
  }
  function watchMySupport() {
    if (!S.user || mySupUnsub) return;
    mySupUnsub = db.collection("support").where("uid", "==", S.user.uid).limit(30).onSnapshot(sn => {
      S.mySup = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => num(b.createdAt) - num(a.createdAt));
      if (S.route.name === "help" && S.route.sec === "contacto") paintSupport();
    }, e => { console.warn("OnRoute: mis reportes", e); S.mySup = []; });
  }
  function readSup() { const f = S.supForm || {}; ["name", "email", "topic", "ref", "msg"].forEach(k => { const el = $("#sup" + k[0].toUpperCase() + k.slice(1)); if (el) f[k] = el.value; }); S.supForm = f; return f; }
  async function sendSupport() {
    const f = readSup(), name = f.name.trim(), email = f.email.trim(), msg = f.msg.trim();
    S.supMsg = !name ? "Escribe tu nombre." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Escribe un correo válido para poder responderte." : !SUP_TOPICS[f.topic] ? "Elige sobre qué es tu mensaje." : msg.length < 10 ? "Cuéntanos un poco más (mínimo 10 letras)." : "";
    if (S.supMsg) { paintSupport(); return; }
    // Freno sencillo para no mandar muchos reportes seguidos desde el mismo navegador.
    const last = Number(ls.get("onroute-sup-at")) || 0;
    if (Date.now() - last < 60000) { S.supMsg = "Espera un minuto antes de mandar otro mensaje."; paintSupport(); return; }
    S.supBusy = true; paintSupport();
    try {
      await db.collection("support").add({ uid: S.user ? S.user.uid : null, name: name.slice(0, 60), email: email.slice(0, 120), topic: f.topic, ref: f.ref.trim().slice(0, 40), msg: msg.slice(0, 2000), mode: (S.mode || "").slice(0, 20), status: "open", createdAt: Date.now() });
      ls.set("onroute-sup-at", String(Date.now()));
      S.supSent = true; S.supForm = null; S.supMsg = "";
    } catch (e) { console.error("OnRoute: soporte", e); S.supMsg = "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo."; }
    S.supBusy = false; paintSupport();
  }
  function watchSupport() {
    if (supUnsub) return;
    supUnsub = db.collection("support").orderBy("createdAt", "desc").limit(150).onSnapshot(sn => { S.sup = sn.docs.map(d => ({ id: d.id, ...d.data() })); S.supReady = true; if (S.route.name === "admin") paint(renderAdmin); },
      e => { console.warn("OnRoute: soporte (admin)", e); S.supReady = true; });
  }
  async function supUpdate(id, st) {
    const ta = $("#supR-" + id), reply = ta ? ta.value.trim().slice(0, 2000) : "";
    const data = { status: st === "open" ? "open" : "done" };
    if (reply) { data.reply = reply; data.repliedAt = Date.now(); }
    try { await db.doc(`support/${id}`).update(data); toast(st === "open" ? "Reporte reabierto." : "Reporte marcado como resuelto."); }
    catch (e) { console.error(e); toast("No se pudo guardar."); }
  }
  // --- Menú lateral (hamburguesa)
  function openDrawer() { S.drawer = true; renderDrawer(); const b = $("#menuBtn"); if (b) { b.setAttribute("aria-expanded", "true"); b.setAttribute("aria-label", "Cerrar menú"); } setTimeout(() => { const f = $("#drawer .dr-close"); if (f) f.focus(); }, 30); }
  function closeDrawer() { if (!S.drawer) return; S.drawer = false; const dr = $("#drawer"); if (dr) { dr.hidden = true; dr.innerHTML = ""; } const b = $("#menuBtn"); if (b) { b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", "Abrir menú"); } }
  const standalone = () => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } };
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });
  window.addEventListener("appinstalled", () => { installEvt = null; toast("¡OnRoute quedó instalada!"); });
  async function installApp() {
    if (installEvt) { try { installEvt.prompt(); await installEvt.userChoice; } catch (e) {} installEvt = null; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(ios ? "En Safari toca Compartir y luego “Agregar a pantalla de inicio”." : "En el menú del navegador (⋮) elige “Instalar app” o “Agregar a pantalla de inicio”.");
  }
  async function shareApp() {
    const url = "https://getonroute.app/", data = { title: "OnRoute", text: "Pide directo a food trucks y restaurantes cerca de ti, sin comisiones de apps de delivery.", url };
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); toast("Enlace de OnRoute copiado."); } catch (e) { toast(url); }
  }
  function renderDrawer() {
    const dr = $("#drawer"); if (!dr) return;
    const role = roleOf(), n = S.route.name, u = S.user;
    const who = u ? ((S.profile && S.profile.name) || u.displayName || u.email || "Mi cuenta") : "";
    const roleL = S.isAdmin ? "Administrador" : role === "business" ? (S.my ? esc(S.my.name) : "Negocio") : role === "driver" ? "Repartidor" : "Cliente";
    const it = (attrs, icon, label, cur, extra) => `<a ${attrs} class="dr-it" ${cur ? 'aria-current="page"' : ""}><span class="dr-ic">${icon}</span><span>${label}</span>${extra || ""}</a>`;
    const supOpen = S.isAdmin ? (S.sup || []).filter(x => x.status === "open").length : 0;
    dr.innerHTML = `<aside class="dr-panel scroll" role="dialog" aria-modal="true" aria-label="Menú de OnRoute">
      <div class="dr-head"><span class="dr-logo">On<b>Route</b></span><button class="dr-close" data-act="menu" aria-label="Cerrar menú">✕</button></div>
      <div class="dr-user">${u ? `<span class="dr-av">${esc(initials(who))}</span><div><b>${esc(who)}</b><small>${roleL}${u.email && u.email !== who ? " · " + esc(u.email) : ""}</small></div>`
        : `<span class="dr-av">${I.prof}</span><div><b>Invitado</b><small>Entra para guardar tus pedidos</small></div>`}</div>
      <p class="dr-g">Usar OnRoute</p>
      ${it('href="./" data-nav="welcome"', I.target, "Inicio", n === "welcome")}
      ${it('href="./#explorar" data-pick="cliente"', I.food, "Pedir comida", n === "home" || n === "rest")}
      ${it('href="./#panel" data-pick="negocio"', I.store, S.my ? "Mi negocio" : "Tengo un negocio", n === "panel")}
      ${it('href="./#repartir" data-pick="repartidor"', I.car, "Repartir", n === "driver")}
      ${u ? it('href="./#cuenta" data-nav="account"', I.orders, role === "business" ? "Mi cuenta" : "Mis pedidos y cuenta", n === "account") : ""}
      ${S.isAdmin ? it('href="./#admin" data-nav="admin"', I.adm, "Administración", n === "admin", supOpen ? `<i class="badge">${supOpen}</i>` : "") : ""}
      <p class="dr-g">Ayuda</p>
      ${it('href="./#ayuda" data-help=""', I.help, "Centro de ayuda", n === "help" && !S.route.sec)}
      ${it('href="./#ayuda/como-funciona" data-help="como-funciona"', I.menu, "Cómo funciona", n === "help" && S.route.sec === "como-funciona")}
      ${it('href="./#ayuda/faq" data-help="faq"', I.alert, "Preguntas frecuentes", n === "help" && S.route.sec === "faq")}
      ${it('href="./#ayuda/tarifas" data-help="tarifas"', I.cash, "Tarifas y pagos", n === "help" && S.route.sec === "tarifas")}
      ${it('href="./#ayuda/contacto" data-help="contacto"', I.chat, "Contacto y soporte", n === "help" && S.route.sec === "contacto")}
      <p class="dr-g">App</p>
      ${standalone() ? "" : `<button class="dr-it" data-act="install"><span class="dr-ic">${I.down}</span><span>Instalar OnRoute</span></button>`}
      <button class="dr-it" data-act="share"><span class="dr-ic">${I.share}</span><span>Compartir OnRoute</span></button>
      <div class="dr-foot">
        ${u ? `<button class="btn sec" data-auth="logout">Cerrar sesión</button>` : `<a class="btn dark" href="./#cuenta" data-nav="account">Entrar o crear cuenta</a>`}
        <p class="dr-legal"><a href="./#ayuda/terminos" data-help="terminos">Términos</a> · <a href="./#ayuda/privacidad" data-help="privacidad">Privacidad</a> · <a href="./#ayuda/seguridad" data-help="seguridad">Seguridad</a></p>
        <p class="hint">OnRoute v${APP_VER} · © ${new Date().getFullYear()} InnovationTECH</p>
      </div></aside>`;
    dr.hidden = false;
  }
  function roleOf() { if (!S.user) return null; if (S.my) return "business"; if (S.drv) return "driver"; return (S.profile && S.profile.role) || null; }
  let creatingProfile = false;
  function afterAuth() {
    const u = S.user;
    // Primera vez (por ejemplo con Google): crear su perfil con el rol que eligió.
    if (u && S.profileReady && S.myReady && !S.profile && !creatingProfile) {
      creatingProfile = true;
      const role = S.my ? "business" : S.authRole || (S.route.name === "panel" ? "business" : "customer");
      db.doc(`users/${u.uid}`).set({ role, name: (S.authName || u.displayName || "").trim().slice(0, 60), email: (u.email || "").slice(0, 120), phone: "", favorites: [], createdAt: Date.now() })
        .catch(e => console.error("OnRoute: perfil", e)).finally(() => { creatingProfile = false; });
    }
    // Quien ya tenía cuenta y nunca eligió modo: se elige solo según su cuenta.
    if (u && !S.mode && S.profileReady && S.myReady && S.drvReady && roleOf()) {
      const r0 = roleOf(), m = r0 === "business" ? "negocio" : r0 === "driver" ? "repartidor" : "cliente"; S.mode = m; ls.set(MODE_K, m);
      if (S.route.name === "welcome") paint(renderWelcome);
    }
    // Después de entrar: cada quien a su vista.
    if (u && S.loginIntent && S.profileReady && S.myReady && roleOf()) {
      const role = roleOf(), intent = S.loginIntent; S.loginIntent = null;
      if (S.returnTo) { const t = S.returnTo; S.returnTo = null; go(t.name, t.rid); }
      else if (role === "business" && intent !== "panel") go("panel");
      else if (role === "driver" && intent !== "driver") go("driver");
      else if (role === "customer" && intent === "panel" && S.authRole !== "business") go("account");
    }
    renderNav();
    const n = S.route.name;
    if (n === "panel") paint(renderPanel);
    if (n === "account") paint(renderAccount);
    if (n === "admin") paint(renderAdmin);
    if (n === "rest") paint(renderRest);
    if (n === "driver") paint(renderDriver);
    if (n === "welcome") { $("#vWelcome").dataset.built = ""; paint(renderWelcome); }
    if (n === "help" && S.route.sec === "contacto") { paintSupport(); watchMySupport(); }
    if (S.drawer) renderDrawer();
  }
  // ---------------------------------------------------------------- repartidores
  const PAY_APPS = { cashapp: ["Cash App", "Tu $cashtag", "Ej. $juanperez"], zelle: ["Zelle", "Correo o teléfono de Zelle", "Ej. 210 555 0123"], venmo: ["Venmo", "Tu usuario de Venmo", "Ej. @juan-perez"] };
  const manualPay = D => !!(D && D.payout && D.payout.method === "manual" && D.payout.handle);
  const DRV_ATTEST = [
    ["license", "Tengo 18 años o más y mi licencia de manejo está vigente."],
    ["registration", "Mi auto tiene registro y placas vigentes."],
    ["insurance", "Tengo seguro de auto vigente y me aseguro de que cubra hacer entregas."],
    ["terms", "Acepto los términos para repartidores: trabajo como contratista independiente, respeto las leyes de tránsito y cuido la higiene y seguridad de los pedidos."],
  ];
  const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const licDays = iso => iso ? Math.floor((new Date(iso + "T23:59:59") - Date.now()) / 86400000) : -1;
  function drvEnsure() {
    if (S.drvForm) return S.drvForm;
    const D = S.drv || {}, V = D.vehicle || {}, P = S.profile || {};
    S.drvForm = { name: D.name || P.name || (S.user && S.user.displayName) || "", phone: D.phone || P.phone || "", make: V.make || "", model: V.model || "", year: V.year || "", color: V.color || "", plate: V.plate || "",
      licenseExpires: D.licenseExpires || "", attest: { license: false, registration: false, insurance: false, terms: false, ...(D.attest || {}) } };
    return S.drvForm;
  }
  function drvFormHTML(edit) {
    const F = drvEnsure(), f = (k, l, ph, extra = "") => `<div class="field"><label for="df-${k}">${l}</label><input id="df-${k}" data-df="${k}" value="${esc(F[k])}" placeholder="${esc(ph)}" ${extra}></div>`;
    return `<div class="kcard dform">
      <h4>${edit ? "Actualiza tus datos" : "Tu registro de repartidor"}</h4>
      <div class="dgrid">${f("name", "Nombre completo (como en tu licencia)", "Ej. Juan Pérez López", 'maxlength="60" autocomplete="name"')}${f("phone", "Teléfono", "Ej. 210 555 0123", 'maxlength="30" inputmode="tel" autocomplete="tel"')}</div>
      <h5>Tu auto</h5>
      <div class="dgrid three">${f("make", "Marca", "Ej. Toyota", 'maxlength="20"')}${f("model", "Modelo", "Ej. Corolla", 'maxlength="20"')}${f("year", "Año", "Ej. 2018", 'maxlength="4" inputmode="numeric"')}${f("color", "Color", "Ej. Gris", 'maxlength="15"')}${f("plate", "Placas", "Ej. ABC1234", 'maxlength="12" autocapitalize="characters"')}</div>
      <h5>Tu licencia de manejo</h5>
      <div class="dlic"><div class="dlic-ph" id="dLicPh">${S.drvLic ? `<img src="${esc(S.drvLic)}" alt="Licencia">` : S.drv && S.drv.licenseExpires ? `<span>✓ Ya enviaste tu licencia</span>` : `<span>Sin foto</span>`}</div>
        <div class="dlic-in"><label class="btn sec sm" for="drvLicIn">${I.prof} ${S.drvLic || (S.drv && S.drv.licenseExpires) ? "Cambiar foto" : "Tomar o subir foto"}<input type="file" id="drvLicIn" accept="image/*" capture="environment"></label>
          <span class="hint">Foto del frente, completa, que se lea bien y sin reflejos. Solo la ve el administrador de OnRoute.</span>
          <div class="field"><label for="df-licenseExpires">Fecha de vencimiento</label><input id="df-licenseExpires" data-df="licenseExpires" type="date" min="${todayISO()}" value="${esc(F.licenseExpires)}"></div></div></div>
      <h5>Declaraciones</h5>
      <div class="dattest">${DRV_ATTEST.map(([k, t]) => `<label><input type="checkbox" data-da="${k}" ${F.attest[k] ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>
      <p class="hint">En Texas el seguro del auto es obligatorio. Muchas pólizas personales no cubren hacer entregas: pregúntale a tu aseguradora antes de empezar.</p>
      ${S.drvMsg ? `<p class="${/^Listo|enviado/i.test(S.drvMsg) ? "ok-msg" : "err"}" role="alert">${esc(S.drvMsg)}</p>` : ""}
      <button class="btn green" data-act="drvsave" ${S.drvBusy ? "disabled" : ""}>${S.drvBusy ? "Enviando…" : edit ? "Guardar cambios" : "Enviar mi registro"}</button>
    </div>`;
  }
  async function drvSave() {
    const F = drvEnsure(), D = S.drv, u = S.user;
    const fail = m => { S.drvMsg = m; paint(renderDriver); };
    if (F.name.trim().length < 2) return fail("Escribe tu nombre completo.");
    if (F.phone.replace(/\D/g, "").length < 7) return fail("Escribe un teléfono válido.");
    if (!F.make.trim() || !F.model.trim() || !F.color.trim()) return fail("Completa la marca, el modelo y el color de tu auto.");
    if (F.plate.trim().length < 2) return fail("Escribe las placas de tu auto.");
    if (F.year && !/^(19[89]\d|20\d\d)$/.test(F.year.trim())) return fail("Revisa el año del auto.");
    if (!S.drvLic && !(D && D.licenseExpires)) return fail("Falta la foto de tu licencia.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(F.licenseExpires)) return fail("Pon la fecha de vencimiento de tu licencia.");
    if (licDays(F.licenseExpires) < 0) return fail("Tu licencia está vencida. Necesitas una licencia vigente para repartir.");
    if (!DRV_ATTEST.every(([k]) => F.attest[k])) return fail("Marca todas las declaraciones para continuar.");
    S.drvBusy = true; S.drvMsg = ""; paint(renderDriver);
    try {
      if (S.drvLic) await db.doc(`drivers/${u.uid}/docs/license`).set({ data: S.drvLic, createdAt: Date.now() });
      const data = { name: F.name.trim().slice(0, 60), phone: F.phone.trim().slice(0, 30), email: String(u.email || "").slice(0, 120),
        vehicle: { make: F.make.trim().slice(0, 20), model: F.model.trim().slice(0, 20), year: F.year.trim().slice(0, 4), color: F.color.trim().slice(0, 15), plate: F.plate.trim().toUpperCase().slice(0, 12) },
        licenseExpires: F.licenseExpires, attest: { license: true, registration: true, insurance: true, terms: true }, updatedAt: Date.now() };
      if (D) await db.doc(`drivers/${u.uid}`).update(data);
      else await db.doc(`drivers/${u.uid}`).set({ ...data, online: false, status: "pending", createdAt: Date.now() });
      if (S.profile && S.profile.role === "customer") db.doc(`users/${u.uid}`).update({ role: "driver" }).catch(() => {});
      S.drvLic = ""; S.drvForm = null; S.drvEdit = false; S.drvMsg = D ? "Listo, tus datos se guardaron." : "";
      if (!D) toast("¡Registro enviado! Te avisamos cuando te aprobemos.");
    } catch (e) { console.error("OnRoute: repartidor", e); S.drvMsg = e && e.code === "permission-denied" ? "Firebase no dio permiso. Revisa que publicaste las reglas nuevas de Firestore." : "No se pudo enviar. Revisa tu conexión e intenta otra vez."; }
    S.drvBusy = false; paint(renderDriver);
  }
  async function drvStripe(kind) {
    S.drvStripeBusy = true; S.drvStripeErr = null; paint(renderDriver);
    try {
      if (kind === "start") { const j = await payApi("driverStart", {}); location.href = j.url; return; }
      S.drvStripeInfo = await payApi("driverStatus", {});
      if (S.drvStripeInfo.ready) toast("¡Listo! Ya puedes recibir tus pagos.");
    } catch (e) { console.error("OnRoute: Stripe repartidor", e); S.drvStripeErr = stripeErrOf(e); }
    S.drvStripeBusy = false; paint(renderDriver);
  }
  function renderDriver() {
    const v = $("#vDriver");
    const head = `<div class="p-head"><h2>Repartidores</h2><span class="grow"></span>${S.drv && S.drv.status === "active" ? `<span class="chip cdot open">Aprobado</span>` : ""}</div>`;
    const wrap = inner => `<div class="panel">${head}<div class="p-auth scroll"><div class="drv">${inner}</div></div></div>`;
    if (!S.authReady || (S.user && (!S.drvReady || !S.profileReady))) { v.innerHTML = wrap(`<div class="empty-box">Cargando…</div>`); return; }
    if (!S.user) { S.authRole = "driver"; v.innerHTML = wrap(authHTML()); return; }
    if (stripeBack && !S.drvStripeChecked && S.drv) { S.drvStripeChecked = true; if (stripeBack === "back") setTimeout(() => drvStripe("status"), 0); }
    const D = S.drv;
    const keep = () => { const a = document.activeElement; return a && v.contains(a) && /INPUT|TEXTAREA/.test(a.tagName) ? a.id : null; };
    const focusId = keep();
    let html;
    if (!D) {
      html = `<div class="kcard dintro"><div class="auth-kicker biz">${I.car}<span>OnRoute Repartidores</span></div>
        <h3>Gana dinero entregando pedidos</h3>
        <ul class="sg-list"><li>Tú decides cuándo te conectas.</li><li>Recibes casi todo el costo de envío y el <b>100% de las propinas</b>.</li><li>Te pagamos con Stripe directo a tu banco, con retiro inmediato.</li></ul>
        <p class="hint">Necesitas: licencia de manejo vigente, tu propio auto con registro y seguro vigentes, y un celular con GPS.</p></div>
        ${drvFormHTML(false)}`;
    } else if (D.status === "suspended") {
      html = `<div class="kcard"><h3>Tu cuenta de repartidor está suspendida</h3><p class="hint">Si crees que es un error, escribe al soporte de OnRoute.</p></div>`;
    } else if (D.status !== "active") {
      html = `<div class="kcard dstate"><div class="dbig">⏳</div><h3>Tu registro está en revisión</h3><p class="hint">Revisamos tu licencia y tus datos, normalmente en 1 o 2 días. Te avisamos cuando estés aprobado.</p></div>
        ${S.drvEdit ? drvFormHTML(true) : `<div class="kcard">${drvSummaryHTML(D)}<button class="btn sec sm" data-act="drvedit">Corregir mis datos</button></div>`}`;
    } else {
      const I2 = S.drvStripeInfo, stripeOk = D.stripeReady || (I2 && I2.ready), ready = stripeOk || manualPay(D), days = licDays(D.licenseExpires);
      setTimeout(drvWatchData, 0);
      const lic = days < 0 ? `<div class="sg-err"><b>Tu licencia venció</b><span>Actualiza tu licencia para seguir repartiendo.</span></div>` : days <= 30 ? `<div class="banner info"><span><b>Tu licencia vence en ${days} día${days === 1 ? "" : "s"}.</b> Actualízala cuando la renueves.</span></div>` : "";
      const mine = I2 && I2.missing ? I2.missing.filter(m => m.who === "user") : [];
      const E = S.drvStripeErr;
      const pm = S.payPick || (manualPay(D) ? "manual" : "stripe"), PD = D.payout || {}, pApp = S.payApp || PD.app || "cashapp";
      const cobros = `<div class="kcard dpay"><h4>¿Cómo quieres recibir tu dinero?</h4>
          <div class="choices">
            <button data-paypick="stripe" aria-pressed="${pm === "stripe"}"><b>Depósito a tu banco</b>Automático con Stripe · retiro al instante</button>
            <button data-paypick="manual" aria-pressed="${pm === "manual"}"><b>Cash App, Zelle o Venmo</b>OnRoute te paga cada semana</button>
          </div>
          ${pm === "stripe" ? (stripeOk ? `<div class="sg-ok">✓ Banco conectado · listo para recibir pagos</div><p class="hint">Tus ganancias se depositan solas al entregar. Puedes retirar al instante desde tu panel de Stripe Express.${manualPay(D) ? " Ahora mismo recibes por " + esc(PAY_APPS[PD.app][0]) + "; toca Usar depósito a mi banco para cambiar." : ""}</p>${manualPay(D) ? `<button class="btn sec sm" data-act="payuse" data-m="stripe">Usar depósito a mi banco</button>` : ""}`
            : `<p class="hint">Stripe te pide tu nombre, fecha de nacimiento, los últimos 4 del SSN y tu banco, y te manda tu formulario 1099 de impuestos. <b>También puedes poner los números de tu cuenta de Cash App</b> (en Cash App: Banca → números de cuenta y ruta) o una tarjeta de débito.</p>
             ${mine.length ? `<div class="sg-box"><b>Stripe todavía necesita:</b><ul class="sg-need">${mine.map(m => { const n = sgNeed(m); return `<li><b>${esc(n.title)}</b>${n.tip ? `<span>${esc(n.tip)}</span>` : ""}</li>`; }).join("")}</ul></div>` : ""}
             ${E ? `<div class="sg-err" role="alert"><b>${esc(E.title)}</b><span>${esc(E.what)}</span>${E.detail ? `<details><summary>Detalle técnico</summary><code>${esc(E.detail)}</code></details>` : ""}</div>` : ""}
             <div class="sg-btns"><button class="btn" data-act="drvstripe" ${S.drvStripeBusy ? "disabled" : ""}>${S.drvStripeBusy ? "Un momento…" : D.stripeAccount ? "Continuar en Stripe" : "Conectar mi banco"}</button>${D.stripeAccount ? `<button class="btn sec sm" data-act="drvstripechk" ${S.drvStripeBusy ? "disabled" : ""}>Revisar estado</button>` : ""}</div>`)
          : `<div class="tips">${Object.entries(PAY_APPS).map(([k, v]) => `<button type="button" data-payapp="${k}" aria-pressed="${pApp === k}">${v[0]}</button>`).join("")}</div>
             <div class="field"><label for="payHandle">${esc(PAY_APPS[pApp][1])}</label><input id="payHandle" maxlength="60" value="${esc(S.payHandle != null ? S.payHandle : PD.app === pApp ? PD.handle || "" : "")}" placeholder="${esc(PAY_APPS[pApp][2])}"></div>
             <p class="hint">Tus ganancias se juntan y OnRoute te las manda cada semana por ${esc(PAY_APPS[pApp][0])}. Revisa que el dato esté bien escrito: un error puede mandar tu dinero a otra persona.</p>
             ${manualPay(D) ? `<div class="sg-ok">✓ Recibes por ${esc(PAY_APPS[PD.app][0])}: ${esc(PD.handle)}</div>` : ""}
             <button class="btn" data-act="payuse" data-m="manual" ${S.payBusy ? "disabled" : ""}>${S.payBusy ? "Guardando…" : manualPay(D) ? "Guardar cambios" : "Recibir por " + esc(PAY_APPS[pApp][0])}</button>`}
        </div>`;
      html = `${lic}${ready ? drvOpsHTML(D) + cobros : cobros + `<div class="kcard dsoon"><h4>Entregas</h4><div class="dbig">🚗</div><p><b>¡Ya estás aprobado!</b> Elige cómo recibir tu dinero (arriba) y aquí podrás conectarte para recibir entregas cerca de ti.</p></div>`}
        ${S.drvEdit ? drvFormHTML(true) : `<div class="kcard">${drvSummaryHTML(D)}<button class="btn sec sm" data-act="drvedit">Actualizar mis datos o licencia</button></div>`}`;
    }
    html += `<div class="kcard session" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px"><span class="hint">Sesión: ${esc(S.user.email || "")}</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec sm" data-pick="cliente">${I.food} Pedir comida</button><button class="btn sec sm" data-auth="logout">Cerrar sesión</button></div></div>`;
    if (v.dataset.h !== html) { v.dataset.h = html; v.innerHTML = wrap(html); if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (e) {} } } }
  }
  // ---- Operación del repartidor: en línea, entregas disponibles, entrega actual y ganancias
  let drvWatch = null, drvLastSent = 0, availUnsub = null, curUnsub = null, mineDUnsub = null, availSeen = null;
  function drvWatchData() {
    const D = S.drv; if (!D || D.status !== "active" || !S.user) return;
    if (!mineDUnsub) mineDUnsub = db.collection("deliveries").where("driverUid", "==", S.user.uid).onSnapshot(sn => { S.myDlv = sn.docs.map(x => ({ id: x.id, ...x.data() })); paint(renderDriver); }, e => console.warn("OnRoute: mis entregas", e));
    if (D.online && !availUnsub) availUnsub = db.collection("deliveries").where("status", "==", "searching").onSnapshot(sn => {
      S.avail = sn.docs.map(x => ({ id: x.id, ...x.data() }));
      const ids = new Set(S.avail.map(x => x.id));
      if (availSeen && S.avail.some(x => !availSeen.has(x.id)) && !D.current) { chime(); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} toast("¡Nueva entrega disponible cerca!"); }
      availSeen = ids; paint(renderDriver);
    }, e => console.warn("OnRoute: entregas disponibles", e));
    if (!D.online && availUnsub) { availUnsub(); availUnsub = null; availSeen = null; S.avail = []; }
    const cur = D.current || null;
    if (cur !== S.curId) {
      if (curUnsub) { curUnsub(); curUnsub = null; } S.curId = cur; S.cur = null; S.curInfo = null;
      if (cur) {
        curUnsub = db.doc(`deliveries/${cur}`).onSnapshot(x => { S.cur = x.exists ? { id: x.id, ...x.data() } : null; paint(renderDriver); }, () => {});
        db.doc(`deliveries/${cur}/private/info`).get().then(x => { S.curInfo = x.exists ? x.data() : null; paint(renderDriver); }).catch(e => console.warn("OnRoute: datos de entrega", e));
      }
    }
    if ((D.online || cur) && drvWatch === null) drvGps(true);
    if (!D.online && !cur && drvWatch !== null) drvGps(false);
  }
  function drvGps(on) {
    if (!on) { if (drvWatch !== null) navigator.geolocation.clearWatch(drvWatch); drvWatch = null; return; }
    if (!navigator.geolocation) { toast("Este celular no tiene GPS disponible."); return; }
    drvWatch = navigator.geolocation.watchPosition(p => {
      const loc = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() }; S.drvPos = loc;
      if (Date.now() - drvLastSent < 15000) return; drvLastSent = Date.now();
      db.doc(`drivers/${S.user.uid}`).update({ loc, updatedAt: Date.now() }).catch(() => {});
      if (S.cur && ["assigned", "picked"].includes(S.cur.status)) db.doc(`deliveries/${S.cur.id}`).update({ driverLoc: loc }).catch(() => {});
    }, e => { console.warn("OnRoute: GPS repartidor", e); S.drvGpsErr = "Activa la ubicación de tu celular para recibir entregas."; paint(renderDriver); }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  }
  async function drvPayUse(m) {
    const D = S.drv; if (!D) return;
    let payout;
    if (m === "stripe") payout = { method: "stripe", app: (D.payout && D.payout.app) || "cashapp", handle: (D.payout && D.payout.handle) || "-" };
    else {
      const app = S.payApp || (D.payout && D.payout.app) || "cashapp", h = String(($("#payHandle") || {}).value || "").trim();
      if (h.length < 3) { toast("Escribe tu " + PAY_APPS[app][1].toLowerCase() + "."); return; }
      if (app === "cashapp" && !/^\$?[A-Za-z][A-Za-z0-9_-]{0,20}$/.test(h)) { toast("Tu $cashtag no se ve bien. Ej. $juanperez"); return; }
      payout = { method: "manual", app, handle: (app === "cashapp" && !h.startsWith("$") ? "$" + h : h).slice(0, 60) };
    }
    S.payBusy = true; paint(renderDriver);
    try { await db.doc(`drivers/${S.user.uid}`).update({ payout, updatedAt: Date.now() }); S.payPick = null; S.payHandle = null; toast(m === "manual" ? `Listo: te pagaremos por ${PAY_APPS[payout.app][0]}.` : "Listo: recibirás tus pagos en tu banco."); }
    catch (e) { console.error(e); toast(e && e.code === "permission-denied" ? "Firebase no dio permiso: publica las reglas nuevas." : "No se pudo guardar. Revisa tu conexión."); }
    S.payBusy = false; paint(renderDriver);
  }
  async function drvSetOnline(on) {
    try { await db.doc(`drivers/${S.user.uid}`).update({ online: on, updatedAt: Date.now() }); toast(on ? "Estás en línea. Te avisamos cuando haya entregas." : "Te desconectaste."); }
    catch (e) { console.error(e); toast("No se pudo cambiar. Revisa tu conexión."); }
  }
  async function drvAct(id, action) {
    if (action === "picked" && !confirm("¿Ya tienes el pedido en tus manos?")) return;
    if (action === "delivered" && !confirm("¿Entregaste el pedido al cliente?")) return;
    if (action === "release" && !confirm("¿Soltar esta entrega para que la tome otro repartidor?")) return;
    S.drvActBusy = id; paint(renderDriver);
    try { const j = await payApi("deliveryAction", { id, action }); if (action === "accept") toast("¡Entrega aceptada! Ve al negocio."); if (action === "arrived") toast("Listo: el negocio ya sabe que llegaste."); if (action === "delivered") toast(j.payout === "paid" ? "¡Entregado! Tu pago ya va en camino a tu cuenta." : j.payout === "manual" ? "¡Entregado! Se suma a tu pago de la semana." : "¡Entregado! Tu pago se procesa en las próximas horas."); }
    catch (e) { toast(String(e.message || "No se pudo.").split(" Detalle:")[0]); }
    S.drvActBusy = null; paint(renderDriver);
  }
  const mapsLink = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  function drvOpsHTML(D) {
    const busy = S.drvActBusy, me = S.drvPos || D.loc, C = S.cur, Inf = S.curInfo || {};
    const kitchenTxt = k => ({ new: "Pedido recibido", prep: "Lo están preparando", ready: "¡Listo para recoger!", done: "Listo" })[k] || "";
    let cur = "";
    if (D.current && C && ["assigned", "picked"].includes(C.status)) {
      const P = C.pickup || {};
      setTimeout(() => chatWatch(C.rid, C.id, ["db", "dc"], "driver"), 0);
      cur = C.status === "assigned" ? `<div class="kcard dcur"><div class="dcur-h"><span class="chip cdot open">Paso 1 de 2 · Recoger</span><b class="mono">${money(C.driverPay)}</b></div>
          <h3>${esc(C.rname)}</h3><p class="hint">${esc(P.address || "")}${P.phone ? " · " + esc(P.phone) : ""}</p>
          <div class="dkit ${C.kitchen === "ready" ? "ok" : ""}">${C.kitchen === "ready" ? "✓ " : "⏳ "}${kitchenTxt(C.kitchen)} · Pedido <b class="mono">#${esc(C.num)}</b> · ${C.items || ""} producto(s)</div>
          <div class="sg-btns"><a class="btn sec" target="_blank" rel="noopener" href="${mapsLink(P.lat, P.lng)}">${I.pin} Cómo llegar</a>${P.phone ? `<a class="btn sec" href="tel:${esc(P.phone.replace(/[^\d+]/g, ""))}">Llamar al negocio</a>` : ""}</div>
          <div class="chat-row">${chatBtn(C.id, "db", "driver", "Escribir al negocio")}${chatBtn(C.id, "dc", "driver", "Escribir al cliente")}</div>
          ${C.arrivedAt ? `<div class="dkit ok">📍 Le avisaste al negocio que llegaste · ${ago(C.arrivedAt)}</div>
            <button class="btn green big" data-dact="picked" data-id="${esc(C.id)}" ${busy ? "disabled" : ""}>Ya recogí el pedido #${esc(C.num)}</button>`
          : `<button class="btn green big" data-dact="arrived" data-id="${esc(C.id)}" ${busy ? "disabled" : ""}>📍 Llegué al negocio</button>
            <button class="btn sec" data-dact="picked" data-id="${esc(C.id)}" ${busy ? "disabled" : ""}>Ya recogí el pedido #${esc(C.num)}</button>`}
          <button class="linkbtn" data-dact="release" data-id="${esc(C.id)}">No puedo hacerla · soltar entrega</button></div>`
        : `<div class="kcard dcur"><div class="dcur-h"><span class="chip cdot open">Paso 2 de 2 · Entregar</span><b class="mono">${money(C.driverPay)}</b></div>
          <h3>${esc(Inf.name || "Cliente")}</h3><p><b>${esc(Inf.address || "")}</b>${Inf.unit ? `<br>${esc(Inf.unit)}` : ""}</p>
          ${C.collect > 0 ? `<div class="dcash">💵 Cobra <b class="mono">${money(C.collect)}</b> en efectivo al entregar${C.prepaid > 0 ? ` (el cliente ya pagó ${money(C.prepaid)} por Zelle/Cash App)` : ""}.</div>` : C.pay === "manual" ? `<div class="dcash ok">El cliente ya pagó. No cobres nada.</div>` : ""}
          ${Inf.notes ? `<div class="onote"><b>Indicaciones:</b> ${esc(Inf.notes)}</div>` : ""}
          <div class="sg-btns">${Inf.lat ? `<a class="btn sec" target="_blank" rel="noopener" href="${mapsLink(Inf.lat, Inf.lng)}">${I.pin} Cómo llegar</a>` : ""}${Inf.phone ? `<a class="btn sec" href="tel:${esc(String(Inf.phone).replace(/[^\d+]/g, ""))}">Llamar al cliente</a>` : ""}</div>
          <div class="chat-row">${chatBtn(C.id, "dc", "driver", "Escribir al cliente", "hot")}${chatBtn(C.id, "db", "driver", "Negocio")}</div>
          <button class="btn green big" data-dact="delivered" data-id="${esc(C.id)}" ${busy ? "disabled" : ""}>${C.collect > 0 ? `Entregué y cobré ${money(C.collect)}` : "Entregué el pedido"}</button></div>`;
    }
    const list = (S.avail || []).map(x => ({ ...x, away: me && x.pickup ? miles(me, x.pickup) * DLV.roadFactor : null })).sort((a, b) => (a.away ?? 99) - (b.away ?? 99));
    const avail = D.current ? "" : !D.online ? "" : `<div class="kcard"><h4>Entregas disponibles</h4>${!list.length ? `<div class="empty">Por ahora no hay entregas. Te avisamos con un sonido cuando llegue una.</div>`
      : list.map(x => `<div class="dav"><div style="min-width:0"><b>${esc(x.rname)}</b><span>${x.away != null ? `Recoger a ${fmtMi(x.away)}` : "Recoger"} · entregar ${x.miles ? x.miles.toFixed(1) + " mi" : ""}${x.drop && x.drop.area ? " · " + esc(x.drop.area) : ""}</span><span>${kitchenTxt(x.kitchen)} · ${x.items || ""} producto(s)${x.tip ? ` · incluye ${money(x.tip)} de propina` : ""}</span>${x.collect > 0 ? `<span class="dcash-s">💵 Cobras ${money(x.collect)} en efectivo</span>` : ""}</div>
          <div class="dav-r"><b class="mono">${money(x.driverPay)}</b><button class="btn green sm" data-dact="accept" data-id="${esc(x.id)}" ${busy ? "disabled" : ""}>Aceptar</button></div></div>`).join("")}</div>`;
    const mine = S.myDlv || [], t0 = todayStart(), wk = t0 - 6 * 86400000;
    const done = mine.filter(x => x.status === "delivered"), today = done.filter(x => (x.deliveredAt || 0) >= t0), week = done.filter(x => (x.deliveredAt || 0) >= wk);
    const sum = a => a.reduce((n, x) => n + (Number(x.driverPay) || 0), 0), pend = done.filter(x => x.payout === "pending" || x.payout === "manual");
    const led = done.filter(x => x.payout === "ledger"), owe = r2(led.reduce((n, x) => n + num(x.settle && x.settle.drv), 0));
    const earn = `<div class="kcard"><h4>Tus ganancias</h4><div class="tiles three"><div class="tile t-green"><b class="mono">${money(sum(today))}</b><small>Hoy · ${today.length} entrega${today.length === 1 ? "" : "s"}</small></div><div class="tile t-blue"><b class="mono">${money(sum(week))}</b><small>Últimos 7 días</small></div><div class="tile t-purple"><b class="mono">${money(sum(pend))}</b><small>Pago en proceso</small></div></div>
      ${done.length ? `<div class="dhist">${done.sort((a, b) => (b.deliveredAt || 0) - (a.deliveredAt || 0)).slice(0, 8).map(x => `<div><span>${esc(x.rname)} · #${esc(x.num)} · ${ago(x.deliveredAt || 0)}</span><b class="mono">${money(x.driverPay)}</b><em>${x.payout === "paid" || x.payout === "paid_manual" || x.payout === "settled" ? "Pagado" : x.payout === "manual" ? "Por cobrar" : x.payout === "ledger" ? (x.collect > 0 ? `Cobraste ${money(x.collect)}` : "En saldo") : "En proceso"}</em></div>`).join("")}</div>` : `<p class="hint">Aquí verás lo que ganas por cada entrega. Los pagos llegan a tu banco con Stripe; puedes retirar al instante desde Stripe Express.</p>`}</div>`;
    const bal = led.length ? `<div class="kcard dbal ${owe > 0 ? "owe" : ""}"><h4>Efectivo y saldo</h4><p>${owe > 0 ? `De lo que cobraste en efectivo, ya te quedaste con lo tuyo. Le debes a OnRoute <b class="mono">${money(owe)}</b> (la comida y la parte de OnRoute). Mándalo por Zelle o Cash App cuando el administrador te lo pida.`
      : owe < 0 ? `OnRoute te debe <b class="mono">${money(-owe)}</b> de entregas pagadas por Zelle o Cash App. Te llega con tu pago de la semana.` : "Estás a mano con OnRoute."}</p><p class="hint">${led.length} entrega${led.length === 1 ? "" : "s"} pagada${led.length === 1 ? "" : "s"} a mano sin liquidar.</p></div>` : "";
    const online = `<div class="kcard donline ${D.online ? "on" : ""}"><div><b>${D.online ? "Estás en línea" : "Estás desconectado"}</b><span>${D.online ? "Recibes avisos de entregas cerca de ti. Mantén la app abierta." : "Conéctate cuando quieras repartir."}</span>${S.drvGpsErr ? `<span class="err">${esc(S.drvGpsErr)}</span>` : ""}</div>
      <input type="checkbox" class="tgl" id="drvOnline" aria-label="En línea" ${D.online ? "checked" : ""} ${D.current ? "disabled" : ""}></div>`;
    return `${online}${cur}${avail}${earn}${bal}`;
  }
  function drvSummaryHTML(D) {
    const V = D.vehicle || {}, days = licDays(D.licenseExpires);
    return `<h4>Tus datos</h4><dl class="dsum"><dt>Nombre</dt><dd>${esc(D.name)}</dd><dt>Teléfono</dt><dd>${esc(D.phone)}</dd>
      <dt>Auto</dt><dd>${esc([V.make, V.model, V.year].filter(Boolean).join(" "))} · ${esc(V.color || "")} · <span class="mono">${esc(V.plate || "")}</span></dd>
      <dt>Licencia</dt><dd>Vence ${esc(D.licenseExpires || "")}${days < 0 ? ` · <b class="bad-t">vencida</b>` : ""}</dd></dl>`;
  }
  // ---------------------------------------------------------------- mensajes del pedido (chat)
  // Canales: cb = cliente↔negocio, db = repartidor↔negocio, dc = repartidor↔cliente (después de recoger).
  const CHAT_WITH = { cb: { customer: "el negocio", business: "el cliente" }, db: { business: "el repartidor", driver: "el negocio" }, dc: { customer: "el repartidor", driver: "el cliente" } };
  const CHAT_TAB = { cb: { customer: "Negocio", business: "Cliente" }, db: { business: "Repartidor", driver: "Negocio" }, dc: { customer: "Repartidor", driver: "Cliente" } };
  const QUICK = {
    customer: { cb: ["¿Cuánto falta?", "Ya voy en camino", "¡Gracias!"], dc: ["¿Cuánto falta?", "Estoy afuera", "Déjalo en la puerta, por favor"] },
    business: { cb: ["Tu pedido ya está listo", "Tardamos unos 10 minutos más", "Se nos acabó un producto, ¿te lo cambiamos?"], db: ["Ya está listo, pasa por él", "Faltan 5 minutos", "Te lo damos en la ventanilla"] },
    driver: { db: ["Voy en camino", "Ya llegué", "¿Ya está listo?"], dc: ["Voy en camino con tu pedido", "Ya llegué", "Estoy afuera"] },
  };
  const chatSubs = {}, chatData = {}, chatLoaded = {}, chatErr = {};
  const ckey = (oid, ch) => `${oid}:${ch}`;
  const seenK = (oid, ch, role) => `onroute-seen-${role}-${oid}-${ch}`;
  function chatWatch(rid, oid, chs, role) {
    chs.forEach(ch => {
      const k = ckey(oid, ch); if (chatSubs[k]) return;
      chatSubs[k] = db.collection(`restaurants/${rid}/orders/${oid}/msgs`).where("ch", "==", ch).onSnapshot(sn => {
        const before = (chatData[k] || []).length;
        chatData[k] = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.at || 0) - (b.at || 0));
        const last = chatData[k][chatData[k].length - 1];
        if (chatLoaded[k] && chatData[k].length > before && last && last.from !== role) {
          const viewing = S.chat && S.chat.oid === oid && S.chat.ch === ch && !document.hidden;
          if (viewing) ls.set(seenK(oid, ch, role), last.at || Date.now());
          else { chime(); try { navigator.vibrate && navigator.vibrate(150); } catch (e) {} toast(`💬 ${last.name || CHAT_TAB[ch][role]}: ${String(last.text).slice(0, 60)} · toca para responder`); S.toastChat = { oid, ch }; }
        }
        chatLoaded[k] = true; delete chatErr[k]; chatRepaint();
      }, e => { console.warn("OnRoute: mensajes", e); chatLoaded[k] = true; chatErr[k] = (e && e.code) || "error"; delete chatSubs[k]; chatRepaint(); });
    });
  }
  function chatUnwatch(keep) { Object.keys(chatSubs).forEach(k => { if (!keep.has(k.split(":")[0])) { try { chatSubs[k](); } catch (e) {} delete chatSubs[k]; delete chatData[k]; delete chatLoaded[k]; } }); }
  const unread = (oid, ch, role) => { const seen = Number(ls.get(seenK(oid, ch, role), 0)) || 0; return (chatData[ckey(oid, ch)] || []).filter(m => m.from !== role && (m.at || 0) > seen).length; };
  const unreadAll = (oid, chs, role) => chs.reduce((n, ch) => n + unread(oid, ch, role), 0);
  const badge = n => n ? `<i class="cbadge">${n}</i>` : "";
  function chatBtn(oid, ch, role, label, extra = "") { return `<button class="btn sec chat-btn ${extra}" data-chat="${esc(oid)}" data-ch="${ch}">💬 ${esc(label)}${badge(unread(oid, ch, role))}</button>`; }
  function openChat(o) {
    if (!unread(o.oid, o.ch, o.role)) { const alt = o.chs.find(ch => unread(o.oid, ch, o.role)); if (alt) o.ch = alt; }
    o.chs.forEach(ch => { if (chatErr[ckey(o.oid, ch)]) { delete chatErr[ckey(o.oid, ch)]; chatWatch(o.rid, o.oid, [ch], o.role); } });
    S.chat = o; S.chatDraft = ""; markSeen(); renderChat(); setTimeout(() => { const i = $("#chatIn"); if (i && matchMedia("(pointer:fine)").matches) i.focus(); const l = $("#chatList"); if (l) l.scrollTop = l.scrollHeight; }, 30); }
  function markSeen() { const c = S.chat; if (!c) return; const m = chatData[ckey(c.oid, c.ch)] || []; ls.set(seenK(c.oid, c.ch, c.role), m.length ? m[m.length - 1].at || Date.now() : Date.now()); }
  function chatRepaint() {
    if (S.chat) { markSeen(); renderChat(); }
    const n = S.route.name;
    if (n === "rest") paint(renderRest); else if (n === "driver") paint(renderDriver); else if (n === "panel" && S.ktab === "orders") paint(renderOrders);
  }
  function renderChat() {
    let el = $("#chatSheet");
    if (!S.chat) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "chatSheet"; el.className = "chat-sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
    const c = S.chat;
    // Los canales se recalculan en vivo (por ejemplo, el chat con el repartidor aparece en cuanto recoge el pedido).
    if (c.role === "customer" && S.mine && S.mine.id === c.oid) { const ds = S.mine.delivery && S.mine.delivery.status; c.chs = ds === "assigned" || ds === "picked" || (chatData[ckey(c.oid, "dc")] || []).length ? ["dc", "cb"] : ["cb"]; }
    if (c.role === "driver" && S.cur && S.cur.id === c.oid) c.chs = S.cur.status === "picked" ? ["dc", "db"] : ["db", "dc"];
    if (c.role === "business") { const o = S.orders.find(x => x.id === c.oid); if (o) c.chs = o.delivery && o.delivery.driverName ? ["cb", "db"] : ["cb"]; }
    if (!c.chs.includes(c.ch)) c.ch = c.chs[0];
    const msgs = chatData[ckey(c.oid, c.ch)] || [], dark = c.role !== "customer", err = chatErr[ckey(c.oid, c.ch)];
    el.classList.toggle("dark", dark);
    const fmtT = t => new Date(t || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const list = err ? `<p class="err cempty">No se pudieron cargar los mensajes (${esc(err)}). Cierra y vuelve a abrir el chat, o recarga la página.</p>` : msgs.length ? msgs.map(m => `<div class="cmsg ${m.from === c.role ? "me" : ""}"><span>${esc(m.text)}</span><small>${m.from === c.role ? "Tú" : esc(m.name || CHAT_TAB[c.ch][c.role])} · ${fmtT(m.at)}</small></div>`).join("")
      : `<p class="hint cempty">Escríbele a ${CHAT_WITH[c.ch][c.role]}. Los mensajes llegan al instante.</p>`;
    const keepDraft = ($("#chatIn") || {}).value ?? S.chatDraft ?? "", hadFocus = document.activeElement && document.activeElement.id === "chatIn";
    el.innerHTML = `<div class="chat-box">
      <div class="chat-h"><div><b>${esc(c.title || "Mensajes")}</b><small>Pedido #${esc(c.num || "")}</small></div><button class="chat-x" data-act="chatclose" aria-label="Cerrar">✕</button></div>
      ${c.chs.length > 1 ? `<div class="chat-tabs">${c.chs.map(ch => `<button data-chtab="${ch}" aria-pressed="${ch === c.ch}">${CHAT_TAB[ch][c.role]}${ch === c.ch ? "" : badge(unread(c.oid, ch, c.role))}</button>`).join("")}</div>` : ""}
      <div class="chat-list" id="chatList">${list}</div>
      <div class="chat-quick">${(QUICK[c.role][c.ch] || []).map(q => `<button data-quick="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <form class="chat-in" data-chatform="1"><input id="chatIn" maxlength="500" autocomplete="off" placeholder="Escribe un mensaje…" value="${esc(keepDraft)}"><button class="btn" type="submit">Enviar</button></form>
    </div>`;
    const l = $("#chatList"); if (l) l.scrollTop = l.scrollHeight;
    if (hadFocus) { const i = $("#chatIn"); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } }
  }
  async function chatSend(text) {
    const c = S.chat; text = String(text || "").trim().slice(0, 500); if (!c || !text) return;
    const name = c.role === "business" ? (S.my ? S.my.name : "Negocio") : c.role === "driver" ? String((S.drv && S.drv.name) || "Repartidor").split(" ")[0] : String((S.mine && S.mine.who) || S.name || "Cliente");
    S.chatDraft = ""; const i = $("#chatIn"); if (i) i.value = "";
    try { await db.collection(`restaurants/${c.rid}/orders/${c.oid}/msgs`).doc().set({ ch: c.ch, from: c.role, name: name.slice(0, 40), text, at: Date.now() }); }
    catch (e) { console.error("OnRoute: enviar mensaje", e); toast(e && e.code === "permission-denied" ? "Ya no se pueden mandar mensajes en este pedido." : "No se pudo enviar. Revisa tu conexión."); if (i) i.value = text; }
  }
  function renderWelcome() {
    const v = $("#vWelcome");
    const role = roleOf(), mine = role === "business" ? "negocio" : role === "driver" ? "repartidor" : role === "customer" ? "cliente" : "";
    const key = [S.user ? S.user.uid : "", mine, S.mode, S.my ? S.my.name : ""].join("|");
    if (v.dataset.built === key) return;
    v.dataset.built = key;
    const tag = m => mine === m ? `<i class="wl-tag">Tu cuenta</i>` : !mine && S.mode === m ? `<i class="wl-tag">Última vez</i>` : "";
    v.innerHTML = `<div class="welcome scroll"><div class="wl-in">
      <h1>¿Cómo quieres usar OnRoute?</h1>
      <p class="wl-sub">${S.user ? `Hola${S.profile && S.profile.name ? ", " + esc(S.profile.name.split(" ")[0]) : ""}. Elige a dónde quieres entrar.` : "Elige una opción para entrar."}</p>
      <div class="wl-cards">
        <button class="wl-card eat" data-pick="cliente">${tag("cliente")}<span class="wl-ic">${I.food}</span><b>Quiero pedir comida</b>
          <span>Encuentra food trucks y restaurantes cerca de ti y pide directo, sin filas y sin comisiones de apps de delivery.</span><em>Ver negocios cerca →</em></button>
        <button class="wl-card biz" data-pick="negocio">${tag("negocio")}<span class="wl-ic">${I.store}</span><b>${S.my ? esc(S.my.name) : "Tengo un negocio"}</b>
          <span>Recibe pedidos en tu cocina, maneja tu menú, tus promociones y tus ventas. Para food trucks y restaurantes.</span><em>${S.my ? "Ir a mis pedidos →" : "Entrar a mi negocio →"}</em></button>
        <button class="wl-card drv" data-pick="repartidor">${tag("repartidor")}<span class="wl-ic">${I.car}</span><b>Quiero repartir</b>
          <span>Gana dinero entregando pedidos con tu propio auto, en tus horarios. Solo necesitas tu licencia vigente.</span><em>${S.drv ? "Ir a mi panel de repartidor →" : "Registrarme como repartidor →"}</em></button>
      </div>
      <nav class="wl-links" aria-label="Ayuda">${[["como-funciona", "Cómo funciona"], ["faq", "Preguntas frecuentes"], ["tarifas", "Tarifas"], ["seguridad", "Seguridad"], ["contacto", "Contacto"]].map(([k, l]) => `<a href="./#ayuda/${k}" data-help="${k}">${l}</a>`).join("")}</nav>
      <p class="hint wl-foot">Para regresar a esta pantalla toca el logo de OnRoute o abre el menú ☰. Al usar OnRoute aceptas los <a href="./#ayuda/terminos" data-help="terminos">Términos</a> y la <a href="./#ayuda/privacidad" data-help="privacidad">Política de privacidad</a>.</p>
    </div></div>`;
  }
  function renderNav() {
    const role = roleOf(), n = S.route.name, biz = S.mode === "negocio", drv = S.mode === "repartidor";
    const nav = $("#topNav"); if (!nav) return;
    document.body.dataset.umode = S.mode || "";
    const logo = $(".top .logo"); if (logo) { logo.dataset.nav = "welcome"; logo.setAttribute("href", "./"); logo.title = "Inicio: elegir cómo usar OnRoute"; }
    const tag = $("#modeTag"); if (tag) { tag.hidden = n === "welcome" || (!biz && !drv); tag.textContent = drv ? "Repartidores" : "Negocios"; }
    const items = [];
    if (n === "welcome") items.length = 0;
    else if (biz) {
      // Modo negocio: nada de "Explorar"; solo su panel (y regresar a él si está viendo su página como cliente).
      if (n !== "panel" && n !== "admin") items.push(["panel", "← Mi negocio", "./#panel", "cta"]);
    } else if (drv) {
      if (n !== "driver" && n !== "admin") items.push(["driver", "← Repartir", "./#repartir", "cta"]);
    } else {
      items.push(["home", "Explorar", "./#explorar"]);
      if (!S.user) items.push(["account", "Entrar", "./#cuenta", "cta"]);
      else items.push(["account", role === "business" ? "Mi cuenta" : "Mis pedidos", "./#cuenta", "cta"]);
    }
    if (S.isAdmin && n !== "welcome") items.push(["admin", "Admin", "./#admin"]);
    nav.innerHTML = items.map(([k, l, h, c]) => `<a class="tbtn ${c || ""}" href="${h}" data-nav="${k}" aria-current="${n === k ? "page" : "false"}">${l}</a>`).join("");
  }
  function watchMine2(rid) {
    [ordUnsub, myMenuUnsub].forEach(f => { try { f && f(); } catch (e) {} });
    S.orders = []; S.ordersReady = false; S.myMenu = []; S.myMenuReady = false; S.meDraft = null; S.meDirty = false;
    ordUnsub = db.collection(`restaurants/${rid}/orders`).orderBy("createdAt", "desc").limit(600).onSnapshot(
      snap => { const before = new Set(S.orders.filter(o => o.status === "new" || o.status === "await").map(o => o.id)), arr = new Set(S.orders.filter(o => o.delivery && o.delivery.arrivedAt).map(o => o.id)); S.orders = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        if (S.ordersReady) { const a = S.orders.find(o => o.delivery && o.delivery.arrivedAt && o.delivery.status === "assigned" && !arr.has(o.id)); if (a) { beep(); setTimeout(beep, 300); toast(`📍 ${a.delivery.driverName || "El repartidor"} llegó por el pedido #${a.num}.`); } }
        if (S.ordersReady && S.orders.some(o => (o.status === "new" || o.status === "await") && !before.has(o.id))) beep(); S.ordersReady = true; paint(renderPanel); },
      err => { console.error("OnRoute: pedidos", err); S.ordersReady = true; paint(renderPanel); }
    );
    myMenuUnsub = db.doc(`restaurants/${rid}/menu/main`).onSnapshot(s => { const d = s.exists ? s.data() : {}; S.myMenu = normMenu(d.items); S.myExtras = normExtras(d.extras); S.myMenuReady = true; if (!S.meDirty) { S.meDraft = null; } paint(renderPanel); }, () => { S.myMenuReady = true; paint(renderPanel); });
  }
  function watchAll() {
    if (allUnsub) return;
    allUnsub = db.collection("restaurants").onSnapshot(snap => { S.all = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.allReady = true; afterAuth(); }, () => { S.allReady = true; afterAuth(); });
  }
  function watchUsers() {
    if (usersUnsub) return;
    usersUnsub = db.collection("users").limit(1000).onSnapshot(snap => { S.users = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.usersReady = true; if (S.route.name === "admin") paint(renderAdmin); }, () => { S.usersReady = true; });
  }
  let actx = null;
  // ---------------------------------------------------------------- aviso de "pedido listo" al cliente
  // Funciona mientras la página del pedido siga abierta (también en otra pestaña o con la app minimizada,
  // según el celular). Suena, vibra, cambia el título de la pestaña y, si dio permiso, manda una notificación.
  const canNotify = () => "Notification" in window && "serviceWorker" in navigator && window.isSecureContext;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) {} }
  function chime() {
    try {
      unlockAudio(); const t0 = actx.currentTime;
      [[0, 784], [0.18, 988], [0.36, 1319], [0.9, 784], [1.08, 988], [1.26, 1319]].forEach(([t, f]) => {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + t); g.gain.exponentialRampToValueAtTime(0.25, t0 + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.32);
        o.connect(g); g.connect(actx.destination); o.start(t0 + t); o.stop(t0 + t + 0.34);
      });
    } catch (e) {}
  }
  let titleTimer = null; const baseTitle = document.title;
  function flashTitle(on) {
    clearInterval(titleTimer); document.title = baseTitle;
    if (!on) return;
    let k = 0; titleTimer = setInterval(() => { document.title = k++ % 2 ? baseTitle : "🔔 ¡Tu pedido está listo!"; }, 1000);
    const stop = () => { if (!document.hidden) { flashTitle(false); document.removeEventListener("visibilitychange", stop); window.removeEventListener("focus", stop); } };
    document.addEventListener("visibilitychange", stop); window.addEventListener("focus", stop);
  }
  async function readyAlert(o, title, body) {
    chime();
    try { navigator.vibrate && navigator.vibrate([300, 150, 300, 150, 700]); } catch (e) {}
    if (document.hidden) flashTitle(true);
    toast(body || `¡Tu pedido #${o.num} está listo! Pasa a recogerlo.`);
    if (canNotify() && Notification.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title || "¡Tu pedido está listo! 🌮", {
          body: body || `Pedido #${o.num} en ${S.R ? S.R.name : "el negocio"}. Pasa a recogerlo con tu número.`,
          icon: "icon-192.png", badge: "icon-192.png", tag: `onroute-ready-${o.id}`, renotify: true, requireInteraction: true,
          vibrate: [300, 150, 300, 150, 700], data: { url: `${BASE}?r=${S.rid}` },
        });
      } catch (e) { console.warn("OnRoute: notificación", e); }
    }
  }
  async function askNotify() {
    unlockAudio();
    S.notifAsked = true;
    if (canNotify() && Notification.permission === "default") { try { await Notification.requestPermission(); } catch (e) {} }
    ls.set("onroute-notif", 1);
    paint(renderRest);
  }
  function notifyHTML(o) {
    if (!o || o.status === "ready" || o.status === "done") return "";
    const perm = canNotify() ? Notification.permission : "na";
    if (perm === "granted") return `<div class="notif on">🔔<span><b>Te avisamos cuando esté listo.</b> Deja esta página abierta; puedes cambiar de app.</span></div>`;
    if (isIOS && !isStandalone() && !("Notification" in window)) return `<div class="notif">🔔<span><b>Te avisamos con un sonido</b> cuando esté listo si dejas esta página abierta. Para recibir notificaciones en iPhone, agrega OnRoute a tu pantalla de inicio (Compartir → Agregar a inicio).</span></div>`;
    if (perm === "denied") return `<div class="notif">🔔<span><b>Te avisamos con un sonido</b> cuando esté listo si dejas esta página abierta. (Las notificaciones están bloqueadas en este navegador.)</span></div>`;
    if (S.notifAsked && perm === "na") return `<div class="notif on">🔔<span><b>Listo, sonará cuando tu pedido esté listo.</b> Deja esta página abierta.</span></div>`;
    return `<div class="notif ask">🔔<span><b>¿Te avisamos cuando esté listo?</b> Suena y te llega una notificación aunque cambies de app.</span><button class="btn sm" data-act="notify">Avísame</button></div>`;
  }
  function beep() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.18); } catch (e) {} }

  const UA = navigator.userAgent || "";
  const inApp = /FBAN|FBAV|FB_IAB|Messenger/i.test(UA) ? "Facebook/Messenger" : /Instagram/i.test(UA) ? "Instagram" : /; wv\)/.test(UA) ? "una app" : "";
  const AUTH_ERR = { "auth/invalid-credential": "Correo o contraseña incorrectos.", "auth/wrong-password": "Correo o contraseña incorrectos.", "auth/user-not-found": "No hay una cuenta con ese correo. Usa Crear cuenta.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Usa Entrar.", "auth/weak-password": "La contraseña necesita al menos 6 caracteres.", "auth/invalid-email": "Ese correo no es válido.",
    "auth/missing-password": "Escribe la contraseña.", "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.", "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes e intenta otra vez.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase.", "auth/too-many-requests": "Demasiados intentos. Espera un momento.", "auth/network-request-failed": "Sin conexión. Revisa tu internet." };
  const repaintAuth = () => { if (S.route.name === "account") paint(renderAccount); else if (S.route.name === "driver") paint(renderDriver); else paint(renderPanel); };
  async function authAction(kind) {
    S.authMsg = "";
    const email = (($("#authEmail") || {}).value || "").trim(), pass = ($("#authPass") || {}).value || "";
    S.authName = (($("#authName") || {}).value || S.authName || "").trim();
    if (!S.authRole) S.authRole = S.route.name === "panel" ? "business" : S.route.name === "driver" ? "driver" : "customer";
    try {
      if (kind === "login" || kind === "signup" || kind === "google") S.loginIntent = S.route.name;
      if (kind === "login") await auth.signInWithEmailAndPassword(email, pass);
      else if (kind === "signup") {
        if (!S.authName) { S.loginIntent = null; S.authMsg = "Escribe tu nombre."; repaintAuth(); const n = $("#authName"); if (n) n.focus(); return; }
        await auth.createUserWithEmailAndPassword(email, pass);
      }
      else if (kind === "google") await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      else if (kind === "reset") { if (!email) throw { code: "auth/invalid-email" }; await auth.sendPasswordResetEmail(email); S.authMsg = "Te enviamos un correo para cambiar tu contraseña."; repaintAuth(); }
      else if (kind === "logout") { S.loginIntent = null; await auth.signOut(); if (S.route.name === "admin") go("home"); }
    } catch (e) { S.loginIntent = null; S.authMsg = AUTH_ERR[e && e.code] || "No se pudo completar. Intenta otra vez."; repaintAuth(); }
  }

  function renderPanel() {
    const v = $("#vPanel");
    let head = `<div class="p-head"><h2>${S.my ? esc(S.my.name) : "Mi negocio"}</h2>${S.my ? statusChip(S.my.status) : ""}<span class="grow"></span>
      ${S.my ? `<a class="btn sec sm" href="./?r=${esc(S.my.id)}" data-rest="${esc(S.my.id)}">Ver mi página</a>` : ""}</div>`;
    if (!S.authReady || (S.user && (!S.myReady || !S.profileReady))) { v.dataset.built = ""; v.innerHTML = `<div class="panel">${head}<div class="empty-box">Cargando…</div></div>`; return; }
    if (!S.user) { S.authRole = "business"; v.dataset.built = ""; v.innerHTML = `<div class="panel">${head}<div class="p-auth scroll">${authHTML()}</div></div>`; return; }
    if (!S.my) { v.dataset.built = ""; v.innerHTML = `<div class="panel">${head}<div class="p-auth scroll">${regHTML()}</div></div>`; return; }
    const tabs = [["orders", "Pedidos", I.orders], ["menu", "Menú", I.menu], ["promo", "Promos", I.tag], ["rep", "Reportes", I.rep], ["prof", "Perfil", I.prof]];
    if (stripeBack && !S.stripeChecked) { S.stripeChecked = true; S.ktab = "prof"; S.stripeMsg = stripeBack === "back" ? "Revisando tu cuenta de Stripe…" : "El enlace de Stripe caducó (duran unos minutos). Toca Continuar en Stripe para abrir uno nuevo."; if (stripeBack === "back") stripeStatus(); }
    if (!tabs.some(t => t[0] === S.ktab)) S.ktab = "orders";
    const key = S.my.id + "|" + tabs.length;
    if (v.dataset.built !== key) {
      v.dataset.built = key; pfMap = null; pfMarker = null;
      v.innerHTML = `<div class="panel" id="panel"><div id="pHead"></div>
        <div class="pbody">
          <div class="kpanel scroll" id="pOrders"></div>
          <div class="kpanel scroll narrow" id="pMenu" hidden></div>
          <div class="kpanel scroll narrow" id="pPromo" hidden></div>
          <div class="kpanel scroll narrow" id="pRep" hidden></div>
          <div class="kpanel scroll narrow" id="pProf" hidden></div>
          <nav class="knav" id="kNav" role="tablist" aria-label="Secciones" style="--n:${tabs.length}">${tabs.map(t => `<button role="tab" data-ktab="${t[0]}">${t[2]}<span>${t[1]}</span>${t[0] === "orders" ? '<i class="badge" id="newBadge" hidden></i>' : ""}</button>`).join("")}</nav>
        </div></div>`;
    }
    $("#pHead").innerHTML = head;
    $$("#kNav button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.ktab === S.ktab)));
    const map = { orders: "#pOrders", menu: "#pMenu", promo: "#pPromo", rep: "#pRep", prof: "#pProf" };
    Object.entries(map).forEach(([k, sel]) => { const el = $(sel); if (el) el.hidden = k !== S.ktab; });
    const nNew = S.orders.filter(o => o.status === "new").length, nb = $("#newBadge");
    if (nb) { nb.hidden = !nNew; nb.textContent = nNew; }
    if (S.ktab === "orders") renderOrders();
    if (S.ktab === "menu") renderMenuEd();
    if (S.ktab === "promo") renderPromos();
    if (S.ktab === "rep") renderRep();
    if (S.ktab === "prof") renderProf();
  }
  function statusChip(s) { return s === "active" ? '<span class="chip open cdot">Publicado</span>' : s === "suspended" ? '<span class="chip closed cdot">Suspendido</span>' : '<span class="chip info cdot">En revisión</span>'; }
  function authFields() {
    return `<div class="field"><label for="authName">Tu nombre <span class="hint">(solo para crear cuenta)</span></label><input id="authName" autocomplete="name" maxlength="60" value="${esc(S.authName)}" placeholder="Ej. Ana López"></div>
      <div class="field"><label for="authEmail">Correo</label><input id="authEmail" type="email" autocomplete="email" placeholder="tu@correo.com"></div>
      <div class="field"><label for="authPass">Contraseña</label><input id="authPass" type="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres"></div>
      ${S.authMsg ? `<p class="${/correo para cambiar/.test(S.authMsg) ? "ok-msg" : "err"}" role="alert">${esc(S.authMsg)}</p>` : ""}
      <div class="btns"><button class="btn" data-auth="login">Entrar</button><button class="btn sec" data-auth="signup">Crear cuenta</button><button class="btn sec sm" data-auth="reset" style="margin-left:auto">Olvidé mi contraseña</button></div>
      <div class="or">o</div>
      ${inApp ? `<p class="err">Estás en el navegador de ${inApp}. Google no deja entrar desde aquí: abre OnRoute en Chrome o Safari, o usa correo y contraseña.</p>` : ""}
      <button class="btn google" data-auth="google" ${inApp ? "disabled" : ""}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>Continuar con Google</button>`;
  }
  function authHTML() {
    const biz = S.authRole === "business", drv = S.authRole === "driver";
    if (drv) return `<div class="auth">
      <div class="auth-kicker biz">${I.car}<span>OnRoute Repartidores</span></div>
      <h3>Reparte con OnRoute</h3>
      <p>Usa tu auto para entregar pedidos de food trucks y restaurantes cerca de ti, cuando tú quieras. Crea tu cuenta o entra para registrarte.</p>
      ${authFields()}
      <p class="hint legal-note">Al crear tu cuenta aceptas los <a href="./#ayuda/terminos" data-help="terminos">Términos de uso</a>, los <a href="./#ayuda/terminos-repartidores" data-help="terminos-repartidores">Términos para repartidores</a> y la <a href="./#ayuda/privacidad" data-help="privacidad">Política de privacidad</a>. <a href="./#ayuda/repartidores" data-help="repartidores">Ver requisitos</a></p>
      <p class="auth-switch">¿Solo quieres pedir comida? <a href="./" data-pick="cliente">Entra como cliente</a></p>
    </div>`;
    return `<div class="auth">
      <div class="auth-kicker ${biz ? "biz" : ""}">${biz ? I.store : I.food}<span>${biz ? "OnRoute Negocios" : "OnRoute · Pedir comida"}</span></div>
      <h3>${biz ? "Entra a tu negocio" : "Tu cuenta OnRoute"}</h3>
      <p>${biz ? "Registra tu food truck o restaurante, sube tu menú con fotos y recibe pedidos directos, sin comisiones." : "Guarda tus pedidos, tus negocios favoritos y tus datos para pedir más rápido. También puedes pedir sin cuenta."}</p>
      ${authFields()}
      <p class="hint legal-note">Al crear tu cuenta aceptas los <a href="./#ayuda/terminos" data-help="terminos">Términos de uso</a> y la <a href="./#ayuda/privacidad" data-help="privacidad">Política de privacidad</a>.${biz ? ` <a href="./#ayuda/negocios" data-help="negocios">Guía para negocios</a>` : ""}</p>
      <p class="auth-switch">${biz ? `¿Solo quieres pedir comida? <a href="./" data-pick="cliente">Entra como cliente</a>` : `¿Tienes un food truck o restaurante? <a href="./#panel" data-pick="negocio">Entra a OnRoute Negocios</a>`}</p>
    </div>`;
  }
  function regHTML() {
    const r = S.reg, slug = slugify(r.name || "");
    return `<div class="auth">
      <h3>Registra tu negocio</h3>
      <p>Entraste como ${esc(S.user.email || "")}. Llena estos datos; después subes tu menú con fotos. Revisamos cada registro antes de publicarlo.</p>
      ${roleOf() === "customer" ? `<p class="hint">Tu cuenta es de cliente. Si registras un negocio, tu cuenta pasa a ser de negocio y sigues pudiendo pedir comida. <a href="./#cuenta" data-nav="account">Volver a mis pedidos</a></p>` : ""}
      <div class="field"><span class="flabel">¿Qué tipo de negocio es?</span><div class="kinds">
        <button data-regkind="truck" aria-pressed="${r.kind === "truck"}"><b>Food truck</b><span>Se mueve; comparte su ubicación por GPS</span></button>
        <button data-regkind="restaurant" aria-pressed="${r.kind === "restaurant"}"><b>Restaurante</b><span>Local con dirección fija</span></button></div></div>
      <div class="field"><label for="regName">Nombre del negocio</label><input id="regName" data-reg="name" maxlength="60" value="${esc(r.name || "")}" placeholder="Ej. Tacos El Güero"></div>
      <p class="slug">Tu enlace: ${esc(BASE)}?r=${esc(slug || "tu-negocio")}</p>
      <div class="field"><label for="regCuisine">Tipo de comida</label><input id="regCuisine" data-reg="cuisine" maxlength="60" value="${esc(r.cuisine || "")}" placeholder="Ej. Tacos, tortas, BBQ"></div>
      <div class="field"><label for="regPhone">Teléfono (opcional)</label><input id="regPhone" data-reg="phone" maxlength="30" value="${esc(r.phone || "")}" placeholder="210-555-0123" inputmode="tel"></div>
      ${r.kind === "restaurant" ? `<div class="field"><label for="regAddr">Dirección</label><input id="regAddr" data-reg="address" maxlength="120" value="${esc(r.address || "")}" placeholder="Calle, número, ciudad"></div>` : ""}
      ${S.regMsg ? `<p class="err" role="alert">${esc(S.regMsg)}</p>` : ""}
      <div class="btns"><button class="btn green" data-act="register" ${S.regBusy ? "disabled" : ""}>${S.regBusy ? "Creando…" : "Crear mi negocio"}</button><button class="btn sec" data-auth="logout">Cerrar sesión</button></div>
    </div>`;
  }
  async function register() {
    const r = S.reg, name = String(r.name || "").trim();
    if (name.length < 2) { S.regMsg = "Escribe el nombre de tu negocio."; paint(renderPanel); return; }
    let base = slugify(name); if (base.length < 3) base = (base + "-food").slice(0, 40);
    S.regBusy = true; S.regMsg = ""; paint(renderPanel);
    const data = { name: name.slice(0, 60), kind: r.kind === "restaurant" ? "restaurant" : "truck", cuisine: String(r.cuisine || "").trim().slice(0, 60), description: "",
      phone: String(r.phone || "").trim().slice(0, 30), address: String(r.address || "").trim().slice(0, 120), paused: false, ownerUid: S.user.uid, status: "pending", createdAt: Date.now() };
    for (let i = 0; i < 6; i++) {
      const id = i ? `${base.slice(0, 36)}-${i + 1}` : base;
      try {
        await db.doc(`restaurants/${id}`).set(data); S.regBusy = false; S.ktab = "menu"; toast("¡Listo! Ahora sube tu menú.");
        if (S.profile && S.profile.role !== "business") db.doc(`users/${S.user.uid}`).update({ role: "business" }).catch(() => {});
        return;
      }
      catch (e) { if (e && e.code !== "permission-denied") { S.regBusy = false; S.regMsg = "No se pudo crear. Revisa tu conexión e intenta otra vez."; paint(renderPanel); return; } }
    }
    S.regBusy = false; S.regMsg = "Ese nombre ya está en uso. Prueba con otro."; paint(renderPanel);
  }

  // ---------- Pedidos
  function renderOrders() {
    const R = S.my, el = $("#pOrders");
    if (!el.dataset.built) {
      el.dataset.built = "1";
      el.innerHTML = `<div class="banner" id="pBanner" hidden></div>
        <div class="tiles">
          <div class="tile t-red"><span class="ti">${I.cash}</span><b class="mono" id="sSales">$0</b><small>Ventas hoy</small></div>
          <div class="tile t-purple"><span class="ti">${I.bag}</span><b class="mono" id="sOrders">0</b><small>Pedidos hoy</small></div>
          <div class="tile t-gold"><span class="ti">${I.pig}</span><b class="mono" id="sSaved">$0</b><small>Comisión ahorrada</small></div>
        </div>
        <div class="kcard" id="chartCard"><h4>Ventas de hoy por hora</h4><div id="chartBox"></div></div>
        <label class="prow" for="acceptT" id="pauseRow"><span class="prow-i">${I.power}</span><span class="prow-t">Recibiendo pedidos en línea<small id="acceptSub"></small></span><input type="checkbox" id="acceptT" class="tgl"></label>
        <button class="gpsbar" id="gpsBar" data-ktab="prof"></button>
        <div class="kcard alerts" id="stockAlerts"></div>
        <div class="board" id="board"></div>`;
      $("#acceptT").addEventListener("change", async e => {
        const paused = !e.target.checked;
        try { await db.doc(`restaurants/${S.my.id}`).update({ paused, updatedAt: Date.now() }); }
        catch (err) { e.target.checked = !paused; toast("No se pudo cambiar. Revisa la conexión."); }
      });
    }
    const ban = $("#pBanner");
    ban.hidden = R.status === "active";
    ban.className = "banner " + (R.status === "suspended" ? "warn" : "info");
    ban.innerHTML = R.status === "suspended" ? "Tu negocio está suspendido y no aparece en OnRoute. Escríbenos para reactivarlo."
      : `<span><b>Tu negocio está en revisión.</b> Mientras tanto prepara tu menú y tu perfil; aparecerás en OnRoute en cuanto lo aprobemos.</span>${S.isAdmin ? '<button class="btn sm green" data-adm="active" data-id="' + esc(R.id) + '">Aprobar ahora</button>' : ""}`;
    const today = S.orders.filter(o => o.createdAt >= todayStart() && !["pending", "cancelled", "await"].includes(o.status));
    const sales = today.reduce((a, o) => a + num(o.total), 0);
    $("#sSales").textContent = "$" + Math.round(sales);
    $("#sOrders").textContent = today.length;
    $("#sSaved").textContent = "$" + Math.round(sales * COMMISSION);
    const t = $("#acceptT"); if (document.activeElement !== t) t.checked = !R.paused;
    $("#acceptSub").textContent = R.paused ? "Pausado: los clientes ven el menú pero no pueden pedir" : !inHours(R) ? `Fuera de tu horario · ${nextOpen(R) || "cambia tu horario en Perfil"}` : R.kind === "truck" && !truckLive(R) ? "Activa tu GPS en Perfil para aparecer abierto" : "Los clientes pueden pedir ahora";
    const gb = $("#gpsBar"), live = truckLive(R);
    gb.classList.toggle("on", R.kind === "truck" ? live : typeof R.lat === "number");
    gb.innerHTML = I.pin + `<span>${R.kind === "truck" ? (live ? `GPS en vivo${R.loc.stop ? " · " + esc(R.loc.stop) : ""}` : "GPS apagado · tocar para compartir ubicación") : typeof R.lat === "number" ? `Ubicación fija${R.address ? " · " + esc(R.address) : ""}` : "Falta tu ubicación · tocar para ponerla"}</span>`;
    const sold = S.myMenu.filter(m => m.soldOut);
    $("#stockAlerts").innerHTML = `<h4>Inventario</h4>` + (!S.myMenu.length ? `<span class="okline">Todavía no tienes menú. <button class="btn sm sec" data-ktab="menu">Crear menú</button></span>`
      : sold.length ? sold.map(m => `<div class="al">${I.alert}<span>${esc(m.name)}: <b class="low">AGOTADO</b></span></div>`).join("") : `<span class="okline">Todo el menú está disponible.</span>`);
    renderChart(today);
    const cols = [["new", "Nuevos"], ["prep", "En preparación"], ["ready", "Listos"]], act = { new: "Empezar", prep: "Marcar listo", ready: "Entregado" };
    const waiting = S.orders.filter(o => o.status === "await").sort((a, b) => a.createdAt - b.createdAt);
    const active = S.orders.filter(o => ["new", "prep", "ready", "await"].includes(o.status));
    active.forEach(o => chatWatch(S.my.id, o.id, o.delivery ? ["cb", "db"] : ["cb"], "business"));
    if (!S.chat) chatUnwatch(new Set(active.map(o => o.id)));
    $("#board").classList.toggle("has-await", !!waiting.length);
    $("#board").innerHTML = (waiting.length ? `<div class="col await"><h3><span>Por confirmar</span><span class="mono">${waiting.length}</span></h3>${waiting.map(o => { const pre = (o.payParts || []).filter(p => p.m !== "cash"); return `<div class="order await">
        <div class="o-top"><b>#${esc(o.num)}</b><small>${ago(o.createdAt)}</small><button class="o-chat" data-chat="${esc(o.id)}" data-ch="cb" aria-label="Mensajes del pedido">💬${badge(unreadAll(o.id, ["cb"], "business"))}</button></div>
        <ul>${(o.items || []).map(it => `<li>${num(Number(it.qty))} × ${esc(it.name)}</li>`).join("")}</ul>
        ${o.note ? `<div class="onote"><b>Nota:</b> ${esc(o.note)}</div>` : ""}
        <div class="o-who">${esc(o.who)} · <span class="mono">${money(o.total)}</span>${o.delivery ? " · a domicilio" : ""}</div>
        <div class="onote pay"><b>Pago:</b> ${esc(payLine(o))}${pre.length ? `<br><small>Revisa en tu app de ${pre.map(p => PAYN[p.m]).join(" y ")} que te llegó ${money(pre.reduce((a, p) => a + num(p.amt), 0))} de ${esc(o.who)} (nota #${esc(o.num)}).</small>` : `<br><small>${o.delivery ? "El repartidor cobra en efectivo al entregar." : "Te paga en efectivo al recoger."}</small>`}</div>
        <div class="o-acts"><button class="o-btn" data-oact="confirm" data-id="${esc(o.id)}" ${S.oactBusy === o.id ? "disabled" : ""}>${pre.length ? "Pago recibido" : "Aceptar pedido"}</button><button class="o-btn sec" data-oact="reject" data-id="${esc(o.id)}" ${S.oactBusy === o.id ? "disabled" : ""}>Rechazar</button></div></div>`; }).join("")}</div>` : "") + cols.map(([k, l]) => { const list = active.filter(o => o.status === k).sort((a, b) => a.createdAt - b.createdAt); return `
      <div class="col"><h3><span>${l}</span><span class="mono">${list.length}</span></h3>
      ${list.length ? list.map(o => `<div class="order ${k}">
        <div class="o-top"><b>#${esc(o.num)}</b><small>${ago(o.createdAt)}</small><button class="o-chat" data-chat="${esc(o.id)}" data-ch="cb" aria-label="Mensajes del pedido">💬${badge(unreadAll(o.id, o.delivery && o.delivery.driverName ? ["cb", "db"] : ["cb"], "business"))}</button></div>
        <ul>${(o.items || []).map(it => `<li>${num(Number(it.qty))} × ${esc(it.name)}</li>`).join("")}</ul>
        ${o.note ? `<div class="onote"><b>Nota:</b> ${esc(o.note)}</div>` : ""}
        ${o.promo ? `<div class="onote promo"><b>Promo:</b> ${esc(o.promo.title || "")}${o.promo.code ? " · código " + esc(o.promo.code) : ""} · −${money(o.promo.off)}</div>` : ""}
        ${o.reward ? `<div class="onote prize"><b>Premio:</b> ${esc(o.reward)} · ${rewardCheck(o)}</div>` : ""}
        <div class="o-who">${esc(o.who)} · <span class="mono">${money(o.total)}</span>${o.pickup === "30" ? " · llega en 30 min" : ""}</div>
        ${o.delivery ? `<div class="onote dlv">${I.car} <b>A domicilio</b> · ${o.delivery.driverName ? `Repartidor: ${esc(o.delivery.driverName)}${o.delivery.driverCar ? " · " + esc(o.delivery.driverCar) : ""}${o.delivery.driverPlate ? " · " + esc(o.delivery.driverPlate) : ""}${o.delivery.status === "picked" ? " · ya lo recogió" : o.delivery.arrivedAt ? `</div><div class="onote arrived">📍 <b>¡${esc(o.delivery.driverName || "El repartidor")} ya llegó por el pedido!</b> · ${ago(o.delivery.arrivedAt)}` : " · en camino al negocio"}` : "Buscando repartidor…"}</div>` : ""}
        <span class="paychip ${o.paid || (o.paidOk && !cashOf(o)) ? "paid" : ""}">${o.paid ? "Pagado con tarjeta" : o.payParts ? (cashOf(o) ? `${cashOf(o) < o.total ? esc(payLine(o)) + " · " : ""}${o.delivery ? "el repartidor cobra" : "cobrar"} ${money(cashOf(o))} en efectivo` : `Pagado · ${esc(payLine(o))}`) : "Cobrar al entregar"}</span>${visitsOf(o) > 1 ? `<span class="paychip freq">Cliente frecuente · visita ${visitsOf(o)}</span>` : ""}
        ${o.delivery && k === "ready" ? `<button class="o-btn" disabled>Esperando al repartidor</button>` : `<button class="o-btn" data-adv="${esc(o.id)}">${act[k]}</button>`}</div>`).join("")
      : `<div class="empty">${k === "new" ? (S.ordersReady ? "Sin pedidos nuevos." : "Cargando…") : "Sin pedidos"}</div>`}</div>`; }).join("");
  }
  async function orderAct(oid, action) {
    const o = S.orders.find(x => x.id === oid); if (!o) return;
    if (action === "reject" && !confirm(`¿Rechazar el pedido #${o.num}? El cliente verá que no se confirmó.`)) return;
    if (action === "confirm" && (o.payParts || []).some(p => p.m !== "cash") && !confirm(`¿Ya te llegó el pago de #${o.num} (${payLine(o)})?`)) return;
    S.oactBusy = oid; paint(renderOrders);
    try { await payApi("orderAction", { rid: S.my.id, oid, action }); toast(action === "confirm" ? `Pedido #${o.num} confirmado: ya está en Nuevos.` : `Pedido #${o.num} rechazado.`); }
    catch (e) { toast(String(e.message || "No se pudo.").split(" Detalle:")[0]); }
    S.oactBusy = null; paint(renderOrders);
  }
  function renderChart(today) {
    const box = $("#chartBox"), by = {};
    today.forEach(o => { const h = new Date(o.createdAt).getHours(); by[h] = (by[h] || 0) + num(o.total); });
    const hrs = Object.keys(by).map(Number);
    if (!hrs.length) { box.innerHTML = `<div class="chart-empty">Aún no hay ventas hoy. Aquí verás lo vendido por hora.</div>`; return; }
    const end = new Date().getHours(), start = Math.max(Math.min(...hrs), end - 7), list = [];
    for (let h = start; h <= end; h++) list.push(h);
    const max = Math.max(...list.map(h => by[h] || 0), 1), lab = h => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
    box.innerHTML = `<div class="chart">${list.map(h => `<div class="bar ${h === end ? "now" : ""}"><i style="height:${Math.max(2, Math.round(((by[h] || 0) / max) * 100))}%">${by[h] ? `<span class="mono">$${Math.round(by[h])}</span>` : ""}</i></div>`).join("")}</div>
      <div class="xlab">${list.map(h => `<span>${lab(h)}</span>`).join("")}</div>`;
  }
  async function advance(id) {
    const o = S.orders.find(x => x.id === id); if (!o) return;
    const next = { new: "prep", prep: "ready", ready: "done" }[o.status]; if (!next) return;
    try { await db.doc(`restaurants/${S.my.id}/orders/${id}`).update({ status: next }); if (o.delivery) db.doc(`deliveries/${id}`).update({ kitchen: next }).catch(e => console.warn("OnRoute: cocina→entrega", e)); }
    catch (e) { console.error("OnRoute: mover pedido", e); toast("No se pudo actualizar el pedido. Revisa la conexión."); }
  }

  // ---------- Editor del menú (con fotos)
  const clone = x => JSON.parse(JSON.stringify(x));
  function meEnsure() {
    if (!S.meDraft) S.meDraft = clone(S.myMenu);
    if (!S.meExtras) S.meExtras = clone(S.myExtras || []);
    if (!S.meCfg) { const v = S.my.variant || {}; S.meCfg = { menuNote: S.my.menuNote || "", vLabel: v.label || "", vDisc: v.discount || "" }; }
  }
  function meTouch() { S.meDirty = true; S.meMsg = "Cambios sin guardar"; S.meMsgCls = "dirty"; meBar(); }
  function meBar() { const s = $("#meState"); if (!s) return; s.textContent = S.meMsg || (S.meDirty ? "Cambios sin guardar" : "Sin cambios"); s.className = S.meMsgCls || ""; $("[data-me=save]").disabled = !S.meDirty || S.meSaving; $("[data-me=discard]").disabled = !S.meDirty || S.meSaving; }
  function renderMenuEd() {
    const el = $("#pMenu");
    if (!S.myMenuReady) { el.innerHTML = `<div class="empty-box">Cargando menú…</div>`; return; }
    meEnsure();
    const D = S.meDraft, C = S.meCfg;
    const cats = [...new Set(D.map(m => m.cat).filter(Boolean).concat(["Platillos", "Bebidas", "Postres"]))];
    el.innerHTML = `<div class="ptitle"><h3>Menú</h3><p>Agrega tus platillos con foto, precio y opciones. Los clientes ven los cambios al tocar Guardar.</p></div>
      <div class="kcard ai-card"><div><h4>Llenar el menú con una foto</h4><p class="hint">Sube fotos de tu menú impreso, volante o pizarrón, o el PDF de tu menú (hasta 4 archivos), y OnRoute escribe los platillos y precios por ti. Después solo revisas y guardas.</p></div>
        <label class="btn green ${S.aiBusy ? "busy" : ""}" for="aiIn">${ic('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}<span>${S.aiBusy ? "Leyendo tu menú…" : "Subir foto o PDF del menú"}</span><input type="file" id="aiIn" accept="image/*,application/pdf,.pdf" multiple ${S.aiBusy ? "disabled" : ""}></label>
        ${S.aiMsg ? `<p class="${S.aiCls || "hint"}" role="status">${esc(S.aiMsg)}</p>` : ""}</div>
      <div class="kcard"><h4>Ajustes del menú</h4><div class="me-cfg">
        <input id="cfgNote" data-cfg="menuNote" maxlength="140" value="${esc(C.menuNote)}" placeholder="Nota (ej. Combo incluye refresco. Precios con impuesto incluido.)" aria-label="Nota del menú">
        <input id="cfgVL" data-cfg="vLabel" maxlength="30" value="${esc(C.vLabel)}" placeholder="Opción con descuento (ej. Sin combo)" aria-label="Opción con descuento">
        <input id="cfgVD" data-cfg="vDisc" type="number" min="0" max="50" step="0.5" value="${esc(C.vDisc)}" placeholder="Descuento $" aria-label="Descuento">
      </div><p class="hint" style="margin-top:8px">La opción con descuento es opcional: aparece como casilla en cada platillo (por ejemplo "Solo torta, −$1").</p></div>
      <div class="kcard"><h4>Extras con precio</h4>
        <p class="hint" style="margin-bottom:10px">El cliente los puede agregar a cualquier platillo (por ejemplo "Aguacate extra $1.00" o "Sin cebolla $0"). En cada platillo puedes desactivarlos.</p>
        <div class="xlist">${S.meExtras.map((e, k) => `<div class="xrow" data-x="${k}"><input id="xl-${k}" data-xf="label" maxlength="30" value="${esc(e.label)}" placeholder="Ej. Aguacate extra" aria-label="Extra">
          <span class="pr"><input id="xp-${k}" data-xf="price" type="number" inputmode="decimal" min="0" max="50" step="0.25" value="${esc(e.price)}" aria-label="Precio del extra"></span>
          <button class="me-x" data-me="delx" aria-label="Quitar extra">✕</button></div>`).join("") || `<p class="hint">Todavía no tienes extras.</p>`}</div>
        <button class="me-chip" data-me="addx" style="margin-top:10px" ${S.meExtras.length >= 20 ? "disabled" : ""}>+ Agregar extra</button></div>
      <div class="me-list">${D.length ? D.map((m, i) => meItemHTML(m, i)).join("") : `<div class="empty-cart"><h2>Tu menú está vacío</h2><p>Agrega tu primer platillo con el botón de abajo.</p></div>`}</div>
      <button class="me-add" data-me="additem">+ Agregar platillo</button>
      <div class="me-bar"><span id="meState"></span><div><button class="btn sec sm" data-me="discard">Descartar</button><button class="btn sm" data-me="save">Guardar cambios</button></div></div>
      <datalist id="catList">${cats.map(c => `<option value="${esc(c)}"></option>`).join("")}</datalist>`;
    meBar();
  }
  function meItemHTML(m, i) {
    const up = S.uploading[m.id];
    return `<div class="me-item ${m.soldOut ? "is-sold" : ""}" data-i="${i}">
      <div class="me-photo">
        <div class="ph ${m.photo ? "has" : ""}">${up ? "Subiendo…" : m.photo ? (photoSrc(S.my.id, m.photo) ? `<img src="${esc(photoSrc(S.my.id, m.photo))}" alt="">` : "Cargando…") : "Sin foto"}</div>
        <label for="mf-${esc(m.id)}">${m.photo ? "Cambiar foto" : "Subir foto"}<input type="file" id="mf-${esc(m.id)}" accept="image/*" data-photo="${i}"></label>
        ${m.photo ? `<button data-me="nophoto">Quitar foto</button>` : ""}
      </div>
      <div class="me-fields">
        <div class="me-row"><input id="me-name-${i}" data-f="name" value="${esc(m.name)}" maxlength="60" placeholder="Nombre del platillo" aria-label="Nombre">
          <input id="me-cat-${i}" data-f="cat" value="${esc(m.cat)}" list="catList" maxlength="30" placeholder="Categoría" aria-label="Categoría"></div>
        <textarea id="me-desc-${i}" data-f="desc" maxlength="200" placeholder="Descripción (ingredientes, tamaño)" aria-label="Descripción">${esc(m.desc)}</textarea>
        ${m.opts.map((o, j) => `<div class="me-opt"><span class="code">${String.fromCharCode(65 + j)}</span>
          <input id="me-ol-${i}-${j}" data-j="${j}" data-of="label" value="${esc(o.label)}" maxlength="30" placeholder="${m.opts.length > 1 ? "Opción (ej. Grande)" : "Opción (opcional)"}" aria-label="Opción">
          <input id="me-od-${i}-${j}" data-j="${j}" data-of="detail" value="${esc(o.detail)}" maxlength="40" placeholder="Detalle (opcional)" aria-label="Detalle">
          <span class="pr"><input id="me-op-${i}-${j}" class="${S.aiCheck && !(Number(o.price) > 0) ? "bad" : ""}" data-j="${j}" data-of="price" type="number" inputmode="decimal" min="0" max="500" step="0.25" value="${esc(o.price)}" aria-label="Precio"></span>
          <button class="me-x" data-me="delopt" data-j="${j}" aria-label="Quitar opción" ${m.opts.length < 2 ? "disabled" : ""}>✕</button></div>`).join("")}
        <div class="me-foot"><div class="l"><button class="me-chip" data-me="addopt" ${m.opts.length >= 6 ? "disabled" : ""}>+ Opción o tamaño</button>
          ${(S.meExtras || []).length ? `<button class="me-chip ${m.noExtras ? "on" : ""}" data-me="noextras">${m.noExtras ? "Sin extras · tocar para permitir" : "Permite extras"}</button>` : ""}
          <button class="me-chip ${m.soldOut ? "on" : ""}" data-me="sold">${m.soldOut ? "Agotado · tocar para reactivar" : "Marcar agotado"}</button>
          ${i > 0 ? '<button class="me-chip" data-me="up" aria-label="Subir">↑</button>' : ""}${i < S.meDraft.length - 1 ? '<button class="me-chip" data-me="down" aria-label="Bajar">↓</button>' : ""}</div>
          <button class="me-del" data-me="delitem">Eliminar platillo</button></div>
      </div></div>`;
  }
  async function meSave() {
    const D = S.meDraft, C = S.meCfg;
    let bad = null;
    D.forEach((m, i) => { if (!String(m.name).trim()) bad = bad || `#me-name-${i}`; m.opts.forEach((o, j) => { const p = Number(o.price); if (!(p > 0 && p < 500)) bad = bad || `#me-op-${i}-${j}`; if (m.opts.length > 1 && !String(o.label).trim()) bad = bad || `#me-ol-${i}-${j}`; }); });
    const vd = Number(C.vDisc);
    if (C.vLabel.trim() && !(vd > 0 && vd < 50)) bad = bad || "#cfgVD";
    (S.meExtras || []).forEach((e, k) => { if (!String(e.label).trim()) bad = bad || `#xl-${k}`; const p = Number(e.price); if (!(p >= 0 && p <= 50) || e.price === "") bad = bad || `#xp-${k}`; });
    if (bad) { const e = $(bad); if (e) { e.classList.add("bad"); e.scrollIntoView({ block: "center" }); e.focus(); } S.meMsg = "Revisa el campo marcado en rojo: falta el nombre, la opción o el precio no es válido."; S.meMsgCls = "err"; meBar(); return; }
    if (Object.keys(S.uploading).length) { S.meMsg = "Espera a que terminen de subir las fotos."; S.meMsgCls = "err"; meBar(); return; }
    const items = D.map(m => ({ id: m.id, cat: String(m.cat || "Platillos").trim().slice(0, 30) || "Platillos", name: m.name.trim().slice(0, 60), desc: String(m.desc || "").trim().slice(0, 200),
      photo: safePhoto(m.photo), soldOut: !!m.soldOut, noExtras: !!m.noExtras, opts: m.opts.map(o => ({ label: String(o.label || "").trim().slice(0, 30), detail: String(o.detail || "").trim().slice(0, 40), price: Math.round(Number(o.price) * 100) / 100 })) }));
    S.meSaving = true; S.meMsg = "Guardando…"; S.meMsgCls = ""; meBar();
    try {
      const extras = (S.meExtras || []).map(e => ({ id: e.id, label: String(e.label).trim().slice(0, 30), price: Math.round(Number(e.price) * 100) / 100 }));
      await db.doc(`restaurants/${S.my.id}/menu/main`).set({ items, extras, updatedAt: Date.now() });
      cleanPhotos(items);
      const variant = C.vLabel.trim() ? { label: C.vLabel.trim().slice(0, 30), discount: Math.round(vd * 100) / 100 } : null;
      await db.doc(`restaurants/${S.my.id}`).update({ menuNote: C.menuNote.trim().slice(0, 140), variant, updatedAt: Date.now() });
      S.meDirty = false; S.meSaving = false; S.meDraft = null; S.meCfg = null; S.meExtras = null; S.aiCheck = false; S.aiMsg = ""; S.meMsg = "Guardado. Los clientes ya ven el menú nuevo."; S.meMsgCls = "ok";
      paint(renderPanel);
    } catch (e) { console.error("OnRoute: guardar menú", e); S.meSaving = false; S.meMsg = "No se pudo guardar. Revisa la conexión e intenta otra vez."; S.meMsgCls = "err"; meBar(); }
  }

  // ---------- Menú desde una foto (Firebase AI Logic con Gemini)
  const AI_V = "12.19.0";
  // Modelos de Gemini en orden de preferencia; si Google retira uno (error 404), se usa el siguiente.
  const AI_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
  let aiMods = null; const aiModels = {};
  async function menuModel(name) {
    if (aiModels[name]) return aiModels[name];
    if (!aiMods) {
      const appm = await import(`https://www.gstatic.com/firebasejs/${AI_V}/firebase-app.js`);
      const aim = await import(`https://www.gstatic.com/firebasejs/${AI_V}/firebase-ai.js`);
    let app = appm.getApps().find(a => a.name === "onroute-ai");
    if (!app) {
      app = appm.initializeApp(window.FIREBASE_CONFIG, "onroute-ai");
      if (window.ONROUTE_APPCHECK_SITE_KEY) {
        try {
          const acm = await import(`https://www.gstatic.com/firebasejs/${AI_V}/firebase-app-check.js`);
          const P = window.ONROUTE_APPCHECK_ENTERPRISE ? acm.ReCaptchaEnterpriseProvider : acm.ReCaptchaV3Provider;
          acm.initializeAppCheck(app, { provider: new P(window.ONROUTE_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
        } catch (e) { console.warn("OnRoute: App Check (IA)", e); }
      }
    }
    aiMods = { aim, ai: aim.getAI(app, { backend: new aim.GoogleAIBackend() }) };
    }
    aiModels[name] = aiMods.aim.getGenerativeModel(aiMods.ai, { model: name, generationConfig: { responseMimeType: "application/json", temperature: 0.1 } });
    return aiModels[name];
  }
  let aiGood = null;
  async function readWithGemini(parts, limit) {
    const list = aiGood ? [aiGood] : AI_MODELS;
    let last = null;
    for (const name of list) {
      try {
        const model = await limit(menuModel(name), 20000);
        const res = await limit(model.generateContent(parts), 90000);
        aiGood = name;
        return res;
      } catch (e) {
        last = e;
        const m = String((e && e.message) || "");
        if (!/404|not found|no longer available|not supported/i.test(m)) throw e;
        console.warn("OnRoute: modelo no disponible, probando otro:", name);
      }
    }
    throw last;
  }
  const MENU_PROMPT = `Transcribe el menú de restaurante que aparece en las fotos o documentos PDF adjuntos. Responde SOLO con JSON, con esta forma exacta:
{"note":"","items":[{"name":"","category":"","description":"","options":[{"label":"","detail":"","price":0}]}]}
Reglas:
- name: nombre del platillo tal como aparece.
- category: la sección del menú donde está (por ejemplo Tacos, Tortas, Bebidas, Postres). Si no hay secciones, usa "Platillos".
- description: ingredientes o descripción corta si aparece; si no, vacío.
- options: si el platillo tiene tamaños, combos o variantes con precio distinto, una opción por cada una, con label (nombre de la variante), detail (información corta, por ejemplo "9 rebanadas") y price. Si tiene un solo precio, una sola opción con label vacío.
- price: número en dólares, sin el símbolo $. Si no se ve el precio, pon 0.
- note: una nota general del menú si existe (por ejemplo "Combos incluyen refresco" o "Precios con impuesto incluido"); si no, vacío.
- No inventes platillos ni precios. Respeta el idioma del menú.`;
  const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(b); });
  async function onMenuPhotos(input) {
    const files = Array.from(input.files || []).slice(0, 4); input.value = "";
    if (!files.length) return;
    meEnsure();
    S.aiBusy = true; S.aiMsg = `Leyendo ${files.length > 1 ? "tus " + files.length + " fotos" : "tu menú"}… puede tardar unos segundos.`; S.aiCls = ""; paint(renderMenuEd);
    try {
      const parts = [MENU_PROMPT];
      for (const f of files) {
        if (f.type === "application/pdf" || /\.pdf$/i.test(f.name || "")) {
          if (f.size > 12 * 1024 * 1024) throw new Error("pdfgrande");
          parts.push({ inlineData: { data: await blobToB64(f), mimeType: "application/pdf" } });
          continue;
        }
        if (f.type && !/^image\//.test(f.type)) throw new Error("tipoarchivo");
        let b; try { b = await resizeImage(f, 1600); } catch (e) { b = f; }
        parts.push({ inlineData: { data: await blobToB64(b), mimeType: b.type || "image/jpeg" } });
      }
      const limit = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
      const res = await readWithGemini(parts, limit);
      const txt = res.response.text();
      let j = null; try { j = JSON.parse(txt); } catch (e) { const mm = txt.match(/\{[\s\S]*\}/); if (mm) j = JSON.parse(mm[0]); }
      if (!j || !Array.isArray(j.items)) throw new Error("formato");
      const t = Date.now().toString(36);
      const add = j.items.filter(x => x && String(x.name || "").trim()).slice(0, 100 - S.meDraft.length).map((x, i) => {
        const opts = (Array.isArray(x.options) && x.options.length ? x.options : [{ label: "", detail: "", price: 0 }]).slice(0, 6)
          .map(o => { const p = Number(o && o.price); return { label: String((o && o.label) || "").slice(0, 30), detail: String((o && o.detail) || "").slice(0, 40), price: p > 0 ? Math.round(p * 100) / 100 : "" }; });
        return { id: `p${t}${i}`, cat: String(x.category || "Platillos").slice(0, 30), name: String(x.name).trim().slice(0, 60), desc: String(x.description || "").slice(0, 200), photo: "", soldOut: false, opts };
      });
      if (!add.length) throw new Error("vacio");
      S.meDraft.push(...add);
      if (j.note && !S.meCfg.menuNote) S.meCfg.menuNote = String(j.note).slice(0, 140);
      const sinPrecio = add.filter(m => m.opts.some(o => o.price === "")).length;
      S.aiCheck = true; meTouch();
      S.aiMsg = `Listo: agregamos ${add.length} platillo${add.length > 1 ? "s" : ""} al final de tu menú.${sinPrecio ? (sinPrecio > 1 ? ` ${sinPrecio} no tenían precio visible (marcados en rojo).` : " 1 no tenía precio visible (marcado en rojo).") : ""} Revisa nombres y precios, y toca Guardar cambios.`;
      S.aiCls = "ok-msg";
    } catch (e) {
      console.error("OnRoute: leer menú", e);
      const m = String((e && e.message) || "") + " " + String((e && e.code) || "");
      S.aiCls = "err";
      S.aiMsg = /pdfgrande/.test(m) ? "Ese PDF es muy pesado (más de 12 MB). Prueba con un PDF más ligero o con fotos de cada página."
        : /tipoarchivo/.test(m) ? "Ese archivo no es una foto ni un PDF."
        : /vacio/.test(m) ? "No encontramos platillos en la foto. Prueba con una foto más cerca, derecha y con buena luz."
        : /formato/.test(m) ? "No pudimos entender el menú de la foto. Intenta otra vez o con una foto más clara."
        : /no longer available|\b404\b/i.test(m) ? "Google cambió los modelos de Gemini disponibles. Avísale a InnovationTECH para actualizar OnRoute."
        : /api-not-enabled|not been used|disabled|PERMISSION_DENIED|403/i.test(m) ? "La lectura de menús todavía no está activada en Firebase. Activa Firebase AI Logic (Gemini Developer API) en la consola y vuelve a intentar."
        : /quota|429|RESOURCE_EXHAUSTED/i.test(m) ? "Se llegó al límite de lecturas por ahora. Espera un minuto e intenta otra vez."
        : /timeout/.test(m) ? "El lector de menús tardó demasiado en responder. Intenta otra vez; si se repite, prueba con una sola foto."
        : /Failed to fetch|import|network/i.test(m) ? "No se pudo conectar con el lector de menús. Revisa tu internet e intenta otra vez."
        : "No se pudo leer el menú. Intenta otra vez.";
      // Detalle técnico corto para poder diagnosticar desde el celular.
      const det = String((e && (e.customErrorData && JSON.stringify(e.customErrorData.errorDetails || e.customErrorData.status || "")) ) || (e && e.message) || e).replace(/\s+/g, " ").slice(0, 260);
      S.aiMsg += ` Detalle: ${det}`;
    }
    S.aiBusy = false; paint(renderMenuEd);
  }

  // ---------- Fotos
  async function resizeImage(file, max) {
    let src;
    try { src = await createImageBitmap(file); } catch (e) {
      src = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file); });
    }
    const w = src.width, h = src.height, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("imagen"))), "image/jpeg", 0.82));
  }
  async function uploadImage(file, prefix, max) {
    if (!storage) throw new Error("storage");
    if (!file || !/^image\//.test(file.type || "image/")) throw new Error("tipo");
    if (file.size > 25 * 1024 * 1024) throw new Error("grande");
    let blob, type = "image/jpeg", ext = "jpg";
    try { blob = await resizeImage(file, max); }
    catch (e) {
      // Algunos formatos (por ejemplo HEIC de iPhone en Chrome) no se pueden redimensionar aquí: se sube el original si es chico.
      if (file.size > 3 * 1024 * 1024) throw new Error("imagen");
      blob = file; type = file.type || "image/jpeg"; ext = (type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "");
    }
    const ref = storage.ref(`restaurants/${S.my.id}/${prefix}-${Date.now()}.${ext}`);
    await ref.put(blob, { contentType: type, cacheControl: "public,max-age=31536000" });
    return ref.getDownloadURL();
  }
  function upErr(e) {
    const c = (e && e.code) || "", m = (e && e.message) || "";
    console.error("OnRoute: foto", c, m, e);
    if (m === "tipo") return "Ese archivo no es una imagen. Usa una foto JPG o PNG.";
    if (m === "grande") return "La foto es demasiado grande (más de 25 MB).";
    if (m === "imagen") return "No pudimos leer esa foto. Prueba con una foto JPG o PNG.";
    if (m === "storage") return "El servicio de fotos no cargó. Recarga la página e intenta otra vez.";
    if (c === "storage/unauthorized") return "Firebase no dio permiso para subir la foto. Revisa que publicaste las reglas de Storage y que aceptaste el permiso para que Storage lea Firestore. (storage/unauthorized)";
    if (/bucket-not-found|project-not-found|no-default-bucket|invalid-default-bucket/.test(c) || (c === "storage/unknown" && /404|not found/i.test(m)))
      return `Firebase Storage no está activado en tu proyecto. Actívalo en la consola de Firebase, en Storage (requiere el plan Blaze). (${c})`;
    if (/retry-limit|canceled|network/.test(c)) return `Se cortó la conexión al subir la foto. Intenta otra vez. (${c})`;
    if (c === "storage/quota-exceeded") return "Se llenó el espacio de fotos de Firebase. (storage/quota-exceeded)";
    return `No se pudo subir la foto. ${c ? "(" + c + ")" : ""}`.trim();
  }
  // Plan gratuito de Firebase: las fotos se guardan comprimidas en Firestore (restaurants/{id}/photos/{foto}).
  // Cada documento de Firestore admite hasta 1 MB, así que cada foto se reduce a unos 150 KB como máximo.
  async function toDataUrl(file, max, maxChars) {
    if (!file || !/^image\//.test(file.type || "image/")) throw new Error("tipo");
    if (file.size > 25 * 1024 * 1024) throw new Error("grande");
    let src;
    try { src = await createImageBitmap(file); }
    catch (e) { try { src = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file); }); } catch (e2) { throw new Error("imagen"); } }
    let size = max, q = 0.8, out = "";
    for (let tries = 0; tries < 8; tries++) {
      const k = Math.min(1, size / Math.max(src.width, src.height));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(src, 0, 0, c.width, c.height);
      out = c.toDataURL("image/jpeg", q);
      if (out.length <= maxChars) return out;
      if (q > 0.55) q -= 0.1; else size = Math.round(size * 0.8);
    }
    if (out.length <= maxChars) return out;
    throw new Error("grande");
  }
  const photoCache = {}, photoSubs = {};
  function watchPhotos(rid) {
    if (!rid || photoSubs[rid]) return;
    photoSubs[rid] = db.collection(`restaurants/${rid}/photos`).onSnapshot(snap => {
      snap.docs.forEach(d => { const v = d.data(); photoCache[`${rid}/${d.id}`] = safeImg(v && v.data); });
      if (S.route.name === "rest" && S.rid === rid) paint(renderRest);
      if (S.route.name === "panel" && S.my && S.my.id === rid && S.ktab === "menu") paint(renderMenuEd);
    }, err => console.error("OnRoute: fotos", err));
  }
  function photoSrc(rid, ref) {
    if (!ref) return "";
    if (ref.startsWith("fs:")) { watchPhotos(rid); return photoCache[`${rid}/${ref.slice(3)}`] || ""; }
    return ref;
  }
  async function savePhoto(file, itemId) {
    const data = await toDataUrl(file, 900, 190000);
    const pid = `${String(itemId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30)}-${Date.now().toString(36)}`;
    photoCache[`${S.my.id}/${pid}`] = data;
    await db.doc(`restaurants/${S.my.id}/photos/${pid}`).set({ data, createdAt: Date.now() });
    return "fs:" + pid;
  }
  async function cleanPhotos(items) {
    // Borra las fotos que ya no usa ningún platillo (para no gastar espacio del plan gratuito).
    try {
      const used = new Set(items.map(m => m.photo).filter(p => p && p.startsWith("fs:")).map(p => p.slice(3)));
      const snap = await db.collection(`restaurants/${S.my.id}/photos`).get();
      for (const d of snap.docs) if (!used.has(d.id) && Date.now() - num(d.data().createdAt) > 60000) await db.doc(`restaurants/${S.my.id}/photos/${d.id}`).delete();
    } catch (e) { console.warn("OnRoute: limpiar fotos", e); }
  }
  function photoErr(e) {
    const m = (e && e.message) || "", c = (e && e.code) || "";
    console.error("OnRoute: foto", c, m, e);
    if (m === "tipo") return "Ese archivo no es una imagen. Usa una foto JPG o PNG.";
    if (m === "grande") return "La foto es demasiado grande. Prueba con otra foto.";
    if (m === "imagen") return "No pudimos leer esa foto. Prueba con una foto JPG o PNG.";
    if (c === "permission-denied") return "Firebase no dio permiso para guardar la foto. Revisa que publicaste las reglas nuevas de Firestore.";
    return "No se pudo guardar la foto. Revisa tu conexión e intenta otra vez.";
  }
  async function onPhoto(input) {
    const i = Number(input.dataset.photo), m = S.meDraft[i], file = input.files && input.files[0];
    input.value = "";
    if (!m || !file) return;
    S.uploading[m.id] = true; paint(renderMenuEd);
    try { m.photo = await savePhoto(file, m.id); meTouch(); }
    catch (e) { const msg = photoErr(e); S.meMsg = msg; S.meMsgCls = "err"; toast(msg); }
    delete S.uploading[m.id]; paint(renderMenuEd); if (S.meDirty) meTouch();
  }

  // ---------- Reportes
  function renderRep() {
    const el = $("#pRep");
    if (!el.dataset.built) {
      el.dataset.built = "1";
      el.innerHTML = `<div class="ptitle"><h3>Reportes</h3><p>Pedidos entregados, ventas y ticket promedio.</p></div>
        <div class="h-controls"><div class="seg" id="hRange"><button data-range="today">Hoy</button><button data-range="yesterday">Ayer</button><button data-range="week">7 días</button></div>
        <input id="hSearch" type="search" placeholder="Buscar por nombre del cliente" autocomplete="off"></div>
        <div class="h-sum" id="hSum"></div><div id="hList"></div>`;
      $("#hSearch").addEventListener("input", e => { S.hq = e.target.value; renderRep(); });
    }
    $$("#hRange button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.range === S.hRange)));
    const t0 = todayStart(), day = 86400000;
    const [a, b] = S.hRange === "yesterday" ? [t0 - day, t0] : S.hRange === "week" ? [t0 - 6 * day, t0 + day] : [t0, t0 + day];
    const q = S.hq.trim().toLowerCase();
    const list = S.orders.filter(o => o.status === "done" && o.createdAt >= a && o.createdAt < b && (!q || String(o.who || "").toLowerCase().includes(q)));
    const total = list.reduce((s, o) => s + num(o.total), 0);
    $("#hSum").innerHTML = `<span><b class="mono">${list.length}</b>entregados</span><span><b class="mono">${money(total)}</b>vendido</span><span><b class="mono">${money(list.length ? total / list.length : 0)}</b>ticket promedio</span>`;
    const fT = t => new Date(t).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit" }), fD = t => new Date(t).toLocaleDateString("es-US", { weekday: "short", day: "numeric" });
    $("#hList").innerHTML = list.length ? list.map(o => `<div class="h-row"><time class="mono">${S.hRange === "week" ? fD(o.createdAt) + "<br>" : ""}${fT(o.createdAt)}</time>
      <div class="who"><b>${esc(o.who)} · #${esc(o.num)}</b><span>${esc((o.items || []).map(it => `${num(Number(it.qty))} × ${it.name}`).join(", "))}</span></div>
      <span class="amt mono">${money(o.total)}<small>${o.paid ? "Tarjeta" : "Al recoger"}</small></span></div>`).join("")
      : `<div class="empty">${q ? "Ningún pedido entregado con ese nombre en este periodo." : "Todavía no hay pedidos entregados en este periodo."}</div>`;
  }

  // ---------- Promociones y clientes frecuentes (negocio)
  const counted = o => !["pending", "cancelled", "await"].includes(o.status);
  // Número de visita de un cliente con cuenta (cuenta los pedidos cargados en el panel).
  function visitsOf(o) { return o.uid ? S.orders.filter(x => x.uid === o.uid && counted(x) && x.createdAt <= o.createdAt).length : 0; }
  function rewardCheck(o) {
    const L = loyaltyOf(S.my), prev = visitsOf(o) - 1;
    if (L && prev > 0 && prev % L.every === 0) return `<span class="ok-ln">✓ ${prev} pedidos previos</span>`;
    return `<span class="warn-ln">revisa: no vemos ${L ? L.every : "suficientes"} pedidos previos de este cliente</span>`;
  }
  function custStats() {
    const m = new Map();
    S.orders.filter(counted).forEach(o => {
      const key = o.uid ? "u:" + o.uid : "n:" + norm(o.who).trim(); if (key === "n:") return;
      const c = m.get(key) || { name: o.who, acct: !!o.uid, n: 0, spent: 0, last: 0, rewards: 0 };
      c.n++; c.spent += num(o.total); if (o.reward) c.rewards++;
      if (o.createdAt > c.last) { c.last = o.createdAt; c.name = o.who; }
      m.set(key, c);
    });
    return [...m.values()].sort((a, b) => b.n - a.n || b.spent - a.spent);
  }
  function prEnsure() {
    if (S.pr) return;
    const l = S.my.loyalty || {};
    S.pr = { promos: promosOf(S.my, true), loyalty: { on: !!l.on, every: l.every || 5, reward: l.reward || "" } }; S.prDirty = false;
  }
  function prTouch() { S.prDirty = true; S.prMsg = ""; S.prCls = ""; prBar(); }
  function prBar() {
    const s = $("#prState"); if (!s) return;
    s.textContent = S.prMsg || (S.prDirty ? "Cambios sin guardar" : "Sin cambios"); s.className = S.prCls || (S.prDirty ? "dirty" : "");
    $("[data-prt=save]").disabled = !S.prDirty || S.prSaving; $("[data-prt=discard]").disabled = !S.prDirty || S.prSaving;
  }
  function renderPromos() {
    const el = $("#pPromo"); prEnsure();
    const P = S.pr, L = loyaltyOf(S.my), cs = custStats(), back = cs.filter(c => c.n > 1);
    el.innerHTML = `<div class="ptitle"><h3>Promociones y clientes frecuentes</h3><p>Atrae clientes con promociones y premia a los que regresan.</p></div>
      <div class="kcard"><h4>Promociones</h4>
        <p class="hint" style="margin-bottom:10px">Sin código, la promoción se aplica sola en el carrito y aparece en tu página. Con código, solo la recibe quien lo escriba: compártelo en tus redes. Si aplican varias, el cliente recibe la que más le ahorra. Aplican en pedidos que se pagan al recoger.</p>
        <div class="plist">${P.promos.map((p, k) => `<div class="pcard ${p.on ? "" : "off"}" data-p="${k}">
          <input id="pt-${k}" data-pr="title" maxlength="40" value="${esc(p.title)}" placeholder="Nombre (ej. Martes de tortas)" aria-label="Nombre de la promoción">
          <div class="pline">
            <div class="seg" role="group" aria-label="Tipo de descuento"><button data-prkind="pct" aria-pressed="${p.kind === "pct"}">%</button><button data-prkind="off" aria-pressed="${p.kind === "off"}">$</button></div>
            <label class="pf">Descuento<input id="pv-${k}" data-pr="value" type="number" inputmode="decimal" min="0" step="0.5" value="${esc(p.value)}"></label>
            <label class="pf">Pedido mínimo $<input id="pm-${k}" data-pr="min" type="number" inputmode="decimal" min="0" step="1" value="${esc(p.min || "")}" placeholder="0"></label>
            <label class="pf">Código<input id="pc-${k}" data-pr="code" maxlength="15" value="${esc(p.code)}" placeholder="Opcional" autocapitalize="characters" autocomplete="off"></label>
          </div>
          <div class="me-foot"><div class="l"><button class="me-chip ${p.on ? "" : "on"}" data-prt="on">${p.on ? "Activa · tocar para pausar" : "Pausada · tocar para activar"}</button></div><button class="me-del" data-prt="del">Eliminar</button></div>
        </div>`).join("") || `<p class="hint">Todavía no tienes promociones.</p>`}</div>
        <button class="me-chip" data-prt="add" style="margin-top:10px" ${P.promos.length >= 10 ? "disabled" : ""}>+ Agregar promoción</button></div>
      <div class="kcard" style="display:flex;flex-direction:column;gap:10px"><h4>Tarjeta de cliente frecuente</h4>
        <p class="hint">Cada pedido de un cliente con cuenta OnRoute suma un sello. Cuando completa la tarjeta, su siguiente pedido llega a tu cocina marcado con el premio para que se lo entregues.</p>
        <label class="prow" for="loyOn"><span class="prow-i">${I.gift}</span><span class="prow-t">Tarjeta de sellos<small>${P.loyalty.on ? "Activada" : "Desactivada"}</small></span><input type="checkbox" id="loyOn" class="tgl" ${P.loyalty.on ? "checked" : ""}></label>
        <div class="loy-f"><label class="pf">Sellos para el premio<input id="loyEvery" data-loy="every" type="number" inputmode="numeric" min="2" max="20" value="${esc(P.loyalty.every)}"></label>
          <label class="pf grow">Premio<input id="loyReward" data-loy="reward" maxlength="60" value="${esc(P.loyalty.reward)}" placeholder="Ej. Una torta sencilla gratis"></label></div></div>
      <div class="me-bar"><span id="prState"></span><div><button class="btn sec sm" data-prt="discard">Descartar</button><button class="btn sm" data-prt="save">Guardar</button></div></div>
      <div class="kcard"><h4>Tus clientes</h4>
        ${!S.ordersReady ? `<div class="empty">Cargando…</div>` : !cs.length ? `<div class="empty">Cuando recibas pedidos, aquí verás quién te compra más.</div>` : `
        <div class="h-sum"><span><b class="mono">${cs.length}</b>clientes</span><span><b class="mono">${back.length}</b>regresaron</span><span><b class="mono">${cs.length ? Math.round((back.length / cs.length) * 100) : 0}%</b>vuelven</span></div>
        ${cs.slice(0, 40).map(c => `<div class="adm-row"><span class="rlogo">${esc(initials(c.name))}</span>
          <div style="min-width:0"><b>${esc(c.name)}</b><span>${c.n} pedido${c.n > 1 ? "s" : ""} · ${money(c.spent)} · ${ago(c.last)}${c.acct ? "" : " · sin cuenta"}</span></div>
          <div class="acts">${c.acct && L ? `<span class="chip ${c.n % L.every === 0 ? "open" : ""}">${c.n % L.every === 0 ? "Premio listo" : `${c.n % L.every}/${L.every} sellos`}</span>` : ""}${c.n > 1 ? `<span class="chip info">Frecuente</span>` : ""}</div></div>`).join("")}
        <p class="hint" style="margin-top:10px">Basado en tus últimos ${S.orders.length} pedidos. Los clientes sin cuenta se agrupan por nombre.</p>`}</div>`;
    prBar();
  }
  async function savePromos() {
    const P = S.pr; let bad = null;
    const codes = P.promos.map(p => cleanCode(p.code)).filter(Boolean);
    P.promos.forEach((p, k) => {
      const v = Number(p.value), mn = Number(p.min || 0);
      if (!(v > 0) || (p.kind === "pct" && v > 90) || (p.kind === "off" && v > 100)) bad = bad || [`#pv-${k}`, p.kind === "pct" ? "El descuento en % va de 1 a 90." : "El descuento en $ va de $0.50 a $100."];
      if (!(mn >= 0 && mn < 1000)) bad = bad || [`#pm-${k}`, "Revisa el pedido mínimo."];
      const c = cleanCode(p.code); if (c && codes.indexOf(c) !== codes.lastIndexOf(c)) bad = bad || [`#pc-${k}`, "Hay dos promociones con el mismo código."];
    });
    const Lp = P.loyalty, ev = Math.round(Number(Lp.every));
    if (Lp.on && !(ev >= 2 && ev <= 20)) bad = bad || ["#loyEvery", "Los sellos para el premio van de 2 a 20."];
    if (Lp.on && !String(Lp.reward).trim()) bad = bad || ["#loyReward", "Escribe cuál es el premio."];
    if (bad) { const e = $(bad[0]); if (e) { e.classList.add("bad"); e.scrollIntoView({ block: "center" }); e.focus(); } S.prMsg = bad[1]; S.prCls = "err"; prBar(); return; }
    const promos = P.promos.map(p => ({ id: p.id, title: String(p.title || "").trim().slice(0, 40), kind: p.kind === "off" ? "off" : "pct",
      value: Math.round(Number(p.value) * 100) / 100, min: Math.round(Number(p.min || 0) * 100) / 100, code: cleanCode(p.code), on: !!p.on }));
    const loyalty = { on: !!Lp.on, every: ev >= 2 && ev <= 20 ? ev : 5, reward: String(Lp.reward || "").trim().slice(0, 60) };
    S.prSaving = true; S.prMsg = "Guardando…"; S.prCls = ""; prBar();
    try {
      await db.doc(`restaurants/${S.my.id}`).update({ promos, loyalty, updatedAt: Date.now() });
      S.prSaving = false; S.prDirty = false; S.pr = null; S.prMsg = "Guardado. Tus clientes ya lo ven."; S.prCls = "ok"; paint(renderPanel);
    } catch (e) {
      console.error("OnRoute: promociones", e); S.prSaving = false;
      S.prMsg = e && e.code === "permission-denied" ? "No se pudo guardar: falta publicar las reglas nuevas de Firestore." : "No se pudo guardar. Revisa la conexión."; S.prCls = "err"; prBar();
    }
  }

  // ---------- Perfil, ubicación y enlace
  function pfEnsure() { if (!S.pf) { const R = S.my; S.pf = { name: R.name || "", kind: R.kind || "truck", cuisine: R.cuisine || "", description: R.description || "", phone: R.phone || "", address: R.address || "", lat: R.lat, lng: R.lng, hours: JSON.parse(JSON.stringify(hoursOf(R).days)), dlvOn: !!(R.delivery && R.delivery.on), dlvRadius: (R.delivery && R.delivery.radius) || 5,
    payCash: !(R.payments && R.payments.cash === false), payCashDlv: !(R.payments && R.payments.cashDelivery === false), zelle: (R.payments && R.payments.zelle) || "", cashapp: (R.payments && R.payments.cashapp) || "" }; S.pfDirty = false; } }
  function renderProf() {
    const el = $("#pProf"), R = S.my;
    pfEnsure();
    const P = S.pf, link = `${BASE}?r=${R.id}`;
    if (el.dataset.built !== R.id + P.kind) {
      el.dataset.built = R.id + P.kind; pfMap = null; pfMarker = null;
      el.innerHTML = `<div class="ptitle"><h3>Perfil del negocio</h3><p>Así te ven los clientes en OnRoute.</p></div>
        <div class="pf-grid">
          <div class="kcard" style="display:flex;flex-direction:column;gap:12px">
            <div class="pf-logo"><span id="pfLogo"></span><div style="display:flex;flex-direction:column;gap:6px"><label class="btn sec sm" for="pfLogoIn">Subir logo<input type="file" id="pfLogoIn" accept="image/*"></label><span class="hint">Cuadrado, se ve mejor. JPG o PNG.</span></div></div>
            <div class="field"><label for="pf-name">Nombre</label><input id="pf-name" data-pf="name" maxlength="60"></div>
            <div class="field"><span class="flabel">Tipo</span><div class="kinds"><button data-pfkind="truck">Food truck</button><button data-pfkind="restaurant">Restaurante</button></div></div>
            <div class="field"><label for="pf-cuisine">Tipo de comida</label><input id="pf-cuisine" data-pf="cuisine" maxlength="60" placeholder="Ej. Tortas, tacos"></div>
            <div class="field"><label for="pf-desc">Descripción</label><textarea id="pf-desc" data-pf="description" maxlength="300" placeholder="Qué te hace especial, especialidades"></textarea></div>
            <div class="field"><label for="pf-phone">Teléfono</label><input id="pf-phone" data-pf="phone" maxlength="30" inputmode="tel"></div>
            ${P.kind === "restaurant" ? `<div class="field"><label for="pf-addr">Dirección</label><input id="pf-addr" data-pf="address" maxlength="120"></div>` : ""}
            <p id="pfMsg" class="hint"></p>
            <button class="btn" data-act="saveprof">Guardar perfil</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${P.kind === "restaurant" ? `<div class="kcard" style="display:flex;flex-direction:column;gap:10px"><h4>Ubicación en el mapa</h4>
                <p class="hint">Toca el mapa donde está tu local, o usa tu ubicación si estás ahí ahora. Con esto te ordenamos por cercanía.</p>
                <div class="pf-map" id="pfMap"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec sm" data-act="pfhere">${I.target} Estoy en mi local</button><span class="hint" id="pfCoords"></span></div></div>`
            : `<div class="kcard gps" id="gpsCard"><div class="gps-head"><div><h3>Ubicación del food truck</h3><p id="gpsStatus">No estás compartiendo la ubicación.</p></div><button class="btn" id="gpsBtn" data-act="gps">Compartir ubicación</button></div>
                <div class="gps-fields" style="margin-top:12px"><div class="field"><label for="gpsStop">Parada de hoy</label><input id="gpsStop" maxlength="60" placeholder="Ej. The Block"></div></div>
                <p class="hint" style="margin-top:10px">Deja OnRoute abierto en el celular o tableta del camión. La ubicación se actualiza sola y los clientes te ven abierto mientras compartes.</p></div>`}
            <div class="kcard" style="display:flex;flex-direction:column;gap:10px"><h4>Horario</h4>
              <p class="hint">Fuera de este horario OnRoute te muestra cerrado y no recibe pedidos. Hora de San Antonio.</p>
              <div class="hgrid" id="pfHours"></div>
              <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec sm" data-act="hcopy">Copiar el lunes a todos los días abiertos</button></div>
              <p class="hint">Si un turno pasa de medianoche (ej. 6 pm a 2 am), pon la hora de cierre menor a la de apertura.</p></div>
            ${window.ONROUTE_CARD_PAYMENTS && window.ONROUTE_API ? `<div class="kcard" style="display:flex;flex-direction:column;gap:10px"><h4>Pagos con tarjeta</h4>
              <p class="hint">Tus clientes podrán pagar con tarjeta al pedir. El dinero llega directo a tu cuenta de banco; Stripe te cobra su comisión por cada pago y OnRoute no cobra nada.</p>
              <div id="pfStripe" class="sg"></div></div>` : ""}
            <div class="kcard" style="display:flex;flex-direction:column;gap:10px"><h4>Otras formas de pago</h4>
              <p class="hint">Además de tarjeta, tus clientes pueden pagarte directo. Con Zelle o Cash App el pedido llega como <b>Por confirmar</b>: revisa que te llegó el dinero y toca <i>Pago recibido</i>; entonces entra a la cocina.</p>
              <label class="dlv-sw"><input type="checkbox" id="pfCash"> <span>Efectivo al recoger</span></label>
              <label class="dlv-sw"><input type="checkbox" id="pfCashDlv"> <span>Efectivo al entregar (lo cobra el repartidor, en pedidos a domicilio)</span></label>
              <div class="field"><label for="pf-zelle">Zelle <span class="hint">(correo o teléfono registrado en Zelle; vacío = no aceptas)</span></label><input id="pf-zelle" data-pf="zelle" maxlength="80" placeholder="Ej. pagos@minegocio.com"></div>
              <div class="field"><label for="pf-cashapp">Cash App <span class="hint">($cashtag; vacío = no aceptas)</span></label><input id="pf-cashapp" data-pf="cashapp" maxlength="21" placeholder="Ej. $MiNegocio" autocapitalize="off"></div>
              <p class="hint">Toca <b>Guardar perfil</b> para aplicar los cambios.</p></div>
            ${window.ONROUTE_API ? `<div class="kcard" style="display:flex;flex-direction:column;gap:10px"><h4>Entrega a domicilio</h4>
              <p class="hint">Repartidores de OnRoute llevan tus pedidos. El cliente paga el envío según las millas (desde ${money(DLV.minFee)}) y la propina. Con tarjeta todo es automático; con Zelle, Cash App o efectivo, OnRoute lleva las cuentas en <i>Saldos</i> y se liquidan cada semana.</p>
              <label class="dlv-sw"><input type="checkbox" id="pfDlvOn"> <span>Ofrecer entrega a domicilio</span></label>
              <div class="field"><label for="pfDlvR">Hasta qué distancia entregas</label><select id="pfDlvR">${[2, 3, 5, 8].map(n => `<option value="${n}">${n} millas</option>`).join("")}</select></div>
              <p class="hint" id="pfDlvNote"></p></div>` : ""}
            <div class="kcard"><h4>Tu enlace y código QR</h4><div class="share"><div class="qr" id="pfQR"></div><div class="link"><code>${esc(link)}</code>
              <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm sec" data-copy="${esc(link)}">Copiar enlace</button><a class="btn sm sec" href="./?r=${esc(R.id)}" data-rest="${esc(R.id)}">Abrir</a></div>
              <span class="hint">Imprime el QR y pégalo en tu ventanilla o mesas.</span></div></div></div>
            <div class="kcard session" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px"><span class="hint">Sesión: ${esc(S.user.email || "")}</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec sm" data-pick="cliente">${I.food} Pedir comida (modo cliente)</button><button class="btn sec sm" data-auth="logout">Cerrar sesión</button></div></div>
          </div></div>`;
      ["name", "cuisine", "description", "phone", "address", "zelle", "cashapp"].forEach(k => { const i = el.querySelector(`[data-pf="${k}"]`); if (i) i.value = P[k] || ""; });
      try { const qr = qrcode(0, "M"); qr.addData(link); qr.make(); $("#pfQR").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { $("#pfQR").textContent = "QR no disponible"; }
      $("#pfLogoIn").addEventListener("change", async e => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        $("#pfLogo").innerHTML = `<span class="rlogo">…</span>`; S.pfMsg = "Subiendo logo…"; paint(renderProf);
        try { const url = await toDataUrl(f, 256, 45000); await db.doc(`restaurants/${R.id}`).update({ logoUrl: url, updatedAt: Date.now() }); S.pfMsg = "Logo actualizado."; toast("Logo actualizado."); }
        catch (err) { S.pfMsg = photoErr(err); toast("No se pudo subir el logo."); }
        e.target.value = ""; paint(renderProf);
      });
      if (P.kind === "restaurant") setTimeout(drawPfMap, 30);
      else { const st = $("#gpsStop"); if (R.loc) st.value = R.loc.stop || ""; gpsUI(); }
    }
    $$("[data-pfkind]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pfkind === P.kind)));
    const hg = $("#pfHours");
    if (hg && hg.dataset.v !== JSON.stringify(P.hours)) {
      hg.dataset.v = JSON.stringify(P.hours);
      hg.innerHTML = WEEK.map(i => { const d = P.hours[i]; return `<div class="hrow ${d.closed ? "off" : ""}"><label class="hday"><input type="checkbox" data-hopen="${i}" ${d.closed ? "" : "checked"}> ${DAYS[i]}</label>
        ${d.closed ? `<span class="hint">Cerrado</span>` : `<input type="time" data-ht="${i}" data-hk="open" value="${esc(d.open)}" aria-label="${DAYS[i]} abre"><span>a</span><input type="time" data-ht="${i}" data-hk="close" value="${esc(d.close)}" aria-label="${DAYS[i]} cierra">`}</div>`; }).join("");
    }
    $("#pfLogo").innerHTML = logoHTML(R);
    const dOn = $("#pfDlvOn"), dR = $("#pfDlvR"), dN = $("#pfDlvNote");
    if (dOn) { dOn.checked = !!P.dlvOn; dR.value = String(P.dlvRadius); dR.disabled = !P.dlvOn;
      dN.textContent = P.dlvOn && !R.stripeReady && !P.payCashDlv && !P.zelle.trim() && !P.cashapp.trim() ? "Para entregar necesitas tarjeta, efectivo al entregar, Zelle o Cash App." : S.pfDirty ? (P.dlvOn ? "Toca Guardar perfil para aplicar los cambios." : "") : (R.delivery && R.delivery.on ? "Activa: tus clientes ven la opción A domicilio." : ""); }
    const pc1 = $("#pfCash"), pc2 = $("#pfCashDlv"); if (pc1) { pc1.checked = !!P.payCash; pc2.checked = !!P.payCashDlv; }
    const sp = $("#pfStripe");
    if (sp) { const h = stripeGuideHTML(R); if (sp.dataset.h !== h) { const open = $$("details[data-sg]", sp).filter(d => d.open).map(d => d.dataset.sg); sp.innerHTML = h; sp.dataset.h = h; open.forEach(k => { const d = sp.querySelector(`details[data-sg="${k}"]`); if (d) d.open = true; }); } }
    if (sp && R.stripeAccount && !R.stripeReady && !S.stripeInfo && !S.stripeBusy && !S.stripeAuto) { S.stripeAuto = true; setTimeout(() => stripeStatus(true), 0); }
    const m = $("#pfMsg"); if (m) { m.textContent = S.pfMsg; m.className = S.pfMsg && /No se pudo|Falta|no dio permiso|no está activado|No pudimos|no cargó|no es una imagen|demasiado grande|Se cortó|Se llenó/.test(S.pfMsg) ? "err" : S.pfMsg ? "ok-msg" : "hint"; }
    const pc = $("#pfCoords"); if (pc) pc.textContent = typeof P.lat === "number" ? `Ubicación marcada (${P.lat.toFixed(4)}, ${P.lng.toFixed(4)})` : "Aún no marcas tu ubicación.";
  }
  function drawPfMap() {
    const el = $("#pfMap"); if (!el || !hasL()) return;
    const P = S.pf, has = typeof P.lat === "number";
    pfMap = makeMap(el, { center: has ? [P.lat, P.lng] : S.me ? [S.me.lat, S.me.lng] : undefined, zoomLevel: has ? 16 : 11 });
    if (!pfMap) return;
    if (has) pfMarker = L.marker([P.lat, P.lng], { icon: pinIcon(S.my) }).addTo(pfMap);
    pfMap.on("click", e => setPfPos(e.latlng.lat, e.latlng.lng));
  }
  function setPfPos(lat, lng) {
    S.pf.lat = Math.round(lat * 1e6) / 1e6; S.pf.lng = Math.round(lng * 1e6) / 1e6; S.pfDirty = true; S.pfMsg = "Ubicación marcada. Toca Guardar perfil.";
    if (pfMap) { if (pfMarker) pfMarker.setLatLng([lat, lng]); else pfMarker = L.marker([lat, lng], { icon: pinIcon(S.my) }).addTo(pfMap); pfMap.setView([lat, lng], Math.max(pfMap.getZoom(), 16)); }
    paint(renderProf);
  }
  // ---------------------------------------------------------------- guía para conectar Stripe
  const SG_STEPS = ["Prepara tus datos", "Abre Stripe", "Llena tus datos", "Stripe revisa", "Conectado"];
  // Traduce lo que Stripe pide (en inglés) a algo que el dueño entienda y sepa resolver.
  function sgNeed(m) {
    const t = `${m.text} ${(m.codes || []).join(" ")}`.toLowerCase();
    const L = [
      [/document|selfie|photo/, "Foto de tu identificación (licencia o pasaporte)", "Ten a la mano tu licencia o pasaporte; Stripe te pide tomarle foto con el celular."],
      [/id[_ ]number|ssn|social security|tax[_ ]id|\bein\b|tin\b/, "Número de seguro social (SSN) o EIN", "Escríbelo completo, sin guiones. Si tu negocio no tiene EIN, usa tu SSN."],
      [/statement[_ ]descriptor/, "Descripción del cargo", "Debe parecerse al nombre comercial del negocio (ej. TORTAS TORTUGA)."],
      [/external[_ ]account|bank|payout/, "Cuenta de banco", "Conecta la cuenta de cheques donde quieres recibir tu dinero."],
      [/dob|birth/, "Fecha de nacimiento", "La del dueño o representante del negocio."],
      [/address|postal|street/, "Dirección", "Pon la dirección real del negocio o del dueño (no apartado postal)."],
      [/phone/, "Teléfono", "Un número donde Stripe te pueda contactar."],
      [/email/, "Verificar tu correo", "Abre el correo que te mandó Stripe y toca Verificar."],
      [/url|website|web_presence/, "Sitio web del negocio", "Puedes dejar el enlace de tu página en OnRoute."],
      [/tos|terms/, "Aceptar los términos de Stripe", "Revisa y acepta los términos al final del registro."],
      [/product[_ ]description|industry|mcc/, "Descripción del negocio", "Ej. Venta de comida para llevar. Categoría: Restaurantes."],
      [/name/, "Nombre legal", "Tal como aparece en tu identificación."],
    ];
    const f = L.find(x => x[0].test(t));
    return f ? { title: f[1], tip: f[2] } : { title: "Otro dato que pide Stripe", tip: m.text || "" };
  }
  function stripePhase(R) {
    const I = S.stripeInfo;
    if (R.stripeReady || (I && I.ready)) return 4;
    if (!R.stripeAccount) return 0;
    if (I && I.missing && I.missing.some(m => m.who === "user")) return 2;
    if (I) return 3;
    return 2;
  }
  function stripeGuideHTML(R) {
    const ph = stripePhase(R), I = S.stripeInfo || {}, E = S.stripeErr, busy = S.stripeBusy;
    const rejected = (I.reasons || []).some(c => /^rejected|unsupported/.test(c));
    const bar = `<ol class="sg-bar" aria-label="Avance">${SG_STEPS.map((t, i) => `<li class="${i < ph || ph === 4 ? "done" : i === ph ? "now" : ""}"><span>${i < ph || ph === 4 ? "✓" : i + 1}</span><em>${t}</em></li>`).join("")}</ol>
      <p class="sg-step"><b>Paso ${Math.min(ph + 1, 5)} de 5:</b> ${SG_STEPS[ph]}</p>`;
    const err = E ? `<div class="sg-err" role="alert"><b>${esc(E.title)}</b><span>${esc(E.what)}</span>${E.detail ? `<details><summary>Detalle técnico</summary><code>${esc(E.detail)}</code></details>` : ""}</div>` : "";
    const msg = S.stripeMsg ? `<p class="hint">${esc(S.stripeMsg)}</p>` : "";
    const help = `<details class="sg-help" data-sg="help"><summary>Ayuda pantalla por pantalla</summary><ul>
        <li><b>Correo:</b> usa uno que <u>no</u> tenga cuenta de Stripe. Con Gmail puedes agregar +negocio antes de la arroba (ej. tunombre+tacos@gmail.com) y te llega a la misma bandeja.</li>
        <li><b>Contraseña y verificación:</b> Stripe te pide una contraseña de 10+ caracteres y un código por mensaje de texto. Guarda el código de respaldo.</li>
        <li><b>Tipo de empresa:</b> si no tienes EIN, elige <i>empresa no registrada</i> o <i>individual</i>; te pedirá tu SSN.</li>
        <li><b>Sector:</b> Servicios de alimentos y bebidas → Restaurantes.</li>
        <li><b>Sitio web:</b> deja el enlace de OnRoute que ya aparece.</li>
        <li><b>Descripción del cargo:</b> pon el nombre de tu negocio, igual al nombre comercial (Stripe marca error si no coincide).</li>
        <li><b>Banco:</b> conecta la cuenta de cheques donde quieres recibir tu dinero.</li>
        <li><b>Opciones extra</b> (protección contra fraude, clima, impuestos): puedes omitirlas.</li>
        <li><b>Al final:</b> revisa que nada diga “incompleto”, toca Aceptar y verifica el correo que te manda Stripe.</li></ul></details>`;
    if (ph === 4) return `${bar}<div class="sg-ok">✓ Conectado · ya aceptas tarjeta</div><p class="hint">Tus clientes ya ven <b>Tarjeta ahora</b> al pedir. Tus ventas y depósitos los ves en tu panel de Stripe (dashboard.stripe.com).</p>${msg}`;
    if (rejected) return `${bar}${err}<div class="sg-err"><b>Stripe no aprobó la cuenta</b><span>Stripe no puede procesar pagos para esta cuenta. Entra a dashboard.stripe.com con el correo que usaste o contacta al soporte de Stripe para saber el motivo. Mientras, tus clientes pueden pagar al recoger.</span></div>`;
    if (ph === 0) return `${bar}${err}
      <div class="sg-box"><b>Antes de empezar, ten a la mano:</b><ul class="sg-list">
        <li>Un <b>correo</b> que no tenga cuenta de Stripe</li>
        <li>Tu <b>SSN</b> o el <b>EIN</b> del negocio</li>
        <li>Tu <b>licencia o pasaporte</b> (para la foto)</li>
        <li>Los datos de tu <b>cuenta de banco</b> (de cheques)</li>
        <li>La <b>dirección</b> y el <b>teléfono</b> del negocio</li></ul>
        <p class="hint">Toma unos 10 minutos. Si te sales a medias, aquí mismo puedes continuar donde te quedaste.</p></div>
      <button class="btn" data-act="stripego" ${busy ? "disabled" : ""}>${busy ? "Abriendo Stripe…" : "Ya tengo todo · Conectar con Stripe"}</button>${msg}${help}`;
    const mine = (I.missing || []).filter(m => m.who === "user"), theirs = (I.missing || []).filter(m => m.who === "stripe");
    const list = mine.length ? `<div class="sg-box"><b>Stripe todavía necesita:</b><ul class="sg-need">${mine.map(m => { const n = sgNeed(m); return `<li><b>${esc(n.title)}</b>${n.tip ? `<span>${esc(n.tip)}</span>` : ""}</li>`; }).join("")}</ul></div>` : "";
    if (ph === 2) return `${bar}${err}${list || `<div class="sg-box"><b>Termina tu registro en Stripe.</b><span class="hint">Si ya lo terminaste, toca Revisar estado.</span></div>`}
      <div class="sg-btns"><button class="btn" data-act="stripego" ${busy ? "disabled" : ""}>${busy ? "Abriendo Stripe…" : "Continuar en Stripe"}</button><button class="btn sec sm" data-act="stripechk" ${busy ? "disabled" : ""}>${busy ? "Revisando…" : "Revisar estado"}</button></div>${msg}${help}`;
    return `${bar}${err}<div class="sg-box"><b>Stripe está revisando tus datos.</b><span class="hint">Normalmente tarda unos minutos (a veces hasta un día). Esta página revisa sola cada medio minuto mientras la tengas abierta.${theirs.length ? ` Stripe está verificando: ${esc(theirs.map(m => sgNeed(m).title.toLowerCase()).join(", "))}.` : ""}</span></div>
      <div class="sg-btns"><button class="btn sec sm" data-act="stripechk" ${busy ? "disabled" : ""}>${busy ? "Revisando…" : "Revisar estado"}</button><button class="btn sec sm" data-act="stripego" ${busy ? "disabled" : ""}>Abrir Stripe</button></div>${msg}`;
  }
  // Errores del servidor de pagos en palabras sencillas, con el detalle técnico aparte.
  function stripeErrOf(e) {
    const m = String((e && e.message) || ""), st = e && e.status, d = (e && e.detail) || "";
    if (m === "Failed to fetch" || /NetworkError|Load failed/.test(m)) return { title: "No pudimos comunicarnos con el servidor de pagos", what: "Revisa tu internet e intenta otra vez en un minuto. Si sigue pasando, avísale al soporte de OnRoute.", detail: m };
    if (st === 401) return { title: "Tu sesión venció", what: "Cierra sesión, vuelve a entrar con la cuenta del negocio e intenta otra vez.", detail: d };
    if (st === 403 || st === 404) { const t = m.split(" Detalle:")[0]; return { title: t || "No tienes permiso para esto", what: S.route.name === "driver" ? "Revisa que entraste con tu cuenta de repartidor." : "Entra con la cuenta con la que registraste el negocio.", detail: d }; }
    if (/STRIPE_SECRET_KEY|FIREBASE_SERVICE_ACCOUNT|cuenta de servicio/.test(d)) return { title: "El servidor de pagos no está configurado", what: "Esto no es algo que debas arreglar tú. Avísale al soporte de OnRoute.", detail: d };
    if (/^Stripe:/.test(d)) return { title: "Stripe no aceptó la solicitud", what: "Intenta otra vez en un momento. Si se repite, avísale al soporte de OnRoute con el detalle de abajo.", detail: d };
    return { title: "Algo falló al conectar con Stripe", what: "Intenta otra vez. Si se repite, avísale al soporte de OnRoute con el detalle de abajo.", detail: d || m };
  }
  async function payApi(path, body) {
    const headers = { "Content-Type": "application/json" };
    if (S.user) headers.Authorization = "Bearer " + (await S.user.getIdToken());
    const r = await fetch(window.ONROUTE_API + "/" + path, { method: "POST", headers, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const er = new Error((j.error || "No se pudo conectar con el servidor de pagos.") + (j.detail ? ` Detalle: ${j.detail}` : "")); er.status = r.status; er.detail = j.detail || j.error || ""; throw er; }
    return j;
  }
  async function stripeGo() {
    S.stripeBusy = true; S.stripeMsg = ""; S.stripeErr = null; paint(renderProf);
    try { const j = await payApi("connectStart", { rid: S.my.id }); S.stripeMsg = "Abriendo Stripe…"; location.href = j.url; }
    catch (e) { console.error("OnRoute: Stripe", e); S.stripeBusy = false; S.stripeErr = stripeErrOf(e); paint(renderProf); }
  }
  let sgTimer = null, sgUntil = 0;
  async function stripeStatus(quiet) {
    S.stripeBusy = true; if (!quiet) S.stripeErr = null; paint(renderPanel);
    try {
      for (let i = 0; i < 20 && !S.my; i++) await new Promise(r => setTimeout(r, 300));
      if (!S.my) throw Object.assign(new Error("sesión"), { status: 401 });
      const j = await payApi("connectStatus", { rid: S.my.id });
      S.stripeInfo = j; S.stripeErr = null;
      S.stripeMsg = j.ready ? "¡Listo! Tus clientes ya pueden pagar con tarjeta." : "";
      if (j.ready) toast("Stripe conectado: ya aceptas tarjeta.");
    } catch (e) { console.error("OnRoute: Stripe", e); S.stripeErr = stripeErrOf(e); S.stripeMsg = ""; }
    S.stripeBusy = false; paint(renderPanel);
    // Mientras Stripe revisa, se vuelve a preguntar solo cada 30 s (hasta 10 min) si el Perfil sigue abierto.
    clearTimeout(sgTimer);
    if (S.stripeInfo && !S.stripeInfo.ready && S.my && S.my.stripeAccount && !S.stripeErr) {
      if (!sgUntil) sgUntil = Date.now() + 10 * 60000;
      if (Date.now() < sgUntil) sgTimer = setTimeout(() => { if (S.route.name === "panel" && S.ktab === "prof" && !document.hidden) stripeStatus(true); }, 30000);
    }
  }
  async function saveProf() {
    const P = S.pf;
    if (String(P.name).trim().length < 2) { S.pfMsg = "Falta el nombre del negocio."; paint(renderProf); return; }
    const upd = { name: P.name.trim().slice(0, 60), kind: P.kind, cuisine: P.cuisine.trim().slice(0, 60), description: P.description.trim().slice(0, 300), phone: P.phone.trim().slice(0, 30), address: P.address.trim().slice(0, 120), updatedAt: Date.now() };
    const bad = P.hours.findIndex(d => !d.closed && (!okT(d.open) || !okT(d.close) || d.open === d.close));
    if (bad >= 0) { S.pfMsg = `Falta revisar el horario del ${DAYS[bad].toLowerCase()}.`; paint(renderProf); return; }
    const zl = String(P.zelle || "").trim().slice(0, 80), ca = String(P.cashapp || "").trim().replace(/^\$?/, "$").replace(/[^$A-Za-z0-9_-]/g, "").slice(0, 21);
    if (ca.length === 1 && String(P.cashapp || "").trim()) { S.pfMsg = "Revisa tu $cashtag de Cash App."; paint(renderProf); return; }
    upd.payments = { cash: !!P.payCash, cashDelivery: !!P.payCashDlv, zelle: zl, cashapp: ca.length > 1 ? ca : "" };
    upd.delivery = { on: !!P.dlvOn, radius: Math.min(8, Math.max(1, Number(P.dlvRadius) || 5)) };
    upd.hours = { tz: TZ, days: P.hours.map(d => d.closed ? { closed: true } : { open: d.open, close: d.close }) };
    if (typeof P.lat === "number") { upd.lat = P.lat; upd.lng = P.lng; }
    try { await db.doc(`restaurants/${S.my.id}`).update(upd); S.pfDirty = false; S.pfMsg = "Perfil guardado."; S.pf = null; paint(renderPanel); }
    catch (e) { console.error("OnRoute: perfil", e); S.pfMsg = "No se pudo guardar. Revisa la conexión."; paint(renderProf); }
  }

  // ---------- GPS del food truck
  let watchId = null, lastSent = 0, lastPos = null, lastObj = null, wakeLock = null, beat = null;
  function gpsUI(msg, cls) {
    const p = $("#gpsStatus"), b = $("#gpsBtn"); if (!p || !b) return;
    if (msg !== undefined) { p.textContent = msg; p.className = cls || ""; }
    else if (watchId === null) { p.textContent = S.my && truckLive(S.my) ? "Compartiendo desde otro aparato." : "No estás compartiendo la ubicación."; p.className = ""; }
    b.textContent = watchId !== null ? "Dejar de compartir" : "Compartir ubicación";
    b.className = watchId !== null ? "btn sec" : "btn";
  }
  async function sendLoc(pos, force) {
    const now = Date.now(), ll = { lat: pos.coords.latitude, lng: pos.coords.longitude }, acc = Math.round(pos.coords.accuracy || 9999);
    if (acc > 150) { gpsUI(`Ubicación imprecisa (±${acc} m), no se envió. Activa "Ubicación precisa" para este navegador.`, "bad"); return; }
    const moved = !lastPos || miles(lastPos, ll) * 1609 > 40;
    if (!force && (now - lastSent < 15000 || (!moved && now - lastSent < 60000))) return;
    lastSent = now; lastPos = ll;
    try {
      await db.doc(`restaurants/${S.my.id}`).update({ loc: { lat: ll.lat, lng: ll.lng, acc, updatedAt: now, sharing: true, stop: (($("#gpsStop") || {}).value || "").trim().slice(0, 60), hours: "" }, updatedAt: now });
      gpsUI(`Compartiendo · precisión ±${acc} m · ${new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`, "on");
    } catch (e) { console.error("OnRoute: ubicación", e); gpsUI("No se pudo guardar la ubicación. Revisa la conexión.", "bad"); }
  }
  async function startGps() {
    if (!navigator.geolocation) { gpsUI("Este navegador no tiene GPS.", "bad"); return; }
    let first = true; gpsUI("Buscando tu ubicación…");
    watchId = navigator.geolocation.watchPosition(p => { lastObj = p; sendLoc(p, first); first = false; }, err => {
      const m = { 1: "Diste que no al permiso de ubicación. Actívalo en la configuración del navegador.", 2: "No se pudo obtener la ubicación. Revisa que el GPS esté encendido.", 3: "El GPS tardó demasiado. Sigue intentando…" }[err.code] || "No se pudo obtener la ubicación.";
      if (err.code === 1) stopGps(true); gpsUI(m, "bad");
    }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 });
    beat = setInterval(() => { if (lastObj) sendLoc(lastObj, true); }, 120000);
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
    gpsUI("Buscando tu ubicación…");
  }
  async function stopGps(silent) {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null; clearInterval(beat); beat = null; lastObj = null; lastPos = null;
    try { if (wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (e) {}
    if (!silent && S.my && S.my.loc) { try { await db.doc(`restaurants/${S.my.id}`).update({ loc: { ...S.my.loc, sharing: false }, updatedAt: Date.now() }); } catch (e) {} }
    gpsUI();
  }
  document.addEventListener("visibilitychange", async () => { if (watchId !== null && document.visibilityState === "visible" && navigator.wakeLock) { try { wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {} } });

  async function setStatus(id, status) {
    try { await db.doc(`restaurants/${id}`).update({ status }); toast(status === "active" ? "Negocio aprobado y publicado." : "Negocio suspendido."); S.stats = null; }
    catch (e) { console.error("OnRoute: estado", e); toast("No se pudo cambiar el estado."); }
  }
  const LEGACY_TT = [
    ["orig", "Tortas", "Original Torta Tortuga", "1 aguacate entero, 3 carnes (jamón, queso de puerco y pavo), tomate, cebolla, mayo y queso fresco", [["Triple carne", "9 rebanadas", 17], ["Doble carne", "6 rebanadas", 16], ["Sencilla", "3 rebanadas", 14]]],
    ["turkey", "Tortas", "Turkey Tortuga", "1 aguacate entero, jamón de pavo, tomate, cebolla, mayo y queso fresco", [["Triple carne", "9 rebanadas", 17], ["Doble carne", "6 rebanadas", 16], ["Sencilla", "3 rebanadas", 14]]],
    ["pork", "Tortas", "Pork Tortuga", "1 aguacate entero, queso de puerco, tomate, cebolla, mayo y queso fresco", [["Triple carne", "12 rebanadas", 17], ["Doble carne", "8 rebanadas", 16], ["Sencilla", "4 rebanadas", 14]]],
    ["shrimp", "Tortas", "Shrimp Tortuga", "1 aguacate entero, 3 carnes con camarón (pavo, jamón y queso de puerco), mayo y queso", [["Sencilla", "3 reb. + 5 camarones", 16], ["Doble camarón", "3 reb. + 10 camarones", 19]]],
    ["allmeat", "Tortas", "All Meat Tortuga", "3 carnes: pavo, jamón y queso de puerco, con mayo y queso", [["Triple carne", "12 rebanadas", 17], ["Doble carne", "9 rebanadas", 16], ["Sencilla", "6 rebanadas", 14]]],
    ["vegan", "Vegana y niños", "Vegan Tortuga", "1½ aguacate, mayo, tomate y cebolla", [["Combo", "", 13]]],
    ["kids", "Vegana y niños", "Kids Tortuga", "Jamón y mayo", [["Sencilla", "3 rebanadas", 8], ["Doble", "6 rebanadas", 10], ["Triple", "9 rebanadas", 12]]],
  ].map(([id, cat, name, desc, opts]) => ({ id, cat, name, desc, photo: "", soldOut: false, opts: opts.map(([label, detail, price]) => ({ label, detail, price })) }));
  async function importLegacy() {
    try {
      const d = await db.doc("settings/menu").get();
      const old = d.exists ? normMenu(d.data().items) : [];
      const items = (old.length ? old : LEGACY_TT).map(m => ({ id: m.id, cat: m.cat, name: m.name, desc: m.desc, photo: m.photo || "", soldOut: !!m.soldOut, opts: m.opts }));
      await db.doc(`restaurants/${S.my.id}/menu/main`).set({ items, updatedAt: Date.now() });
      await db.doc(`restaurants/${S.my.id}`).update({ variant: { label: "Solo torta (sin combo)", discount: 1 }, menuNote: "Combo incluye Coca-Cola y Lay's. Precios con impuesto incluido.", updatedAt: Date.now() });
      S.meDraft = null; S.meCfg = null; S.meDirty = false; S.ktab = "menu"; toast(`Menú importado: ${items.length} platillos.`); go("panel");
    } catch (e) { console.error("OnRoute: importar", e); toast("No se pudo importar el menú."); }
  }

  // ================================================================ CUENTA DEL CLIENTE
  const isFav = rid => !!(S.profile && Array.isArray(S.profile.favorites) && S.profile.favorites.includes(rid));
  async function toggleFav(rid) {
    if (!S.user) { S.returnTo = { name: "rest", rid }; S.authRole = "customer"; toast("Crea tu cuenta o entra para guardar tus favoritos."); go("account"); return; }
    const favs = (S.profile && Array.isArray(S.profile.favorites) ? S.profile.favorites : []).filter(x => x !== rid);
    if (!isFav(rid)) favs.unshift(rid);
    try { await db.doc(`users/${S.user.uid}`).update({ favorites: favs.slice(0, 50) }); toast(isFav(rid) ? "Quitado de favoritos." : "Guardado en favoritos."); }
    catch (e) { toast("No se pudo guardar. Revisa la conexión."); }
  }
  function renderAccount() {
    const v = $("#vAcct");
    if (!S.authReady || (S.user && (!S.profileReady || !S.myReady))) { v.innerHTML = `<div class="empty-box">Cargando…</div>`; return; }
    if (!S.user) { S.authRole = "customer"; v.innerHTML = `<div class="acct scroll"><div class="acct-in">${authHTML()}</div></div>`; return; }
    const P = S.profile || {}, role = roleOf();
    const tabs = [["orders", "Mis pedidos"], ["favs", "Favoritos"], ["data", "Mis datos"]];
    let body = "";
    if (S.atab === "orders") {
      body = !S.histReady ? `<div class="empty-box">Cargando…</div>` : !S.hist.length
        ? `<div class="empty-cart"><h2>Todavía no tienes pedidos</h2><p>Cuando pidas con tu cuenta, aquí verás tu historial de todos los negocios.</p><p style="margin-top:12px"><a class="btn dark" href="./" data-nav="home">Explorar negocios</a></p></div>`
        : `<div class="ohist">${S.hist.map(o => `<div class="ocard"><div class="o-h"><b>${esc(o.rname || o.rid)}</b><span class="hint">${new Date(o.createdAt).toLocaleDateString("es-US", { day: "numeric", month: "short" })} · ${new Date(o.createdAt).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit" })}</span></div>
            <p class="hint">#${esc(o.num)} · ${esc((o.items || []).map(it => `${num(Number(it.qty))} × ${it.name}`).join(", "))}</p>
            <div class="o-f"><span class="mono" style="font-weight:800">${money(o.total)}</span><span class="paychip ${o.pay === "card" ? "paid" : ""}">${o.pay === "card" ? "Tarjeta" : "Al recoger"}</span><span class="grow"></span>
            <button class="btn sec sm" data-track="${esc(o.rid)}|${esc(o.id)}">Ver estado</button>${o.cart ? `<button class="btn sm" data-again="${esc(o.id)}">Pedir otra vez</button>` : ""}</div></div>`).join("")}</div>`;
    } else if (S.atab === "favs") {
      const favs = (P.favorites || []).map(id => S.rests.find(r => r.id === id)).filter(Boolean);
      body = !S.restsReady ? `<div class="empty-box">Cargando…</div>` : !favs.length
        ? `<div class="empty-cart"><h2>Sin favoritos todavía</h2><p>Toca "♡ Guardar" en la página de un negocio para tenerlo aquí.</p></div>`
        : `<div class="cards">${favs.map(r => `<a class="rcard" href="./?r=${esc(r.id)}" data-rest="${esc(r.id)}">${logoHTML(r)}<div style="min-width:0"><h3>${esc(r.name)}</h3><p class="meta">${esc(KIND[r.kind] || "")}${r.cuisine ? " · " + esc(r.cuisine) : ""}</p></div><div class="side"><span class="chip cdot ${isOpen(r) ? "open" : "closed"}">${esc(openText(r))}</span></div></a>`).join("")}</div>`;
    } else {
      body = `<div class="kbox"><div class="field"><label for="acName">Nombre</label><input id="acName" maxlength="60" value="${esc(P.name || "")}"></div>
        <div class="field"><label for="acPhone">Teléfono (opcional)</label><input id="acPhone" maxlength="30" inputmode="tel" value="${esc(P.phone || "")}"></div>
        <p class="hint">Correo: ${esc(S.user.email || "")}</p>
        ${S.acctMsg ? `<p class="${/No se pudo/.test(S.acctMsg) ? "err" : "ok-msg"}">${esc(S.acctMsg)}</p>` : ""}
        <div class="btns" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="saveacct">Guardar</button><button class="btn sec" data-auth="logout">Cerrar sesión</button></div></div>
        <div class="dir-join"><div><b>¿Tienes un food truck o restaurante?</b><span>Regístralo con esta misma cuenta.</span></div><a class="btn green sm" href="./#panel" data-pick="negocio">${role === "business" ? "Ir a mi negocio" : "Registrar mi negocio"}</a></div>`;
    }
    v.innerHTML = `<div class="acct scroll"><div class="acct-in">
      <div class="acct-head"><div><h1>Hola${P.name ? ", " + esc(P.name.split(" ")[0]) : ""}</h1><p class="hint">${role === "business" ? "Cuenta de negocio" : "Cuenta de cliente"} · ${esc(S.user.email || "")}</p></div>
        ${role === "business" ? `<a class="btn dark sm" href="./#panel" data-nav="panel">Ir a Mi negocio</a>` : ""}</div>
      <div class="seg" role="tablist" aria-label="Mi cuenta">${tabs.map(([k, l]) => `<button role="tab" data-atab="${k}" aria-pressed="${S.atab === k}">${l}</button>`).join("")}</div>
      ${body}</div></div>`;
  }
  async function saveAcct() {
    const name = (($("#acName") || {}).value || "").trim().slice(0, 60), phone = (($("#acPhone") || {}).value || "").trim().slice(0, 30);
    try { await db.doc(`users/${S.user.uid}`).update({ name, phone }); S.acctMsg = "Datos guardados."; }
    catch (e) { S.acctMsg = "No se pudo guardar. Revisa la conexión."; }
    paint(renderAccount);
  }

  // ================================================================ ADMINISTRACIÓN (solo Hector)
  function renderAdmin() {
    const v = $("#vAdmin");
    const head = `<div class="p-head"><h2>Administración de OnRoute</h2><span class="grow"></span>${S.user ? `<span class="hint">${esc(S.user.email || "")}</span>` : ""}</div>`;
    if (!S.authReady || (S.user && !S.profileReady)) { v.innerHTML = `<div class="panel">${head}<div class="empty-box">Cargando…</div></div>`; return; }
    if (!S.user) { S.authRole = S.authRole || "business"; v.innerHTML = `<div class="panel">${head}<div class="p-auth scroll">${authHTML()}</div></div>`; return; }
    if (!S.isAdmin) { v.innerHTML = `<div class="panel">${head}<div class="p-auth"><div class="auth"><h3>Sin acceso</h3><p>Esta sección es solo para el administrador de OnRoute.</p><a class="btn sec" href="./" data-nav="home">Volver al inicio</a></div></div></div>`; return; }
    const tabs = [["sum", "Resumen", I.rep], ["biz", "Negocios", I.menu], ["drv", "Repartidores", I.car], ["dlv", "Entregas", I.pin], ["cli", "Clientes", I.prof], ["sup", "Soporte", I.help], ["tools", "Herramientas", I.adm]];
    if (v.dataset.built !== "1") {
      v.dataset.built = "1";
      v.innerHTML = `<div class="panel">${head}<div class="pbody"><div class="kpanel scroll narrow" id="aBody"></div>
        <nav class="knav" id="aNav" role="tablist" aria-label="Administración" style="--n:${tabs.length}">${tabs.map(t => `<button role="tab" data-admtab="${t[0]}">${t[2]}<span>${t[1]}</span>${t[0] === "biz" ? '<i class="badge" id="pendBadge" hidden></i>' : t[0] === "sup" ? '<i class="badge" id="supBadge" hidden></i>' : ""}</button>`).join("")}</nav></div></div>`;
    }
    $$("#aNav button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.admtab === S.admTab)));
    const pend = S.all.filter(r => r.status === "pending"), pb = $("#pendBadge");
    if (pb) { pb.hidden = !pend.length; pb.textContent = pend.length; }
    const supOpen = (S.sup || []).filter(x => x.status === "open"), sb = $("#supBadge");
    if (sb) { sb.hidden = !supOpen.length; sb.textContent = supOpen.length; }
    const el = $("#aBody");
    if (S.admTab === "sum") {
      const act = S.all.filter(r => r.status === "active"), cust = S.users.filter(u => u.role !== "business");
      const st = S.stats;
      el.innerHTML = `<div class="ptitle"><h3>Resumen de la plataforma</h3><p>Números en vivo de OnRoute.</p></div>
        <div class="tiles four">
          <div class="tile t-blue"><b class="mono">${act.length}</b><small>Negocios publicados</small></div>
          <div class="tile t-purple"><b class="mono">${pend.length}</b><small>En revisión</small></div>
          <div class="tile t-red"><b class="mono">${S.usersReady ? cust.length : "…"}</b><small>Clientes registrados</small></div>
          <div class="tile t-gold"><b class="mono">${st ? money(st.sales) : "—"}</b><small>Ventas de hoy${st ? ` · ${st.count} pedidos` : ""}</small></div>
        </div>
        <div class="kcard"><h4>Ventas de hoy por negocio</h4>${!st ? `<p class="hint">Toca el botón para contar los pedidos de hoy en todos los negocios.</p>` : !st.rows.length ? `<p class="hint">Hoy todavía no hay pedidos.</p>`
          : st.rows.map(r => `<div class="adm-row">${logoHTML(r.r)}<div style="min-width:0"><b>${esc(r.r.name)}</b><span>${r.count} pedidos</span></div><div class="acts"><b class="mono">${money(r.sales)}</b></div></div>`).join("")}
          <button class="btn sec sm" data-act="stats" style="margin-top:12px" ${S.statsBusy ? "disabled" : ""}>${S.statsBusy ? "Contando…" : st ? "Actualizar" : "Contar pedidos de hoy"}</button></div>
        ${S.drivers.some(d => d.status === "pending") ? `<div class="banner info"><span><b>${S.drivers.filter(d => d.status === "pending").length} repartidor(es) esperando aprobación.</b></span><button class="btn sm" data-admtab="drv">Revisar</button></div>` : ""}
        ${pend.length ? `<div class="banner info"><span><b>${pend.length} negocio${pend.length > 1 ? "s" : ""} esperando aprobación.</b></span><button class="btn sm" data-admtab="biz">Revisar</button></div>` : ""}`;
    } else if (S.admTab === "biz") {
      const order = { pending: 0, active: 1, suspended: 2 };
      const list = S.all.slice().sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || num(b.createdAt) - num(a.createdAt));
      const owner = id => { const u = S.users.find(x => x.id === id); return u ? (u.name || u.email || "") : ""; };
      el.innerHTML = `<div class="ptitle"><h3>Negocios</h3><p>Aprueba los negocios nuevos para que aparezcan en OnRoute, o suspende los que no cumplan.</p></div>
        <div class="kcard">${!S.allReady ? `<div class="empty">Cargando…</div>` : !list.length ? `<div class="empty">Todavía no hay negocios.</div>` : list.map(r => `<div class="adm-row">${logoHTML(r)}
          <div style="min-width:0"><b>${esc(r.name)}</b><span>${esc(KIND[r.kind] || "")}${r.cuisine ? " · " + esc(r.cuisine) : ""} · ${esc(r.id)}${owner(r.ownerUid) ? " · " + esc(owner(r.ownerUid)) : ""}${r.createdAt ? " · " + new Date(r.createdAt).toLocaleDateString("es-US") : ""}</span></div>
          <div class="acts">${statusChip(r.status)}<a class="btn sm sec" href="./?r=${esc(r.id)}" data-rest="${esc(r.id)}">Ver</a>
            ${r.status !== "active" ? `<button class="btn sm green" data-adm="active" data-id="${esc(r.id)}">Aprobar</button>` : `<button class="btn sm sec" data-adm="suspended" data-id="${esc(r.id)}">Suspender</button>`}</div></div>`).join("")}</div>`;
    } else if (S.admTab === "drv") {
      const order = { pending: 0, active: 1, suspended: 2 };
      const list = S.drivers.slice().sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || num(b.createdAt) - num(a.createdAt));
      if (!owedUnsub) owedUnsub = db.collection("deliveries").where("payout", "==", "manual").onSnapshot(sn => { S.owed = sn.docs.map(x => ({ id: x.id, ...x.data() })); paint(renderAdmin); }, e => { console.warn(e); S.owed = []; });
      const owed = {}; (S.owed || []).forEach(x => { const o = owed[x.driverUid] = owed[x.driverUid] || { n: 0, sum: 0, ids: [] }; o.n++; o.sum = r2(o.sum + (Number(x.driverPay) || 0)); o.ids.push(x.id); });
      const dname = id => { const d = S.drivers.find(x => x.id === id); return d ? d : { name: id }; };
      el.innerHTML = `<div class="ptitle"><h3>Repartidores</h3><p>Revisa la licencia y los datos de cada repartidor antes de aprobarlo. Aprobado, elige cómo cobrar y puede recibir entregas.</p></div>
        ${Object.keys(owed).length ? `<div class="kcard"><h4>Pagos por enviar (Cash App, Zelle, Venmo)</h4><p class="hint">Mándales este dinero desde tu app y luego toca Marcar pagado. El dinero ya está en la cuenta de Stripe de OnRoute.</p>
          ${Object.entries(owed).map(([uid, o]) => { const d = dname(uid), P = d.payout || {}; return `<div class="adm-row drow"><span class="rlogo">${I.cash}</span><div style="min-width:0"><b>${esc(d.name || "")} · <span class="mono">${money(o.sum)}</span></b><span>${o.n} entrega${o.n === 1 ? "" : "s"} · ${P.app ? esc(PAY_APPS[P.app][0]) + ": " + esc(P.handle || "") : "sin método"}</span></div>
            <div class="acts"><button class="btn sm green" data-act="paidman" data-id="${esc(uid)}">Marcar pagado</button></div></div>`; }).join("")}</div>` : ""}
        <div class="kcard">${!S.driversReady ? `<div class="empty">Cargando…</div>` : !list.length ? `<div class="empty">Todavía no hay repartidores registrados.</div>` : list.map(d => { const V = d.vehicle || {}, days = licDays(d.licenseExpires), lic = S.licView && S.licView[d.id];
          return `<div class="adm-row drow"><span class="rlogo">${I.car}</span>
          <div style="min-width:0"><b>${esc(d.name || "")}</b><span>${esc(d.phone || "")} · ${esc(d.email || "")}</span>
            <span>${esc([V.make, V.model, V.year].filter(Boolean).join(" "))} · ${esc(V.color || "")} · ${esc(V.plate || "")}</span>
            <span>Licencia vence ${esc(d.licenseExpires || "?")}${days < 0 ? " · VENCIDA" : ""} · Cobra por: ${manualPay(d) ? esc(PAY_APPS[d.payout.app][0]) + " " + esc(d.payout.handle) : d.stripeReady ? "banco (Stripe)" : d.stripeAccount ? "banco (a medias)" : "sin elegir"}</span>
            ${lic ? `<img class="lic-img" src="${esc(lic)}" alt="Licencia de ${esc(d.name || "")}">` : ""}</div>
          <div class="acts">${statusChip(d.status)}<button class="btn sm sec" data-act="licview" data-id="${esc(d.id)}">${lic ? "Ocultar licencia" : "Ver licencia"}</button>
            ${d.status !== "active" ? `<button class="btn sm green" data-admdrv="active" data-id="${esc(d.id)}" ${days < 0 ? "disabled" : ""}>Aprobar</button>` : `<button class="btn sm sec" data-admdrv="suspended" data-id="${esc(d.id)}">Suspender</button>`}</div></div>`; }).join("")}</div>`;
    } else if (S.admTab === "dlv") {
      if (!admDlvUnsub) admDlvUnsub = db.collection("deliveries").orderBy("createdAt", "desc").limit(60).onSnapshot(sn => { S.admDlv = sn.docs.map(x => ({ id: x.id, ...x.data() })); paint(renderAdmin); }, e => { console.warn(e); S.admDlv = []; paint(renderAdmin); });
      const L2 = S.admDlv, lab = { searching: "Buscando repartidor", assigned: "Repartidor en camino al negocio", picked: "En camino al cliente", delivered: "Entregado" };
      const t0 = todayStart(), td = (L2 || []).filter(x => x.status === "delivered" && (x.deliveredAt || 0) >= t0);
      if (!ledUnsub) ledUnsub = db.collection("deliveries").where("payout", "==", "ledger").limit(500).onSnapshot(sn => { S.ledger = sn.docs.map(x => ({ id: x.id, ...x.data() })); paint(renderAdmin); }, e => { console.warn(e); S.ledger = []; });
      const bz = {}, dv = {};
      (S.ledger || []).forEach(x => { const st = x.settle || {};
        if (!x.settledBiz) { const o = bz[x.rid] = bz[x.rid] || { name: x.rname, sum: 0, ids: [] }; o.sum = r2(o.sum + num(st.biz)); o.ids.push(x.id); }
        if (!x.settledDrv && x.driverUid) { const o = dv[x.driverUid] = dv[x.driverUid] || { sum: 0, ids: [] }; o.sum = r2(o.sum + num(st.drv)); o.ids.push(x.id); } });
      const balRow = (key, kind, name, o, sub) => `<div class="adm-row drow"><span class="rlogo">${kind === "biz" ? I.store : I.car}</span><div style="min-width:0"><b>${esc(name)} · <span class="mono">${o.sum > 0 ? "te debe " + money(o.sum) : o.sum < 0 ? "le debes " + money(-o.sum) : "a mano"}</span></b><span>${o.ids.length} entrega${o.ids.length === 1 ? "" : "s"} pagada${o.ids.length === 1 ? "" : "s"} a mano${sub ? " · " + sub : ""}</span></div>
        <div class="acts"><button class="btn sm green" data-act="settle" data-kind="${kind}" data-id="${esc(key)}">Marcar saldado</button></div></div>`;
      const ledHTML = Object.keys(bz).length || Object.keys(dv).length ? `<div class="kcard"><h4>Saldos de pagos a mano (Zelle, Cash App, efectivo)</h4>
        <p class="hint">En entregas pagadas a mano el dinero no pasa por Stripe: el negocio recibe Zelle/Cash App y el repartidor cobra el efectivo. Aquí ves quién le debe a quién. Cuando se paguen (por Zelle, Cash App o en persona), toca <i>Marcar saldado</i>.</p>
        ${Object.entries(bz).map(([rid, o]) => balRow(rid, "biz", o.name || rid, o, "negocio")).join("")}
        ${Object.entries(dv).map(([uid, o]) => { const d = S.drivers.find(x => x.id === uid) || {}, P = d.payout || {}; return balRow(uid, "drv", d.name || "Repartidor", o, P.app ? esc(PAY_APPS[P.app][0]) + " " + esc(P.handle || "") : "repartidor"); }).join("")}</div>` : "";
      el.innerHTML = `<div class="ptitle"><h3>Entregas a domicilio</h3><p>Todas las entregas en vivo. OnRoute se queda con el ${Math.round((1 - DLV.driverShare) * 100)}% del envío; el repartidor recibe el resto más la propina.</p></div>
        <div class="tiles three"><div class="tile t-blue"><b class="mono">${(L2 || []).filter(x => x.status === "searching").length}</b><small>Buscando repartidor</small></div><div class="tile t-purple"><b class="mono">${(L2 || []).filter(x => ["assigned", "picked"].includes(x.status)).length}</b><small>En curso</small></div><div class="tile t-gold"><b class="mono">${money(td.reduce((n, x) => n + (x.fee || 0) * (1 - DLV.driverShare), 0))}</b><small>Ganancia de OnRoute hoy</small></div></div>
        ${ledHTML}
        <div class="kcard">${!L2 ? `<div class="empty">Cargando…</div>` : !L2.length ? `<div class="empty">Todavía no hay entregas.</div>` : L2.map(x => `<div class="adm-row drow"><span class="rlogo">${I.car}</span>
          <div style="min-width:0"><b>${esc(x.rname)} · #${esc(x.num)}</b><span>${esc(lab[x.status] || x.status)}${x.driverName ? " · " + esc(x.driverName) : ""} · ${x.miles ? x.miles.toFixed(1) + " mi" : ""} · ${ago(x.createdAt || 0)}</span>
            <span>${x.pay === "manual" ? `A mano${x.collect ? " · efectivo " + money(x.collect) : ""} · ` : ""}Envío ${money(x.fee || 0)} · propina ${money(x.tip || 0)} · al repartidor ${money(x.driverPay || 0)}${x.status === "delivered" ? ` · pago: ${x.payout === "paid" ? "hecho" : x.payout === "ledger" ? "en saldos" : x.payout === "settled" ? "saldado" : "pendiente"}${x.payoutErr ? " (" + esc(x.payoutErr) + ")" : ""}` : ""}</span></div>
          <div class="acts">${x.status === "searching" && Date.now() - (x.createdAt || 0) > 20 * 60000 ? `<span class="chip">Más de 20 min sin repartidor</span>` : ""}</div></div>`).join("")}</div>`;
    } else if (S.admTab === "sup") {
      const L3 = (S.sup || []).slice().sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || num(b.createdAt) - num(a.createdAt));
      el.innerHTML = `<div class="ptitle"><h3>Soporte</h3><p>Reportes que mandan clientes, negocios y repartidores desde <i>Contacto y soporte</i>. Respóndeles aquí: la respuesta les aparece en la app.</p></div>
        <div class="tiles three"><div class="tile t-red"><b class="mono">${supOpen.length}</b><small>Abiertos</small></div><div class="tile t-blue"><b class="mono">${L3.filter(x => x.status !== "open").length}</b><small>Resueltos</small></div><div class="tile t-gold"><b class="mono">${L3.filter(x => num(x.createdAt) >= todayStart()).length}</b><small>Hoy</small></div></div>
        <div class="kcard">${!S.supReady ? `<div class="empty">Cargando…</div>` : !L3.length ? `<div class="empty">No hay reportes. 🎉</div>` : L3.map(x => `<div class="sup-row ${x.status === "open" ? "open" : ""}">
          <div class="sup-h"><b>${esc(SUP_TOPICS[x.topic] || x.topic)}${x.ref ? " · pedido " + esc(x.ref) : ""}</b><span class="chip cdot ${x.status === "open" ? "closed" : "open"}">${x.status === "open" ? "Abierto" : "Resuelto"}</span></div>
          <span class="hint">${esc(x.name || "")} · ${x.email ? `<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>` : "sin correo"} · ${esc(x.mode || "")} · ${ago(num(x.createdAt))}${x.uid ? "" : " · invitado"}</span>
          <p class="sup-msg">${esc(x.msg)}</p>
          ${x.reply ? `<p class="sup-reply"><b>Tu respuesta:</b> ${esc(x.reply)}</p>` : ""}
          ${x.status === "open" ? `<textarea id="supR-${esc(x.id)}" rows="2" maxlength="2000" placeholder="Escribe una respuesta (opcional)"></textarea>
            <div class="acts"><button class="btn sm green" data-supdone="${esc(x.id)}" data-st="done">Responder y marcar resuelto</button></div>`
          : `<div class="acts"><button class="btn sm sec" data-supdone="${esc(x.id)}" data-st="open">Reabrir</button></div>`}</div>`).join("")}</div>`;
    } else if (S.admTab === "cli") {
      const list = S.users.slice().sort((a, b) => num(b.createdAt) - num(a.createdAt));
      el.innerHTML = `<div class="ptitle"><h3>Usuarios registrados</h3><p>${list.filter(u => u.role !== "business").length} clientes · ${list.filter(u => u.role === "business").length} negocios</p></div>
        <div class="kcard">${!S.usersReady ? `<div class="empty">Cargando…</div>` : !list.length ? `<div class="empty">Todavía no hay usuarios.</div>` : list.map(u => `<div class="adm-row"><span class="rlogo">${esc(initials(u.name || u.email))}</span>
          <div style="min-width:0"><b>${esc(u.name || "(sin nombre)")}</b><span>${esc(u.email || "")}${u.createdAt ? " · desde " + new Date(u.createdAt).toLocaleDateString("es-US") : ""}</span></div>
          <div class="acts"><span class="chip ${u.role === "business" ? "info" : ""}">${u.role === "business" ? "Negocio" : "Cliente"}</span></div></div>`).join("")}</div>`;
    } else {
      el.innerHTML = `<div class="ptitle"><h3>Herramientas</h3></div>
        <div class="kcard" style="display:flex;flex-direction:column;gap:10px"><h4>Datos de la versión anterior</h4>
        ${S.my ? `<p class="hint">Copia el menú que tenía Tortas Tortuga en la primera versión de OnRoute (precios, opciones A/B/C y "Solo torta −$1") a tu negocio <b>${esc(S.my.name)}</b>. Reemplaza el menú actual de ese negocio.</p>
          <button class="btn sec sm" data-act="import" style="align-self:flex-start">Importar menú de Tortas Tortuga</button>`
        : `<p class="hint">Primero registra tu negocio en <a href="./#panel" data-nav="panel">Mi negocio</a> para poder importar el menú de Tortas Tortuga.</p>`}</div>`;
    }
  }
  async function settleLedger(kind, key) {
    const list = (S.ledger || []).filter(x => kind === "biz" ? x.rid === key && !x.settledBiz : x.driverUid === key && !x.settledDrv);
    if (!list.length || !confirm(`¿Marcar como saldadas ${list.length} entrega(s)? Hazlo cuando ya se haya pagado el dinero.`)) return;
    try {
      const b = db.batch ? db.batch() : null, now = Date.now();
      for (const x of list) {
        const upd = kind === "biz" ? { settledBiz: true } : { settledDrv: true };
        if (kind === "biz" ? x.settledDrv : x.settledBiz) { upd.payout = "settled"; upd.payoutAt = now; }
        if (b) b.update(db.doc(`deliveries/${x.id}`), upd); else await db.doc(`deliveries/${x.id}`).update(upd);
      }
      if (b) await b.commit();
      toast("Saldo marcado como pagado.");
    } catch (e) { console.error(e); toast("No se pudo guardar."); }
  }
  async function loadStats() {
    S.statsBusy = true; paint(renderAdmin);
    const t0 = todayStart(), rows = [];
    try {
      for (const r of S.all.filter(x => x.status === "active")) {
        const snap = await db.collection(`restaurants/${r.id}/orders`).where("createdAt", ">=", t0).get();
        const os = snap.docs.map(d => d.data()).filter(o => o.createdAt >= t0 && !["pending", "cancelled", "await"].includes(o.status));
        if (os.length) rows.push({ r, count: os.length, sales: os.reduce((a, o) => a + num(o.total), 0) });
      }
      rows.sort((a, b) => b.sales - a.sales);
      S.stats = { rows, count: rows.reduce((a, x) => a + x.count, 0), sales: rows.reduce((a, x) => a + x.sales, 0) };
    } catch (e) { console.error("OnRoute: estadísticas", e); toast("No se pudieron contar los pedidos."); }
    S.statsBusy = false; paint(renderAdmin);
  }

  // ================================================================ eventos
  // El navegador solo deja sonar audio después de un toque: se prepara con el primero.
  document.addEventListener("pointerdown", () => { if (S.route.name === "rest") unlockAudio(); }, { passive: true });
  document.addEventListener("click", e => {
    const t = e.target.closest("a,button,[data-act]");
    if (!t) return;
    const d = t.dataset;
    if (d.act === "menu") { S.drawer ? closeDrawer() : openDrawer(); return; }
    if (t.closest("#drawer")) closeDrawer();
    if (d.help !== undefined) { e.preventDefault(); go("help", d.help); return; }
    if (d.act === "install") { installApp(); return; }
    if (d.act === "share") { shareApp(); return; }
    if (d.act === "sup") { sendSupport(); return; }
    if (d.act === "supnew") { S.supSent = false; paintSupport(); return; }
    if (d.supdone) { supUpdate(d.supdone, d.st); return; }
    if (d.pick) { e.preventDefault(); setMode(d.pick); return; }
    if (d.chat) {
      const oid = d.chat, r = S.route.name;
      if (r === "panel") { const o = S.orders.find(x => x.id === oid); if (!o) return; const chs = o.delivery && o.delivery.driverName ? ["cb", "db"] : ["cb"];
        openChat({ rid: S.my.id, oid, role: "business", chs, ch: chs.find(ch => unread(oid, ch, "business")) || d.ch || "cb", num: o.num, title: o.who }); }
      else if (r === "driver") { const C = S.cur; if (!C) return; const chs = C.status === "picked" ? ["dc", "db"] : ["db", "dc"]; openChat({ rid: C.rid, oid, role: "driver", chs, ch: d.ch, num: C.num, title: d.ch === "dc" ? "Cliente" : C.rname }); }
      else { const o = S.mine; if (!o) return; const chs = o.delivery && (["assigned", "picked"].includes(o.delivery.status) || (chatData[ckey(oid, "dc")] || []).length) ? ["dc", "cb"] : ["cb"]; openChat({ rid: S.rid, oid, role: "customer", chs, ch: d.ch, num: o.num, title: S.R ? S.R.name : "Mensajes" }); }
      return;
    }
    if (d.chtab) { S.chat.ch = d.chtab; markSeen(); renderChat(); chatRepaint(); return; }
    if (d.quick) { chatSend(d.quick); return; }
    if (d.act === "chatclose") { S.chat = null; renderChat(); chatRepaint(); return; }
    if (d.nav) { e.preventDefault(); go(d.nav); return; }
    if (d.rest) { e.preventDefault(); go("rest", d.rest); return; }
    if (d.copy) { const v = d.copy; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast("Enlace copiado.")).catch(() => toast(v)); return; }
    // Explorar
    if (d.filter) { S.filter = d.filter; paint(renderHome); return; }
    if (d.dirmode) { S.dirMode = d.dirmode; paint(renderHome); setTimeout(() => dirMap && dirMap.invalidateSize(), 50); return; }
    if (d.act === "locate") { locate(false); return; }
    // Negocio (cliente)
    if (d.cat) { S.cat = d.cat; paint(renderRest); return; }
    if (d.opt) { const [id, j] = d.opt.split("|"); S.pick[id] = Number(j); paint(renderRest); return; }
    if (d.xtra) { const [mid, eid] = d.xtra.split("|"); const cur = S.esel[mid] || []; S.esel[mid] = cur.includes(eid) ? cur.filter(x => x !== eid) : cur.concat(eid); paint(renderRest); return; }
    if (d.add) { const m = S.Rmenu.find(x => x.id === d.add); if (!m) return; const ex = itemExtras(m).map(e => e.id).filter(id => (S.esel[m.id] || []).includes(id)).sort().join("."); const k = `${m.id}|${Math.min(Number(S.pick[m.id] || 0), m.opts.length - 1)}|${variantOf(S.R) && S.vsel[m.id] ? 1 : 0}${ex ? "|" + ex : ""}`; S.esel[m.id] = []; S.cart[k] = Math.min(20, (S.cart[k] || 0) + 1); if (S.view === "status") S.view = "menu"; paint(renderRest); return; }
    if (d.inc) { S.cart[d.inc] = Math.min(20, (S.cart[d.inc] || 0) + 1); paint(renderRest); return; }
    if (d.dec) { S.cart[d.dec]--; if (S.cart[d.dec] <= 0) delete S.cart[d.dec]; if (!cartCount()) S.view = "menu"; paint(renderRest); return; }
    if (t.id === "cartbar") { S.view = "cart"; paint(renderRest); const c = $("#client"); if (c) c.scrollTop = 0; return; }
    if (d.act === "tomenu") { S.view = "menu"; paint(renderRest); return; }
    if (d.act === "neworder") { S.view = "menu"; S.myOrder = null; S.mine = null; if (mineUnsub) { mineUnsub(); mineUnsub = null; } ss.del(`onroute-my-${S.rid}`); paint(renderRest); return; }
    if (d.act === "repeat") { const L0 = getLast(S.rid); if (!L0) return; S.cart = { ...L0.cart }; if (L0.name && !S.name) S.name = L0.name; S.view = "cart"; paint(renderRest); return; }
    if (d.pickup) { S.pickup = d.pickup; paint(renderRest); return; }
    if (d.recv) { S.recv = d.recv; S.payErr = ""; if (!S.dlv) S.dlv = ls.get("onroute-dlv", null) || {}; paint(renderRest); return; }
    if (d.tip !== undefined && t.closest(".tips")) { S.tip = Number(d.tip) || 0; paint(renderRest); return; }
    if (d.sug !== undefined) { const x = (S.dlvSug || [])[Number(d.sug)]; if (x) { S.dlv = { ...(S.dlv || {}), address: x.label, lat: x.lat, lng: x.lng }; S.dlvSug = []; S.dlvMsg = ""; ls.set("onroute-dlv", S.dlv); paint(renderRest); } return; }
    if (d.act === "dlvhere") { dlvHere(); return; }
    if (d.paymode) { S.payMode = d.paymode; S.payErr = ""; paint(renderRest); return; }
    if (d.oact) { orderAct(d.id, d.oact); return; }
    if (d.act === "pay") { unlockAudio(); placeOrder(); return; }
    if (d.act === "notify") { askNotify(); return; }
    if (d.act === "promo") {
      const c = cleanCode(S.promoInput), p = promosOf(S.R).find(x => x.code && x.code === c);
      S.promoInput = c; S.promoOk = false;
      if (!c) { S.promoCode = ""; S.promoMsg = ""; }
      else if (!p) { S.promoCode = ""; S.promoMsg = "Ese código no existe o ya no está activo."; }
      else { S.promoCode = c; S.promoOk = subtotal() >= p.min; S.promoMsg = S.promoOk ? `Código aplicado: ${promoDesc(p)}.` : `Código válido: aplica en pedidos desde ${money(p.min)}.`; }
      paint(renderRest); return;
    }
    // Mi negocio
    if (d.auth) { authAction(d.auth); return; }
    if (d.authrole) { S.authRole = d.authrole; S.authName = (($("#authName") || {}).value || S.authName); S.authMsg = ""; if (S.route.name === "account") paint(renderAccount); else if (S.route.name === "admin") paint(renderAdmin); else paint(renderPanel); return; }
    if (d.atab) { S.atab = d.atab; S.acctMsg = ""; paint(renderAccount); return; }
    if (d.act === "saveacct") { saveAcct(); return; }
    if (d.act === "fav") { toggleFav(S.rid); return; }
    if (d.act === "loginreturn") { e.preventDefault(); S.returnTo = { name: "rest", rid: S.rid }; S.authRole = "customer"; go("account"); return; }
    if (d.track) { const [rid, oid] = d.track.split("|"); ss.set(`onroute-my-${rid}`, oid); go("rest", rid); return; }
    if (d.again) { const o = S.hist.find(x => x.id === d.again); if (o && o.cart) { ls.set(`onroute-last-${o.rid}`, { cart: o.cart, name: (S.profile && S.profile.name) || "", at: o.createdAt }); ss.del(`onroute-my-${o.rid}`); go("rest", o.rid); } return; }
    if (d.admtab) { S.admTab = d.admtab; paint(renderAdmin); return; }
    if (d.act === "stats") { loadStats(); return; }
    if (d.act === "settle") { settleLedger(d.kind, d.id); return; }
    if (d.regkind) { S.reg.kind = d.regkind; paint(renderPanel); return; }
    if (d.act === "register") { register(); return; }
    if (d.ktab) { S.ktab = d.ktab; if (d.ktab !== "menu") S.meMsg = ""; paint(renderPanel); setTimeout(() => pfMap && pfMap.invalidateSize(), 50); return; }
    if (d.adv) { advance(d.adv); return; }
    if (d.adm) { setStatus(d.id, d.adm); return; }
    if (d.act === "import") { importLegacy(); return; }
    if (d.act === "saveprof") { saveProf(); return; }
    if (d.act === "stripego") { stripeGo(); return; }
    if (d.act === "drvsave") { drvSave(); return; }
    if (d.dact) { drvAct(d.id, d.dact); return; }
    if (d.paypick) { S.payPick = d.paypick; paint(renderDriver); return; }
    if (d.payapp) { S.payApp = d.payapp; S.payHandle = null; paint(renderDriver); return; }
    if (d.act === "payuse") { drvPayUse(d.m); return; }
    if (d.act === "drvedit") { S.drvEdit = true; S.drvForm = null; S.drvMsg = ""; paint(renderDriver); return; }
    if (d.act === "drvstripe") { drvStripe("start"); return; }
    if (d.act === "drvstripechk") { drvStripe("status"); return; }
    if (d.act === "licview") {
      const id = d.id; S.licView = S.licView || {};
      if (S.licView[id]) { delete S.licView[id]; paint(renderAdmin); return; }
      db.doc(`drivers/${id}/docs/license`).get().then(x => { S.licView[id] = x.exists ? safeImg(x.data().data) || "" : ""; if (!S.licView[id]) toast("Este repartidor no subió foto."); paint(renderAdmin); }).catch(() => toast("No se pudo abrir la licencia."));
      return;
    }
    if (d.act === "paidman") {
      const ids = (S.owed || []).filter(x => x.driverUid === d.id).map(x => x.id), tot = r2((S.owed || []).filter(x => x.driverUid === d.id).reduce((n, x) => n + (Number(x.driverPay) || 0), 0));
      if (!ids.length || !confirm(`¿Ya le mandaste ${money(tot)}? Se marcarán ${ids.length} entrega(s) como pagadas.`)) return;
      Promise.all(ids.map(id => db.doc(`deliveries/${id}`).update({ payout: "paid_manual", payoutAt: Date.now() }))).then(() => toast("Pagos marcados.")).catch(e => { console.error(e); toast("No se pudo marcar. Revisa las reglas de Firestore."); });
      return;
    }
    if (d.admdrv) { db.doc(`drivers/${d.id}`).update({ status: d.admdrv }).then(() => toast(d.admdrv === "active" ? "Repartidor aprobado." : "Repartidor suspendido.")).catch(e => { console.error(e); toast("No se pudo cambiar. Revisa las reglas de Firestore."); }); return; }
    if (d.act === "stripechk") { stripeStatus(); return; }
    if (d.act === "hcopy") { pfEnsure(); const m = S.pf.hours[1]; if (m.closed) { toast("Primero abre el lunes."); return; } S.pf.hours = S.pf.hours.map(x => x.closed ? x : { open: m.open, close: m.close }); S.pfDirty = true; S.pfMsg = "Horario copiado. Toca Guardar perfil."; paint(renderProf); return; }
    if (d.act === "pfhere") { if (!navigator.geolocation) return toast("Este navegador no tiene GPS."); navigator.geolocation.getCurrentPosition(p => setPfPos(p.coords.latitude, p.coords.longitude), () => toast("No se pudo obtener tu ubicación."), { enableHighAccuracy: true, timeout: 15000 }); return; }
    if (d.pfkind) { pfEnsure(); S.pf.kind = d.pfkind; S.pfDirty = true; S.pfMsg = "Toca Guardar perfil para aplicar el cambio."; paint(renderProf); return; }
    if (d.act === "gps") { watchId === null ? startGps() : stopGps(); return; }
    if (d.me) {
      meEnsure();
      const box = t.closest(".me-item"), i = box ? Number(box.dataset.i) : -1, D = S.meDraft;
      if (d.me === "additem") { D.push({ id: "p" + Date.now().toString(36), cat: D.length ? D[D.length - 1].cat : "Platillos", name: "", desc: "", photo: "", soldOut: false, opts: [{ label: "", detail: "", price: 10 }] }); meTouch(); paint(renderMenuEd); const all = $$("#pMenu .me-item"), last = all[all.length - 1]; if (last) { last.scrollIntoView({ block: "center" }); const n = last.querySelector("[data-f=name]"); if (n) n.focus(); } return; }
      if (d.me === "addopt") { const m = D[i]; m.opts.push({ label: "", detail: "", price: m.opts[m.opts.length - 1].price }); meTouch(); paint(renderMenuEd); return; }
      if (d.me === "delopt") { D[i].opts.splice(Number(d.j), 1); meTouch(); paint(renderMenuEd); return; }
      if (d.me === "sold") { D[i].soldOut = !D[i].soldOut; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "noextras") { D[i].noExtras = !D[i].noExtras; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "addx") { S.meExtras.push({ id: "x" + Date.now().toString(36).slice(-6), label: "", price: 1 }); meTouch(); paint(renderMenuEd); const n = $(`#xl-${S.meExtras.length - 1}`); if (n) n.focus(); return; }
      if (d.me === "delx") { const k = Number(t.closest(".xrow").dataset.x); S.meExtras.splice(k, 1); meTouch(); paint(renderMenuEd); return; }
      if (d.me === "nophoto") { D[i].photo = ""; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "up" && i > 0) { [D[i - 1], D[i]] = [D[i], D[i - 1]]; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "down" && i < D.length - 1) { [D[i + 1], D[i]] = [D[i], D[i + 1]]; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "delitem") { if (d.armed !== "1") { t.dataset.armed = "1"; t.textContent = "Toca otra vez para eliminar"; setTimeout(() => { if (t.isConnected) { t.dataset.armed = ""; t.textContent = "Eliminar platillo"; } }, 4000); return; } D.splice(i, 1); meTouch(); paint(renderMenuEd); return; }
      if (d.me === "discard") { S.meDraft = null; S.meCfg = null; S.meExtras = null; S.meDirty = false; S.meMsg = ""; S.meMsgCls = ""; S.aiCheck = false; S.aiMsg = ""; paint(renderMenuEd); return; }
      if (d.me === "save") { meSave(); return; }
    }
    if (d.range) { S.hRange = d.range; renderRep(); return; }
    if (d.prt || d.prkind) {
      prEnsure();
      const box = t.closest(".pcard"), k = box ? Number(box.dataset.p) : -1, P = S.pr;
      if (d.prkind && P.promos[k]) { P.promos[k].kind = d.prkind; prTouch(); paint(renderPromos); return; }
      if (d.prt === "add") { P.promos.push({ id: "pr" + Date.now().toString(36), title: "", kind: "pct", value: 10, min: 0, code: "", on: true }); prTouch(); paint(renderPromos); const n = $(`#pt-${P.promos.length - 1}`); if (n) { n.scrollIntoView({ block: "center" }); n.focus(); } return; }
      if (d.prt === "on" && P.promos[k]) { P.promos[k].on = !P.promos[k].on; prTouch(); paint(renderPromos); return; }
      if (d.prt === "del" && P.promos[k]) { if (d.armed !== "1") { t.dataset.armed = "1"; t.textContent = "Toca otra vez para eliminar"; setTimeout(() => { if (t.isConnected) { t.dataset.armed = ""; t.textContent = "Eliminar"; } }, 4000); return; } P.promos.splice(k, 1); prTouch(); paint(renderPromos); return; }
      if (d.prt === "discard") { S.pr = null; S.prDirty = false; S.prMsg = ""; S.prCls = ""; paint(renderPromos); return; }
      if (d.prt === "save") { savePromos(); return; }
    }
  });
  document.addEventListener("input", e => {
    const t = e.target, d = t.dataset;
    if (t.id === "nameInput") { S.name = t.value; return; }
    if (t.id === "noteInput") { S.note = t.value; return; }
    if (t.id === "splitAmt") { S.split = { ...(S.split || {}), amt: t.value.replace(/[^0-9.]/g, "") }; const { tot } = cartTotals(), a = r2(num(Number(S.split.amt))), r = $("#splitRest"); if (r) r.textContent = a > 0 && tot - a > 0 ? money(r2(tot - a)) : "el resto"; return; }
    if (t.id === "chatIn") { S.chatDraft = t.value; return; }
    if (t.id === "dlvAddr") { S.dlv = { ...(S.dlv || {}), address: t.value }; delete S.dlv.lat; delete S.dlv.lng; addrSearch(t.value); return; }
    if (d.dlv) { S.dlv = { ...(S.dlv || {}), [d.dlv]: t.value }; return; }
    if (t.id === "promoInput") { S.promoInput = t.value; return; }
    if (d.pr) { prEnsure(); const p = S.pr.promos[Number(t.closest(".pcard").dataset.p)]; if (p) p[d.pr] = d.pr === "code" ? cleanCode(t.value) : t.value; t.classList.remove("bad"); prTouch(); return; }
    if (d.loy) { prEnsure(); S.pr.loyalty[d.loy] = t.value; t.classList.remove("bad"); prTouch(); return; }
    if (d.reg) { S.reg[d.reg] = t.value; if (d.reg === "name") { const s = $(".slug"); if (s) s.textContent = `Tu enlace: ${BASE}?r=${slugify(t.value) || "tu-negocio"}`; } return; }
    if (d.pf) { pfEnsure(); S.pf[d.pf] = t.value; S.pfDirty = true; return; }
    if (d.df) { drvEnsure()[d.df] = t.value; return; }
    if (t.id === "payHandle") { S.payHandle = t.value; return; }
    if (d.ht !== undefined) { pfEnsure(); const day = S.pf.hours[Number(d.ht)]; if (okT(t.value)) { day[d.hk] = t.value; S.pfDirty = true; $("#pfHours").dataset.v = JSON.stringify(S.pf.hours); } return; }
    if (d.cfg) { meEnsure(); S.meCfg[d.cfg] = t.value; t.classList.remove("bad"); meTouch(); return; }
    if (d.xf) { meEnsure(); const k = Number(t.closest(".xrow").dataset.x); S.meExtras[k][d.xf] = t.value; t.classList.remove("bad"); meTouch(); return; }
    const box = t.closest && t.closest(".me-item");
    if (box && S.meDraft) {
      const m = S.meDraft[Number(box.dataset.i)]; if (!m) return;
      if (d.f) m[d.f] = t.value;
      else if (d.of) m.opts[Number(d.j)][d.of] = d.of === "price" ? t.value : t.value;
      t.classList.remove("bad"); meTouch();
    }
  });
  document.addEventListener("change", e => {
    const t = e.target, d = t.dataset;
    if (d.vari) { S.vsel[d.vari] = t.checked; paint(renderRest); return; }
    if (d.da) { drvEnsure().attest[d.da] = t.checked; return; }
    if (t.id === "drvOnline") { drvSetOnline(t.checked); return; }
    if (d.df && t.type === "date") { drvEnsure()[d.df] = t.value; return; }
    if (t.id === "drvLicIn") {
      const f = t.files && t.files[0]; t.value = ""; if (!f) return;
      S.drvMsg = "Preparando la foto…"; paint(renderDriver);
      toDataUrl(f, 1400, 380000).then(u => { S.drvLic = u; S.drvMsg = ""; paint(renderDriver); }).catch(e => { S.drvMsg = photoErr(e); paint(renderDriver); });
      return;
    }
    if (t.id === "splitA" || t.id === "splitB") { S.split = { ...(S.split || {}), [t.id === "splitA" ? "a" : "b"]: t.value }; paint(renderRest); return; }
    if (t.id === "pfCash" || t.id === "pfCashDlv") { pfEnsure(); S.pf[t.id === "pfCash" ? "payCash" : "payCashDlv"] = t.checked; S.pfDirty = true; S.pfMsg = "Toca Guardar perfil para aplicar los cambios."; paint(renderProf); return; }
    if (t.id === "pfDlvOn") { pfEnsure(); S.pf.dlvOn = t.checked; S.pfDirty = true; paint(renderProf); return; }
    if (t.id === "pfDlvR") { pfEnsure(); S.pf.dlvRadius = Number(t.value) || 5; S.pfDirty = true; paint(renderProf); return; }
    if (d.hopen !== undefined) { pfEnsure(); S.pf.hours[Number(d.hopen)] = t.checked ? { open: "10:00", close: "18:00" } : { closed: true }; S.pfDirty = true; S.pfMsg = "Toca Guardar perfil para aplicar el horario."; paint(renderProf); return; }
    if (d.photo !== undefined && t.type === "file") { onPhoto(t); return; }
    if (t.id === "aiIn") { onMenuPhotos(t); return; }
    if (t.id === "loyOn") { prEnsure(); S.pr.loyalty.on = t.checked; prTouch(); paint(renderPromos); return; }
  });
  document.addEventListener("click", e => {
    if (e.target && e.target.id === "drawer") { closeDrawer(); return; }
    if (e.target && e.target.id === "chatSheet") { S.chat = null; renderChat(); chatRepaint(); return; }
    if (e.target && e.target.closest && e.target.closest("#toast") && S.toastChat) { const t = S.toastChat, b = document.querySelector(`[data-chat="${t.oid}"]`); S.toastChat = null; if (b) { b.dataset.ch = t.ch; b.click(); } }
  });
  document.addEventListener("submit", e => { if (e.target.dataset && e.target.dataset.chatform) { e.preventDefault(); chatSend(($("#chatIn") || {}).value); } });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && S.drawer) { closeDrawer(); const b = $("#menuBtn"); if (b) b.focus(); return; }
    if (e.key === "Escape" && S.chat) { S.chat = null; renderChat(); chatRepaint(); return; }
    if (e.key === "Enter" && (e.target.id === "authPass" || e.target.id === "authEmail")) { e.preventDefault(); authAction("login"); }
    if (e.key === "Enter" && e.target.id === "dlvAddr") { e.preventDefault(); const b = $("#dlvSug [data-sug='0']"); if (b) b.click(); }
    if (e.key === "Enter" && e.target.id === "promoInput") { e.preventDefault(); const b = $("[data-act=promo]"); if (b) b.click(); }
  });
  window.addEventListener("beforeunload", e => { if (S.meDirty || S.prDirty || watchId !== null) { e.preventDefault(); e.returnValue = ""; } });
  setInterval(() => { if (S.route.name === "panel" && S.ktab === "orders" && S.my) paint(renderOrders); if (S.route.name === "rest" && S.R) paint(renderRest); if (S.route.name === "home") paint(renderHome); }, 60000);

  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  // Enlaces viejos de la primera versión
  if (location.hash === "#cliente") history.replaceState(null, "", BASE + location.search);
  initAuth();
  route();
})();
