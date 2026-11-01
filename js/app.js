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
  };

  let toastT = null;
  function toast(msg) { const t = $("#toast"); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 5000); }
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
  const cardOn = () => !!(window.ONROUTE_CARD_PAYMENTS && window.ONROUTE_API);

  // ---------------------------------------------------------------- estado
  const S = {
    route: { name: "home" },
    // Explorar
    rests: [], restsReady: false, dirErr: false, me: ls.get("onroute-me"), locMsg: "", q: "", filter: "all", dirMode: "list", hover: null,
    // Página de un negocio
    rid: null, R: null, Rerr: null, Rmenu: [], RmenuReady: false,
    cart: {}, pick: {}, vsel: {}, cat: "", view: "menu", pickup: "asap", name: ls.get("onroute-name", ""), payMode: "card",
    busy: false, payErr: "", myOrder: null, mine: null, mineReady: false,
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
        photo: safePhoto(x.photo), soldOut: !!x.soldOut,
        opts: x.opts.map(o => (Array.isArray(o) ? { label: String(o[1] || ""), detail: String(o[2] || ""), price: num(Number(o[3])) } : { label: String(o.label || ""), detail: String(o.detail || ""), price: num(Number(o.price)) })),
      }));
  }
  const variantOf = R => (R && R.variant && R.variant.label && num(R.variant.discount) > 0 ? { label: String(R.variant.label), discount: num(R.variant.discount) } : null);
  const menuCats = menu => { const c = []; menu.forEach(m => { if (!c.includes(m.cat)) c.push(m.cat); }); return c; };
  function parseKey(k, menu = S.Rmenu, R = S.R) {
    const [id, oi, v] = k.split("|");
    const m = menu.find(x => x.id === id); if (!m) throw new Error("gone");
    const o = m.opts[Number(oi)]; if (!o) throw new Error("gone");
    const vr = v === "1" ? variantOf(R) : null; if (v === "1" && !vr) throw new Error("gone");
    const price = Math.round((o.price - (vr ? vr.discount : 0)) * 100) / 100;
    const label = `${m.name}${m.opts.length > 1 ? " · " + o.label : ""}${vr ? " · " + vr.label : ""}`;
    return { m, o, oi: Number(oi), v: !!vr, price, label };
  }
  const cartCount = () => Object.values(S.cart).reduce((a, b) => a + b, 0);
  const subtotal = () => Object.entries(S.cart).reduce((a, [k, q]) => { try { return a + parseKey(k).price * q; } catch (e) { return a; } }, 0);
  function pruneCart() { for (const k of Object.keys(S.cart)) { try { const p = parseKey(k); if (p.m.soldOut) delete S.cart[k]; } catch (e) { delete S.cart[k]; } } }

  // ---------------------------------------------------------------- negocios: posición y estado
  function restPos(r) {
    if (r.kind === "truck" && r.loc && typeof r.loc.lat === "number" && typeof r.loc.lng === "number") return { lat: r.loc.lat, lng: r.loc.lng };
    if (typeof r.lat === "number" && typeof r.lng === "number") return { lat: r.lat, lng: r.lng };
    return null;
  }
  const truckLive = r => !!(r.kind === "truck" && r.loc && r.loc.sharing && Date.now() - num(r.loc.updatedAt) < 15 * 60000);
  const isOpen = r => !!r && !r.paused && (r.kind !== "truck" || truckLive(r));
  function openText(r) {
    if (isOpen(r)) return r.kind === "truck" ? "Abierto · en ruta" : "Abierto";
    if (r.paused) return "No recibe pedidos ahora";
    return r.kind === "truck" ? "Fuera de ruta" : "Cerrado";
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
  function parseRoute() {
    const h = location.hash.slice(1);
    if (h === "panel" || h === "cocina") return { name: "panel" };
    if (h === "cuenta" || h === "entrar") return { name: "account" };
    if (h === "admin") return { name: "admin" };
    const r = new URLSearchParams(location.search).get("r");
    if (r && /^[a-z0-9-]{3,40}$/i.test(r)) return { name: "rest", rid: r.toLowerCase() };
    return { name: "home" };
  }
  function go(name, rid) {
    const url = name === "home" ? BASE : name === "rest" ? `${BASE}?r=${encodeURIComponent(rid)}` : name === "account" ? `${BASE}#cuenta` : name === "admin" ? `${BASE}#admin` : `${BASE}#panel`;
    if (location.href !== url) history.pushState(null, "", url);
    route();
  }
  function route() {
    const r = parseRoute(), prev = S.route;
    S.route = r;
    document.body.dataset.app = r.name;
    $("#vHome").hidden = r.name !== "home";
    $("#vRest").hidden = r.name !== "rest";
    $("#vPanel").hidden = r.name !== "panel";
    $("#vAcct").hidden = r.name !== "account";
    $("#vAdmin").hidden = r.name !== "admin";
    renderNav();
    if (r.name !== "rest" && S.rid) closeRest();
    if (r.name === "rest" && (prev.name !== "rest" || prev.rid !== r.rid)) openRest(r.rid);
    if (r.name === "home") { ensureDir(); paint(renderHome); }
    if (r.name === "panel") paint(renderPanel);
    if (r.name === "account") { ensureDir(); paint(renderAccount); }
    if (r.name === "admin") paint(renderAdmin);
    document.title = r.name === "panel" ? "Mi negocio · OnRoute" : r.name === "account" ? "Mi cuenta · OnRoute" : r.name === "admin" ? "Administración · OnRoute" : r.name === "rest" ? `${S.R ? S.R.name + " · " : ""}OnRoute` : "OnRoute · Comida cerca de ti";
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
          <div class="dir-join"><div><b>¿Tienes un food truck o restaurante?</b><span>Regístralo y recibe pedidos directos, sin pagar comisión por pedido.</span></div><a class="btn green sm" href="./#panel" data-nav="panel">Registrar mi negocio</a></div>
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
        <div style="min-width:0"><h3>${esc(r.name)}</h3><p class="meta">${esc(KIND[r.kind] || "")}${r.cuisine ? " · " + esc(r.cuisine) : ""}</p><p class="meta">${esc(r.kind === "truck" && r.loc && r.loc.stop ? r.loc.stop : r.address || r.description || "")}</p></div>
        <div class="side">${d != null ? `<span class="dist mono">${fmtMi(d)}</span>` : ""}<span class="chip cdot ${isOpen(r) ? "open" : "closed"}">${esc(openText(r))}</span></div></a>`).join("");
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
    Object.assign(S, { rid, R: null, Rerr: null, Rmenu: [], RmenuReady: false, cart: {}, pick: {}, vsel: {}, cat: "", view: "menu", payErr: "", busy: false, mine: null, mineReady: false });
    S.myOrder = ss.get(`onroute-my-${rid}`) || null;
    if (S.myOrder) S.view = "status";
    handleStripeReturn(rid);
    $("#vRest").innerHTML = ""; delete $("#vRest").dataset.built; restMap = null; restMarker = null;
    rUnsubs.push(db.doc(`restaurants/${rid}`).onSnapshot(
      s => { if (!s.exists) { S.R = null; S.Rerr = "none"; } else { S.R = { id: s.id, ...s.data() }; S.Rerr = null; document.title = `${S.R.name} · OnRoute`; } pruneCart(); paint(renderRest); },
      () => { S.R = null; S.Rerr = "none"; paint(renderRest); }
    ));
    rUnsubs.push(db.doc(`restaurants/${rid}/menu/main`).onSnapshot(
      s => { S.Rmenu = normMenu(s.exists ? s.data().items : []); S.RmenuReady = true; pruneCart(); paint(renderRest); },
      () => { S.RmenuReady = true; paint(renderRest); }
    ));
    if (S.myOrder) watchMine();
    paint(renderRest);
  }
  function closeRest() { rUnsubs.forEach(u => { try { u(); } catch (e) {} }); rUnsubs = []; if (mineUnsub) { mineUnsub(); mineUnsub = null; } S.rid = null; }
  function watchMine() {
    if (mineUnsub) mineUnsub();
    const rid = S.rid, id = S.myOrder; S.mineReady = false;
    mineUnsub = db.doc(`restaurants/${rid}/orders/${id}`).onSnapshot(
      d => { S.mine = d.exists ? { id: d.id, ...d.data() } : null; S.mineReady = true; paint(renderRest); },
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
    $("#rLoc").innerHTML = `<div><strong>${esc(where || (pos ? "Ubicación" : "Ubicación no disponible"))}</strong><span>${esc([R.loc && R.loc.hours, when].filter(Boolean).join(" · "))}</span></div>
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
    const last = getLast(S.rid);
    return `${last && !closed ? (() => { const tot = Object.entries(last.cart).reduce((a, [k, q]) => a + parseKey(k).price * q, 0);
        return `<div class="last"><div class="last-top"><b>Tu último pedido</b><small>${daysAgo(last.at)}</small></div><ul>${Object.entries(last.cart).map(([k, q]) => `<li>${q} × ${esc(parseKey(k).label)}</li>`).join("")}</ul><button class="btn dark" data-act="repeat">Pedir lo mismo · <span class="mono">${money(tot)}</span></button></div>`; })() : ""}
      ${cats.length > 1 ? `<div class="cats" role="group" aria-label="Categorías">${cats.map(c => `<button aria-pressed="${c === S.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
      ${closed ? `<div class="note">${R.status !== "active" ? "Este negocio todavía no está publicado. Puedes ver el menú, pero aún no recibe pedidos." : R.paused ? "El negocio pausó los pedidos en línea. Vuelve en unos minutos." : R.kind === "truck" ? "El food truck no está en ruta ahora mismo. Puedes ver el menú; los pedidos se abren cuando comparta su ubicación." : "El negocio está cerrado por ahora."}</div>` : ""}
      ${R.menuNote ? `<p class="hint">${esc(R.menuNote)}</p>` : ""}
      <div class="menu">${items.map(m => {
        const oi = Math.min(Number(S.pick[m.id] || 0), m.opts.length - 1), o = m.opts[oi], vsel = !!(vr && S.vsel[m.id]);
        const price = o.price - (vsel ? vr.discount : 0);
        return `<article class="item ${m.soldOut ? "sold" : ""} ${m.photo ? "" : "nophoto"}">
          <div class="ph">${m.photo && photoSrc(S.rid, m.photo) ? `<img src="${esc(photoSrc(S.rid, m.photo))}" alt="${esc(m.name)}" loading="lazy">` : ""}</div>
          <div class="body">
            <div><h3>${esc(m.name)}${m.soldOut ? ' <span class="sold-tag">Agotado</span>' : ""}</h3>${m.desc ? `<p>${esc(m.desc)}</p>` : ""}</div>
            ${m.opts.length > 1 ? `<div class="opts" role="group" aria-label="Opciones">${m.opts.map((x, j) => `<button data-opt="${esc(m.id)}|${j}" aria-pressed="${j === oi}"><b>${esc(x.label || String.fromCharCode(65 + j))} · ${money(x.price)}</b>${esc(x.detail)}</button>`).join("")}</div>` : (o.detail ? `<p class="hint">${esc(o.detail)}</p>` : "")}
            <div class="row">
              ${vr ? `<label class="vari"><input type="checkbox" id="v-${esc(m.id)}" data-vari="${esc(m.id)}" ${vsel ? "checked" : ""}> ${esc(vr.label)} (−${money(vr.discount)})</label>` : `<span class="price mono">${money(price)}</span>`}
              <button class="addbtn" data-add="${esc(m.id)}" ${closed || m.soldOut ? "disabled" : ""}>${m.soldOut ? "Agotado" : `Agregar · <span class="mono">${money(price)}</span>`}</button>
            </div>
          </div></article>`;
      }).join("")}</div>`;
  }
  function cartHTML() {
    const tot = subtotal(), R = S.R, card = cardOn() && S.payMode === "card", closed = !isOpen(R) || R.status !== "active";
    if (!S.name && S.profile && S.profile.name) S.name = S.profile.name;
    return `<button class="back m-only" data-act="tomenu">← Seguir pidiendo</button>
      <div class="sheet">
        <h2>Tu pedido</h2>
        <p class="hint">${esc(R.name)}</p>
        <div class="lines">${Object.entries(S.cart).map(([k, q]) => { const p = parseKey(k); return `
          <div class="line"><div class="nm"><b>${esc(p.m.name)}</b><small>${esc([p.m.opts.length > 1 ? p.o.label : "", p.v ? variantOf(R).label : ""].filter(Boolean).join(" · "))}${p.m.opts.length > 1 || p.v ? " · " : ""}<span class="mono">${money(p.price)}</span></small></div>
          <div class="qty"><button data-dec="${esc(k)}" aria-label="Quitar uno">−</button><b class="mono">${q}</b><button data-inc="${esc(k)}" aria-label="Agregar uno">+</button></div></div>`; }).join("")}</div>
        <div class="field"><span class="flabel">¿Cuándo pasas por él?</span>
          <div class="choices">
            <button data-pickup="asap" aria-pressed="${S.pickup === "asap"}"><b>Lo antes posible</b>Unos 15 min</button>
            <button data-pickup="30" aria-pressed="${S.pickup === "30"}"><b>En 30 minutos</b>Llego más tarde</button>
          </div></div>
        <div class="field"><label for="nameInput">Nombre para el pedido</label><input id="nameInput" maxlength="40" placeholder="Ej. Ana" value="${esc(S.name)}" autocomplete="given-name"></div>
        ${cardOn() ? `<div class="field"><span class="flabel">¿Cómo quieres pagar?</span><div class="choices">
            <button data-paymode="card" aria-pressed="${S.payMode === "card"}"><b>Tarjeta ahora</b>Pago seguro con Stripe</button>
            <button data-paymode="cash" aria-pressed="${S.payMode === "cash"}"><b>Al recoger</b>En el negocio</button></div></div>` : ""}
        <div class="totals"><div class="grand"><span>Total</span><span class="mono">${money(tot)}</span></div><p class="hint">${esc(R.menuNote && /impuesto/i.test(R.menuNote) ? "Impuesto incluido." : "")}</p></div>
        <div class="saving">Pidiendo directo y no en una app de delivery, ${esc(R.name)} se queda con unos ${money(tot * COMMISSION)} más.</div>
        ${S.payErr ? `<p class="err" role="alert">${esc(S.payErr)}</p>` : ""}
        <button class="pay" data-act="pay" ${closed || S.busy ? "disabled" : ""}>${closed ? "Este negocio no recibe pedidos ahora" : S.busy ? (card ? "Abriendo pago seguro…" : "Enviando…") : card ? `Pagar ${money(tot)} con tarjeta` : `Enviar pedido · pagas ${money(tot)} al recoger`}</button>
        ${S.user ? `<p class="hint" style="text-align:center">Pides como ${esc(S.user.email || "")}. Lo verás en Mis pedidos.</p>` : `<p class="hint" style="text-align:center"><a href="./#cuenta" data-act="loginreturn">Crea tu cuenta o entra</a> para guardar tus pedidos. También puedes pedir sin cuenta.</p>`}
        <p class="hint" style="text-align:center">${card ? (window.ONROUTE_STRIPE_TEST !== false ? "Modo de prueba: usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC." : "Te llevamos a la página de pago segura de Stripe.") : "Pagas en efectivo o tarjeta al recoger."}</p>
      </div>`;
  }
  function statusHTML() {
    const o = S.mine;
    if (!o) return S.mineReady ? `<div class="status"><h2>No encontramos tu pedido</h2><button class="ghost" data-act="neworder">Hacer un pedido</button></div>` : `<div class="empty-box">Cargando tu pedido…</div>`;
    const st = o.status;
    if (st === "pending" || st === "cancelled") return `<div class="status"><h2>${st === "pending" ? "Confirmando tu pago…" : "Pago no completado"}</h2>
      <div class="ticket"><div class="num">#${esc(o.num)}</div><p>${st === "pending" ? "En cuanto se confirme el pago, tu pedido entra a la cocina." : "Este pedido no se cobró y no llegó a la cocina."}</p></div>
      <button class="ghost" data-act="neworder">${st === "pending" ? "Volver al menú" : "Hacer otro pedido"}</button></div>`;
    const idx = { new: 0, prep: 1, ready: 2, done: 3 }[st] ?? 0;
    const steps = [["Pedido recibido", "El negocio ya lo tiene en su pantalla"], ["En preparación", "Lo están preparando"], ["Listo para recoger", "Pasa con tu número"]];
    return `<div class="status">
      <h2>${st === "ready" ? "¡Tu pedido está listo!" : st === "done" ? "¡Buen provecho!" : "Gracias, " + esc(o.who)}</h2>
      <div class="ticket"><div class="num">#${esc(o.num)}</div><p>${o.pickup === "30" ? "Pasas en 30 min" : "Listo en unos 15 min"} · ${esc(S.R.name)}</p><span class="paychip ${o.paid ? "paid" : ""}">${o.paid ? "Pagado con tarjeta" : "Pagas al recoger"}</span></div>
      <ol class="steps">${steps.map((s, i) => { const done = i < idx || (i === 2 && idx >= 2); return `<li class="${done ? "done" : i === idx ? "now" : ""}"><span class="dot">${done ? "✓" : i + 1}</span><div><b>${s[0]}</b><small>${s[1]}</small></div></li>`; }).join("")}</ol>
      <div class="points"><span>Total del pedido</span><strong class="mono">${money(o.total)}</strong></div>
      <button class="ghost" data-act="neworder">Hacer otro pedido</button></div>`;
  }
  async function placeOrder() {
    const nm = (($("#nameInput") || {}).value || "").trim().slice(0, 40);
    if (!nm) { S.payErr = "Escribe tu nombre para que te llamen cuando esté listo."; paint(renderRest); const i = $("#nameInput"); if (i) i.focus(); return; }
    S.name = nm; ls.set("onroute-name", nm); S.payErr = "";
    const rid = S.rid;
    if (cardOn() && S.payMode === "card") {
      S.busy = true; paint(renderRest);
      try {
        const headers = { "Content-Type": "application/json" };
        if (S.user) { try { headers.Authorization = "Bearer " + (await S.user.getIdToken()); } catch (e) {} }
        const r = await fetch(window.ONROUTE_API + "/createCheckout", { method: "POST", headers,
          body: JSON.stringify({ rid, name: nm, pickup: S.pickup, cart: S.cart, items: Object.entries(S.cart).map(([key, qty]) => ({ key, qty })) }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.url) throw new Error(j.error || "No se pudo iniciar el pago.");
        ls.set("onroute-pending", { cart: S.cart, name: nm, orderId: j.orderId, rid, at: Date.now() });
        location.href = j.url;
      } catch (e) { S.busy = false; S.payErr = e.message && e.message !== "Failed to fetch" ? e.message : "No se pudo conectar con el pago. Revisa tu conexión o elige Pagar al recoger."; paint(renderRest); }
      return;
    }
    const order = { num: "T" + String(Math.floor(100 + Math.random() * 900)), who: nm, items: Object.entries(S.cart).map(([k, q]) => ({ name: parseKey(k).label, qty: q })),
      total: Math.round(subtotal() * 100) / 100, status: "new", pickup: S.pickup, createdAt: Date.now(), pay: "cash" };
    if (S.user) order.uid = S.user.uid;
    S.busy = true; paint(renderRest);
    try {
      const ref = db.collection(`restaurants/${rid}/orders`).doc();
      await ref.set(order);
      S.myOrder = ref.id; ss.set(`onroute-my-${rid}`, ref.id);
      ls.set(`onroute-last-${rid}`, { cart: S.cart, name: nm, at: Date.now() });
      if (S.user) db.doc(`users/${S.user.uid}/orders/${ref.id}`).set({ rid, rname: S.R.name, num: order.num, total: order.total, items: order.items, cart: S.cart, pay: "cash", createdAt: order.createdAt })
        .catch(e => console.error("OnRoute: historial", e));
      S.cart = {}; S.view = "status"; S.busy = false; watchMine(); paint(renderRest);
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
      [myUnsub, ordUnsub, myMenuUnsub, allUnsub, profUnsub, histUnsub, usersUnsub].forEach(f => { try { f && f(); } catch (e) {} });
      myUnsub = ordUnsub = myMenuUnsub = allUnsub = profUnsub = histUnsub = usersUnsub = null;
      stopGps(true);
      if (u) {
        db.doc("meta/owner").get().then(d => { S.isAdmin = !!(d.exists && d.data().uid === u.uid); if (S.isAdmin) { watchAll(); watchUsers(); } afterAuth(); }).catch(() => afterAuth());
        profUnsub = db.doc(`users/${u.uid}`).onSnapshot(s => { S.profile = s.exists ? s.data() : null; S.profileReady = true; afterAuth(); }, () => { S.profileReady = true; afterAuth(); });
        myUnsub = db.collection("restaurants").where("ownerUid", "==", u.uid).limit(1).onSnapshot(snap => {
          const d = snap.docs[0], prev = S.my && S.my.id;
          S.my = d ? { id: d.id, ...d.data() } : null; S.myReady = true;
          if (S.my && S.my.id !== prev) watchMine2(S.my.id);
          if (S.my && !S.pfDirty) S.pf = null;
          afterAuth();
        }, err => { console.error("OnRoute: mi negocio", err); S.myReady = true; afterAuth(); });
        histUnsub = db.collection(`users/${u.uid}/orders`).orderBy("createdAt", "desc").limit(100).onSnapshot(
          snap => { S.hist = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.histReady = true; if (S.route.name === "account") paint(renderAccount); },
          () => { S.histReady = true; });
      }
      afterAuth();
    });
  }
  function roleOf() { if (!S.user) return null; if (S.my) return "business"; return (S.profile && S.profile.role) || null; }
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
    // Después de entrar: cada quien a su vista.
    if (u && S.loginIntent && S.profileReady && S.myReady && roleOf()) {
      const role = roleOf(), intent = S.loginIntent; S.loginIntent = null;
      if (S.returnTo) { const t = S.returnTo; S.returnTo = null; go(t.name, t.rid); }
      else if (role === "business" && intent !== "panel") go("panel");
      else if (role === "customer" && intent === "panel" && S.authRole !== "business") go("account");
    }
    renderNav();
    const n = S.route.name;
    if (n === "panel") paint(renderPanel);
    if (n === "account") paint(renderAccount);
    if (n === "admin") paint(renderAdmin);
    if (n === "rest") paint(renderRest);
  }
  function renderNav() {
    const role = roleOf(), n = S.route.name;
    const nav = $("#topNav"); if (!nav) return;
    const items = [["home", "Explorar", "./"]];
    if (!S.user) items.push(["account", "Entrar", "./#cuenta", "cta"]);
    else if (role === "business") items.push(["panel", "Mi negocio", "./#panel", "cta"]);
    else items.push(["account", "Mis pedidos", "./#cuenta", "cta"]);
    if (S.isAdmin) items.push(["admin", "Admin", "./#admin"]);
    nav.innerHTML = items.map(([k, l, h, c]) => `<a class="tbtn ${c || ""}" href="${h}" data-nav="${k}" aria-current="${n === k ? "page" : "false"}">${l}</a>`).join("");
  }
  function watchMine2(rid) {
    [ordUnsub, myMenuUnsub].forEach(f => { try { f && f(); } catch (e) {} });
    S.orders = []; S.ordersReady = false; S.myMenu = []; S.myMenuReady = false; S.meDraft = null; S.meDirty = false;
    ordUnsub = db.collection(`restaurants/${rid}/orders`).orderBy("createdAt", "desc").limit(600).onSnapshot(
      snap => { const before = new Set(S.orders.filter(o => o.status === "new").map(o => o.id)); S.orders = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        if (S.ordersReady && S.orders.some(o => o.status === "new" && !before.has(o.id))) beep(); S.ordersReady = true; paint(renderPanel); },
      err => { console.error("OnRoute: pedidos", err); S.ordersReady = true; paint(renderPanel); }
    );
    myMenuUnsub = db.doc(`restaurants/${rid}/menu/main`).onSnapshot(s => { S.myMenu = normMenu(s.exists ? s.data().items : []); S.myMenuReady = true; if (!S.meDirty) { S.meDraft = null; } paint(renderPanel); }, () => { S.myMenuReady = true; paint(renderPanel); });
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
  function beep() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.18); } catch (e) {} }

  const UA = navigator.userAgent || "";
  const inApp = /FBAN|FBAV|FB_IAB|Messenger/i.test(UA) ? "Facebook/Messenger" : /Instagram/i.test(UA) ? "Instagram" : /; wv\)/.test(UA) ? "una app" : "";
  const AUTH_ERR = { "auth/invalid-credential": "Correo o contraseña incorrectos.", "auth/wrong-password": "Correo o contraseña incorrectos.", "auth/user-not-found": "No hay una cuenta con ese correo. Usa Crear cuenta.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Usa Entrar.", "auth/weak-password": "La contraseña necesita al menos 6 caracteres.", "auth/invalid-email": "Ese correo no es válido.",
    "auth/missing-password": "Escribe la contraseña.", "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.", "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes e intenta otra vez.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase.", "auth/too-many-requests": "Demasiados intentos. Espera un momento.", "auth/network-request-failed": "Sin conexión. Revisa tu internet." };
  const repaintAuth = () => { if (S.route.name === "account") paint(renderAccount); else paint(renderPanel); };
  async function authAction(kind) {
    S.authMsg = "";
    const email = (($("#authEmail") || {}).value || "").trim(), pass = ($("#authPass") || {}).value || "";
    S.authName = (($("#authName") || {}).value || S.authName || "").trim();
    if (!S.authRole) S.authRole = S.route.name === "panel" ? "business" : "customer";
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
    if (!S.user) { if (!S.authRole) S.authRole = "business"; v.dataset.built = ""; v.innerHTML = `<div class="panel">${head}<div class="p-auth scroll">${authHTML()}</div></div>`; return; }
    if (!S.my) { v.dataset.built = ""; v.innerHTML = `<div class="panel">${head}<div class="p-auth scroll">${regHTML()}</div></div>`; return; }
    const tabs = [["orders", "Pedidos", I.orders], ["menu", "Menú", I.menu], ["rep", "Reportes", I.rep], ["prof", "Perfil", I.prof]];
    if (!tabs.some(t => t[0] === S.ktab)) S.ktab = "orders";
    const key = S.my.id + "|" + tabs.length;
    if (v.dataset.built !== key) {
      v.dataset.built = key; pfMap = null; pfMarker = null;
      v.innerHTML = `<div class="panel" id="panel"><div id="pHead"></div>
        <div class="pbody">
          <div class="kpanel scroll" id="pOrders"></div>
          <div class="kpanel scroll narrow" id="pMenu" hidden></div>
          <div class="kpanel scroll narrow" id="pRep" hidden></div>
          <div class="kpanel scroll narrow" id="pProf" hidden></div>
          <nav class="knav" id="kNav" role="tablist" aria-label="Secciones" style="--n:${tabs.length}">${tabs.map(t => `<button role="tab" data-ktab="${t[0]}">${t[2]}<span>${t[1]}</span>${t[0] === "orders" ? '<i class="badge" id="newBadge" hidden></i>' : ""}</button>`).join("")}</nav>
        </div></div>`;
    }
    $("#pHead").innerHTML = head;
    $$("#kNav button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.ktab === S.ktab)));
    const map = { orders: "#pOrders", menu: "#pMenu", rep: "#pRep", prof: "#pProf" };
    Object.entries(map).forEach(([k, sel]) => { const el = $(sel); if (el) el.hidden = k !== S.ktab; });
    const nNew = S.orders.filter(o => o.status === "new").length, nb = $("#newBadge");
    if (nb) { nb.hidden = !nNew; nb.textContent = nNew; }
    if (S.ktab === "orders") renderOrders();
    if (S.ktab === "menu") renderMenuEd();
    if (S.ktab === "rep") renderRep();
    if (S.ktab === "prof") renderProf();
  }
  function statusChip(s) { return s === "active" ? '<span class="chip open cdot">Publicado</span>' : s === "suspended" ? '<span class="chip closed cdot">Suspendido</span>' : '<span class="chip info cdot">En revisión</span>'; }
  function authHTML() {
    const biz = S.authRole === "business";
    return `<div class="auth">
      <div class="kinds roles" role="group" aria-label="Tipo de cuenta">
        <button data-authrole="customer" aria-pressed="${!biz}"><b>Quiero pedir comida</b><span>Guarda tus pedidos y favoritos</span></button>
        <button data-authrole="business" aria-pressed="${biz}"><b>Tengo un negocio</b><span>Food truck o restaurante</span></button></div>
      <h3>${biz ? "Tu negocio en OnRoute" : "Tu cuenta OnRoute"}</h3>
      <p>${biz ? "Registra tu food truck o restaurante, sube tu menú con fotos y recibe pedidos directos, sin comisiones." : "Guarda tus pedidos, tus negocios favoritos y tus datos para pedir más rápido. También puedes pedir sin cuenta."}</p>
      <div class="field"><label for="authName">Tu nombre <span class="hint">(solo para crear cuenta)</span></label><input id="authName" autocomplete="name" maxlength="60" value="${esc(S.authName)}" placeholder="Ej. Ana López"></div>
      <div class="field"><label for="authEmail">Correo</label><input id="authEmail" type="email" autocomplete="email" placeholder="tu@correo.com"></div>
      <div class="field"><label for="authPass">Contraseña</label><input id="authPass" type="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres"></div>
      ${S.authMsg ? `<p class="${/correo para cambiar/.test(S.authMsg) ? "ok-msg" : "err"}" role="alert">${esc(S.authMsg)}</p>` : ""}
      <div class="btns"><button class="btn" data-auth="login">Entrar</button><button class="btn sec" data-auth="signup">Crear cuenta</button><button class="btn sec sm" data-auth="reset" style="margin-left:auto">Olvidé mi contraseña</button></div>
      <div class="or">o</div>
      ${inApp ? `<p class="err">Estás en el navegador de ${inApp}. Google no deja entrar desde aquí: abre OnRoute en Chrome o Safari, o usa correo y contraseña.</p>` : ""}
      <button class="btn google" data-auth="google" ${inApp ? "disabled" : ""}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>Continuar con Google</button>
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
    const today = S.orders.filter(o => o.createdAt >= todayStart() && !["pending", "cancelled"].includes(o.status));
    const sales = today.reduce((a, o) => a + num(o.total), 0);
    $("#sSales").textContent = "$" + Math.round(sales);
    $("#sOrders").textContent = today.length;
    $("#sSaved").textContent = "$" + Math.round(sales * COMMISSION);
    const t = $("#acceptT"); if (document.activeElement !== t) t.checked = !R.paused;
    $("#acceptSub").textContent = R.paused ? "Pausado: los clientes ven el menú pero no pueden pedir" : R.kind === "truck" && !truckLive(R) ? "Activa tu GPS en Perfil para aparecer abierto" : "Los clientes pueden pedir ahora";
    const gb = $("#gpsBar"), live = truckLive(R);
    gb.classList.toggle("on", R.kind === "truck" ? live : typeof R.lat === "number");
    gb.innerHTML = I.pin + `<span>${R.kind === "truck" ? (live ? `GPS en vivo${R.loc.stop ? " · " + esc(R.loc.stop) : ""}` : "GPS apagado · tocar para compartir ubicación") : typeof R.lat === "number" ? `Ubicación fija${R.address ? " · " + esc(R.address) : ""}` : "Falta tu ubicación · tocar para ponerla"}</span>`;
    const sold = S.myMenu.filter(m => m.soldOut);
    $("#stockAlerts").innerHTML = `<h4>Inventario</h4>` + (!S.myMenu.length ? `<span class="okline">Todavía no tienes menú. <button class="btn sm sec" data-ktab="menu">Crear menú</button></span>`
      : sold.length ? sold.map(m => `<div class="al">${I.alert}<span>${esc(m.name)}: <b class="low">AGOTADO</b></span></div>`).join("") : `<span class="okline">Todo el menú está disponible.</span>`);
    renderChart(today);
    const cols = [["new", "Nuevos"], ["prep", "En preparación"], ["ready", "Listos"]], act = { new: "Empezar", prep: "Marcar listo", ready: "Entregado" };
    const active = S.orders.filter(o => ["new", "prep", "ready"].includes(o.status));
    $("#board").innerHTML = cols.map(([k, l]) => { const list = active.filter(o => o.status === k).sort((a, b) => a.createdAt - b.createdAt); return `
      <div class="col"><h3><span>${l}</span><span class="mono">${list.length}</span></h3>
      ${list.length ? list.map(o => `<div class="order ${k}">
        <div class="o-top"><b>#${esc(o.num)}</b><small>${ago(o.createdAt)}</small></div>
        <ul>${(o.items || []).map(it => `<li>${num(Number(it.qty))} × ${esc(it.name)}</li>`).join("")}</ul>
        <div class="o-who">${esc(o.who)} · <span class="mono">${money(o.total)}</span>${o.pickup === "30" ? " · llega en 30 min" : ""}</div>
        <span class="paychip ${o.paid ? "paid" : ""}">${o.paid ? "Pagado con tarjeta" : "Cobrar al entregar"}</span>
        <button class="o-btn" data-adv="${esc(o.id)}">${act[k]}</button></div>`).join("")
      : `<div class="empty">${k === "new" ? (S.ordersReady ? "Sin pedidos nuevos." : "Cargando…") : "Sin pedidos"}</div>`}</div>`; }).join("");
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
    try { await db.doc(`restaurants/${S.my.id}/orders/${id}`).update({ status: next }); }
    catch (e) { console.error("OnRoute: mover pedido", e); toast("No se pudo actualizar el pedido. Revisa la conexión."); }
  }

  // ---------- Editor del menú (con fotos)
  const clone = x => JSON.parse(JSON.stringify(x));
  function meEnsure() {
    if (!S.meDraft) S.meDraft = clone(S.myMenu);
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
      <div class="kcard ai-card"><div><h4>Llenar el menú con una foto</h4><p class="hint">Toma foto a tu menú impreso, volante o pizarrón (hasta 4 fotos) y OnRoute escribe los platillos y precios por ti. Después solo revisas y guardas.</p></div>
        <label class="btn green ${S.aiBusy ? "busy" : ""}" for="aiIn">${ic('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}<span>${S.aiBusy ? "Leyendo tu menú…" : "Subir foto del menú"}</span><input type="file" id="aiIn" accept="image/*" multiple ${S.aiBusy ? "disabled" : ""}></label>
        ${S.aiMsg ? `<p class="${S.aiCls || "hint"}" role="status">${esc(S.aiMsg)}</p>` : ""}</div>
      <div class="kcard"><h4>Ajustes del menú</h4><div class="me-cfg">
        <input id="cfgNote" data-cfg="menuNote" maxlength="140" value="${esc(C.menuNote)}" placeholder="Nota (ej. Combo incluye refresco. Precios con impuesto incluido.)" aria-label="Nota del menú">
        <input id="cfgVL" data-cfg="vLabel" maxlength="30" value="${esc(C.vLabel)}" placeholder="Opción con descuento (ej. Sin combo)" aria-label="Opción con descuento">
        <input id="cfgVD" data-cfg="vDisc" type="number" min="0" max="50" step="0.5" value="${esc(C.vDisc)}" placeholder="Descuento $" aria-label="Descuento">
      </div><p class="hint" style="margin-top:8px">La opción con descuento es opcional: aparece como casilla en cada platillo (por ejemplo "Solo torta, −$1").</p></div>
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
    if (bad) { const e = $(bad); if (e) { e.classList.add("bad"); e.scrollIntoView({ block: "center" }); e.focus(); } S.meMsg = "Revisa el campo marcado en rojo: falta el nombre, la opción o el precio no es válido."; S.meMsgCls = "err"; meBar(); return; }
    if (Object.keys(S.uploading).length) { S.meMsg = "Espera a que terminen de subir las fotos."; S.meMsgCls = "err"; meBar(); return; }
    const items = D.map(m => ({ id: m.id, cat: String(m.cat || "Platillos").trim().slice(0, 30) || "Platillos", name: m.name.trim().slice(0, 60), desc: String(m.desc || "").trim().slice(0, 200),
      photo: safePhoto(m.photo), soldOut: !!m.soldOut, opts: m.opts.map(o => ({ label: String(o.label || "").trim().slice(0, 30), detail: String(o.detail || "").trim().slice(0, 40), price: Math.round(Number(o.price) * 100) / 100 })) }));
    S.meSaving = true; S.meMsg = "Guardando…"; S.meMsgCls = ""; meBar();
    try {
      await db.doc(`restaurants/${S.my.id}/menu/main`).set({ items, updatedAt: Date.now() });
      cleanPhotos(items);
      const variant = C.vLabel.trim() ? { label: C.vLabel.trim().slice(0, 30), discount: Math.round(vd * 100) / 100 } : null;
      await db.doc(`restaurants/${S.my.id}`).update({ menuNote: C.menuNote.trim().slice(0, 140), variant, updatedAt: Date.now() });
      S.meDirty = false; S.meSaving = false; S.meDraft = null; S.meCfg = null; S.aiCheck = false; S.aiMsg = ""; S.meMsg = "Guardado. Los clientes ya ven el menú nuevo."; S.meMsgCls = "ok";
      paint(renderPanel);
    } catch (e) { console.error("OnRoute: guardar menú", e); S.meSaving = false; S.meMsg = "No se pudo guardar. Revisa la conexión e intenta otra vez."; S.meMsgCls = "err"; meBar(); }
  }

  // ---------- Menú desde una foto (Firebase AI Logic con Gemini)
  const AI_V = "12.19.0";
  let aiModel = null;
  async function menuModel() {
    if (aiModel) return aiModel;
    const appm = await import(`https://www.gstatic.com/firebasejs/${AI_V}/firebase-app.js`);
    const aim = await import(`https://www.gstatic.com/firebasejs/${AI_V}/firebase-ai.js`);
    const app = appm.getApps().find(a => a.name === "onroute-ai") || appm.initializeApp(window.FIREBASE_CONFIG, "onroute-ai");
    const ai = aim.getAI(app, { backend: new aim.GoogleAIBackend() });
    aiModel = aim.getGenerativeModel(ai, { model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", temperature: 0.1 } });
    return aiModel;
  }
  const MENU_PROMPT = `Transcribe el menú de restaurante que aparece en las fotos. Responde SOLO con JSON, con esta forma exacta:
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
      for (const f of files) { let b; try { b = await resizeImage(f, 1600); } catch (e) { b = f; } parts.push({ inlineData: { data: await blobToB64(b), mimeType: b.type || "image/jpeg" } }); }
      const model = await menuModel();
      const res = await model.generateContent(parts);
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
      S.aiMsg = /vacio/.test(m) ? "No encontramos platillos en la foto. Prueba con una foto más cerca, derecha y con buena luz."
        : /formato/.test(m) ? "No pudimos entender el menú de la foto. Intenta otra vez o con una foto más clara."
        : /api-not-enabled|not been used|disabled|PERMISSION_DENIED|403|firebasevertexai|firebaseml|generativelanguage/i.test(m) ? "La lectura de menús todavía no está activada en Firebase. Activa Firebase AI Logic (Gemini Developer API) en la consola y vuelve a intentar."
        : /quota|429|RESOURCE_EXHAUSTED/i.test(m) ? "Se llegó al límite de lecturas por ahora. Espera un minuto e intenta otra vez."
        : /Failed to fetch|import|network/i.test(m) ? "No se pudo conectar con el lector de menús. Revisa tu internet e intenta otra vez."
        : "No se pudo leer el menú. Intenta otra vez.";
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

  // ---------- Perfil, ubicación y enlace
  function pfEnsure() { if (!S.pf) { const R = S.my; S.pf = { name: R.name || "", kind: R.kind || "truck", cuisine: R.cuisine || "", description: R.description || "", phone: R.phone || "", address: R.address || "", lat: R.lat, lng: R.lng }; S.pfDirty = false; } }
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
            <div class="field"><label for="pf-desc">Descripción</label><textarea id="pf-desc" data-pf="description" maxlength="300" placeholder="Qué te hace especial, horario, especialidades"></textarea></div>
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
                <div class="gps-fields" style="margin-top:12px"><div class="field"><label for="gpsStop">Parada de hoy</label><input id="gpsStop" maxlength="60" placeholder="Ej. The Block"></div><div class="field"><label for="gpsHours">Horario</label><input id="gpsHours" maxlength="60" placeholder="Ej. 11 am – 8 pm"></div></div>
                <p class="hint" style="margin-top:10px">Deja OnRoute abierto en el celular o tableta del camión. La ubicación se actualiza sola y los clientes te ven abierto mientras compartes.</p></div>`}
            <div class="kcard"><h4>Tu enlace y código QR</h4><div class="share"><div class="qr" id="pfQR"></div><div class="link"><code>${esc(link)}</code>
              <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm sec" data-copy="${esc(link)}">Copiar enlace</button><a class="btn sm sec" href="./?r=${esc(R.id)}" data-rest="${esc(R.id)}">Abrir</a></div>
              <span class="hint">Imprime el QR y pégalo en tu ventanilla o mesas.</span></div></div></div>
            <div class="kcard session" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px"><span class="hint">Sesión: ${esc(S.user.email || "")}</span><button class="btn sec sm" data-auth="logout">Cerrar sesión</button></div>
          </div></div>`;
      ["name", "cuisine", "description", "phone", "address"].forEach(k => { const i = el.querySelector(`[data-pf="${k}"]`); if (i) i.value = P[k] || ""; });
      try { const qr = qrcode(0, "M"); qr.addData(link); qr.make(); $("#pfQR").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { $("#pfQR").textContent = "QR no disponible"; }
      $("#pfLogoIn").addEventListener("change", async e => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        $("#pfLogo").innerHTML = `<span class="rlogo">…</span>`; S.pfMsg = "Subiendo logo…"; paint(renderProf);
        try { const url = await toDataUrl(f, 256, 45000); await db.doc(`restaurants/${R.id}`).update({ logoUrl: url, updatedAt: Date.now() }); S.pfMsg = "Logo actualizado."; toast("Logo actualizado."); }
        catch (err) { S.pfMsg = photoErr(err); toast("No se pudo subir el logo."); }
        e.target.value = ""; paint(renderProf);
      });
      if (P.kind === "restaurant") setTimeout(drawPfMap, 30);
      else { const st = $("#gpsStop"), hr = $("#gpsHours"); if (R.loc) { st.value = R.loc.stop || ""; hr.value = R.loc.hours || ""; } gpsUI(); }
    }
    $$("[data-pfkind]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pfkind === P.kind)));
    $("#pfLogo").innerHTML = logoHTML(R);
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
  async function saveProf() {
    const P = S.pf;
    if (String(P.name).trim().length < 2) { S.pfMsg = "Falta el nombre del negocio."; paint(renderProf); return; }
    const upd = { name: P.name.trim().slice(0, 60), kind: P.kind, cuisine: P.cuisine.trim().slice(0, 60), description: P.description.trim().slice(0, 300), phone: P.phone.trim().slice(0, 30), address: P.address.trim().slice(0, 120), updatedAt: Date.now() };
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
      await db.doc(`restaurants/${S.my.id}`).update({ loc: { lat: ll.lat, lng: ll.lng, acc, updatedAt: now, sharing: true, stop: (($("#gpsStop") || {}).value || "").trim().slice(0, 60), hours: (($("#gpsHours") || {}).value || "").trim().slice(0, 60) }, updatedAt: now });
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
    if (!S.user) { if (!S.authRole) S.authRole = "customer"; v.innerHTML = `<div class="acct scroll"><div class="acct-in">${authHTML()}</div></div>`; return; }
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
        <div class="dir-join"><div><b>¿Tienes un food truck o restaurante?</b><span>Regístralo con esta misma cuenta.</span></div><a class="btn green sm" href="./#panel" data-nav="panel">Registrar mi negocio</a></div>`;
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
    const tabs = [["sum", "Resumen", I.rep], ["biz", "Negocios", I.menu], ["cli", "Clientes", I.prof], ["tools", "Herramientas", I.adm]];
    if (v.dataset.built !== "1") {
      v.dataset.built = "1";
      v.innerHTML = `<div class="panel">${head}<div class="pbody"><div class="kpanel scroll narrow" id="aBody"></div>
        <nav class="knav" id="aNav" role="tablist" aria-label="Administración" style="--n:${tabs.length}">${tabs.map(t => `<button role="tab" data-admtab="${t[0]}">${t[2]}<span>${t[1]}</span>${t[0] === "biz" ? '<i class="badge" id="pendBadge" hidden></i>' : ""}</button>`).join("")}</nav></div></div>`;
    }
    $$("#aNav button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.admtab === S.admTab)));
    const pend = S.all.filter(r => r.status === "pending"), pb = $("#pendBadge");
    if (pb) { pb.hidden = !pend.length; pb.textContent = pend.length; }
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
  async function loadStats() {
    S.statsBusy = true; paint(renderAdmin);
    const t0 = todayStart(), rows = [];
    try {
      for (const r of S.all.filter(x => x.status === "active")) {
        const snap = await db.collection(`restaurants/${r.id}/orders`).where("createdAt", ">=", t0).get();
        const os = snap.docs.map(d => d.data()).filter(o => o.createdAt >= t0 && !["pending", "cancelled"].includes(o.status));
        if (os.length) rows.push({ r, count: os.length, sales: os.reduce((a, o) => a + num(o.total), 0) });
      }
      rows.sort((a, b) => b.sales - a.sales);
      S.stats = { rows, count: rows.reduce((a, x) => a + x.count, 0), sales: rows.reduce((a, x) => a + x.sales, 0) };
    } catch (e) { console.error("OnRoute: estadísticas", e); toast("No se pudieron contar los pedidos."); }
    S.statsBusy = false; paint(renderAdmin);
  }

  // ================================================================ eventos
  document.addEventListener("click", e => {
    const t = e.target.closest("a,button,[data-act]");
    if (!t) return;
    const d = t.dataset;
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
    if (d.add) { const m = S.Rmenu.find(x => x.id === d.add); if (!m) return; const k = `${m.id}|${Math.min(Number(S.pick[m.id] || 0), m.opts.length - 1)}|${variantOf(S.R) && S.vsel[m.id] ? 1 : 0}`; S.cart[k] = Math.min(20, (S.cart[k] || 0) + 1); if (S.view === "status") S.view = "menu"; paint(renderRest); return; }
    if (d.inc) { S.cart[d.inc] = Math.min(20, (S.cart[d.inc] || 0) + 1); paint(renderRest); return; }
    if (d.dec) { S.cart[d.dec]--; if (S.cart[d.dec] <= 0) delete S.cart[d.dec]; if (!cartCount()) S.view = "menu"; paint(renderRest); return; }
    if (t.id === "cartbar") { S.view = "cart"; paint(renderRest); const c = $("#client"); if (c) c.scrollTop = 0; return; }
    if (d.act === "tomenu") { S.view = "menu"; paint(renderRest); return; }
    if (d.act === "neworder") { S.view = "menu"; S.myOrder = null; S.mine = null; if (mineUnsub) { mineUnsub(); mineUnsub = null; } ss.del(`onroute-my-${S.rid}`); paint(renderRest); return; }
    if (d.act === "repeat") { const L0 = getLast(S.rid); if (!L0) return; S.cart = { ...L0.cart }; if (L0.name && !S.name) S.name = L0.name; S.view = "cart"; paint(renderRest); return; }
    if (d.pickup) { S.pickup = d.pickup; paint(renderRest); return; }
    if (d.paymode) { S.payMode = d.paymode; paint(renderRest); return; }
    if (d.act === "pay") { placeOrder(); return; }
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
    if (d.regkind) { S.reg.kind = d.regkind; paint(renderPanel); return; }
    if (d.act === "register") { register(); return; }
    if (d.ktab) { S.ktab = d.ktab; if (d.ktab !== "menu") S.meMsg = ""; paint(renderPanel); setTimeout(() => pfMap && pfMap.invalidateSize(), 50); return; }
    if (d.adv) { advance(d.adv); return; }
    if (d.adm) { setStatus(d.id, d.adm); return; }
    if (d.act === "import") { importLegacy(); return; }
    if (d.act === "saveprof") { saveProf(); return; }
    if (d.act === "pfhere") { if (!navigator.geolocation) return toast("Este navegador no tiene GPS."); navigator.geolocation.getCurrentPosition(p => setPfPos(p.coords.latitude, p.coords.longitude), () => toast("No se pudo obtener tu ubicación."), { enableHighAccuracy: true, timeout: 15000 }); return; }
    if (d.pfkind) { pfEnsure(); S.pf.kind = d.pfkind; S.pfDirty = true; S.pfMsg = "Toca Guardar perfil para aplicar el cambio."; paint(renderProf); return; }
    if (d.act === "gps") { watchId === null ? startGps() : stopGps(); return; }
    if (d.me) {
      const box = t.closest(".me-item"), i = box ? Number(box.dataset.i) : -1, D = S.meDraft;
      if (d.me === "additem") { D.push({ id: "p" + Date.now().toString(36), cat: D.length ? D[D.length - 1].cat : "Platillos", name: "", desc: "", photo: "", soldOut: false, opts: [{ label: "", detail: "", price: 10 }] }); meTouch(); paint(renderMenuEd); const all = $$("#pMenu .me-item"), last = all[all.length - 1]; if (last) { last.scrollIntoView({ block: "center" }); const n = last.querySelector("[data-f=name]"); if (n) n.focus(); } return; }
      if (d.me === "addopt") { const m = D[i]; m.opts.push({ label: "", detail: "", price: m.opts[m.opts.length - 1].price }); meTouch(); paint(renderMenuEd); return; }
      if (d.me === "delopt") { D[i].opts.splice(Number(d.j), 1); meTouch(); paint(renderMenuEd); return; }
      if (d.me === "sold") { D[i].soldOut = !D[i].soldOut; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "nophoto") { D[i].photo = ""; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "up" && i > 0) { [D[i - 1], D[i]] = [D[i], D[i - 1]]; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "down" && i < D.length - 1) { [D[i + 1], D[i]] = [D[i], D[i + 1]]; meTouch(); paint(renderMenuEd); return; }
      if (d.me === "delitem") { if (d.armed !== "1") { t.dataset.armed = "1"; t.textContent = "Toca otra vez para eliminar"; setTimeout(() => { if (t.isConnected) { t.dataset.armed = ""; t.textContent = "Eliminar platillo"; } }, 4000); return; } D.splice(i, 1); meTouch(); paint(renderMenuEd); return; }
      if (d.me === "discard") { S.meDraft = null; S.meCfg = null; S.meDirty = false; S.meMsg = ""; S.meMsgCls = ""; S.aiCheck = false; S.aiMsg = ""; paint(renderMenuEd); return; }
      if (d.me === "save") { meSave(); return; }
    }
    if (d.range) { S.hRange = d.range; renderRep(); return; }
  });
  document.addEventListener("input", e => {
    const t = e.target, d = t.dataset;
    if (t.id === "nameInput") { S.name = t.value; return; }
    if (d.reg) { S.reg[d.reg] = t.value; if (d.reg === "name") { const s = $(".slug"); if (s) s.textContent = `Tu enlace: ${BASE}?r=${slugify(t.value) || "tu-negocio"}`; } return; }
    if (d.pf) { pfEnsure(); S.pf[d.pf] = t.value; S.pfDirty = true; return; }
    if (d.cfg) { meEnsure(); S.meCfg[d.cfg] = t.value; t.classList.remove("bad"); meTouch(); return; }
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
    if (d.photo !== undefined && t.type === "file") { onPhoto(t); return; }
    if (t.id === "aiIn") { onMenuPhotos(t); return; }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.target.id === "authPass" || e.target.id === "authEmail")) { e.preventDefault(); authAction("login"); }
  });
  window.addEventListener("beforeunload", e => { if (S.meDirty || watchId !== null) { e.preventDefault(); e.returnValue = ""; } });
  setInterval(() => { if (S.route.name === "panel" && S.ktab === "orders" && S.my) paint(renderOrders); if (S.route.name === "rest" && S.R) paint(renderRest); }, 60000);

  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  // Enlaces viejos de la primera versión
  if (location.hash === "#cliente") history.replaceState(null, "", BASE + location.search);
  initAuth();
  route();
})();
