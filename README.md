# OnRoute by InnovationTECH

Plataforma donde food trucks y restaurantes publican su menú con fotos y reciben pedidos directos, sin comisiones de apps de delivery. Los clientes ven los negocios más cercanos en lista y en mapa.

## Partes
- **Explorar** (`/`): negocios publicados, ordenados por cercanía, con búsqueda, filtros y mapa.
- **Página del negocio** (`/?r=<enlace>`): menú con fotos, carrito, pedido para llevar y seguimiento en vivo.
- **Mi negocio** (`/#panel`): registro, pedidos, menú con fotos, promociones y clientes frecuentes, reportes, perfil, GPS (food trucks), enlace y QR.
- **Negocios** (solo administrador): aprobar o suspender negocios.

## Tecnología
HTML, CSS y JavaScript sin compilar (GitHub Pages) · Firebase Authentication, Firestore y Storage · Leaflet + OpenStreetMap · Netlify Functions + Stripe Connect para pagos con tarjeta (ver `PAGOS.md`).

## Datos (Firestore)
- `restaurants/{enlace}`: perfil, `ownerUid`, `status` (`pending`/`active`/`suspended`), ubicación (`lat`/`lng` o `loc` del GPS), `promos` (hasta 10: `kind` `pct`/`off`, `value`, `min`, `code` opcional, `on`) y `loyalty` (`on`, `every` sellos, `reward`).
- `restaurants/{enlace}/menu/main`: platillos con fotos y opciones.
- `restaurants/{enlace}/orders/{id}`: pedidos (con `subtotal` y `promo` si llevó descuento, y `reward` si lleva premio de cliente frecuente).
- `meta/owner`: cuenta del administrador.

Reglas: `firestore.rules` y `storage.rules`.
