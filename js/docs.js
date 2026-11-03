// OnRoute · Centro de ayuda y documentos legales.
// Texto fijo (sin datos de usuarios). La app lo muestra en #ayuda/<sección>.
// Los documentos legales son una base de trabajo: revísalos con un abogado antes de lanzar con dinero real.
(function () {
  const UPDATED = "2 de noviembre de 2026";
  window.ONROUTE_DOCS = function (c) {
    const fee = `$${c.base.toFixed(2)} + $${c.perMile.toFixed(2)} por milla (mínimo $${c.minFee.toFixed(2)})`;
    const driverPct = Math.round(c.driverShare * 100), onroutePct = 100 - driverPct;
    return [
      { id: "como-funciona", group: "Guía", title: "Cómo funciona OnRoute", icon: "🧭", html: `
        <p class="lead">OnRoute conecta a food trucks y restaurantes con sus clientes y con repartidores de la zona. Los negocios reciben pedidos directos, sin las comisiones de las apps de delivery.</p>
        <div class="doc-cards">
          <div><b>🍴 Clientes</b><span>Encuentran negocios cerca, piden para recoger o a domicilio, pagan con tarjeta o al recoger y siguen su pedido en vivo.</span></div>
          <div><b>🏪 Negocios</b><span>Publican su menú (incluso desde una foto), reciben pedidos en su cocina, manejan horario, promociones y ventas.</span></div>
          <div><b>🚗 Repartidores</b><span>Con su propio auto entregan pedidos cuando quieren y cobran por cada entrega más el 100% de las propinas.</span></div>
        </div>
        <h3>Al abrir la app</h3>
        <p>Siempre eliges cómo quieres usar OnRoute: <b>pedir comida</b>, <b>tengo un negocio</b> o <b>quiero repartir</b>. Cada opción tiene su propio panel. Para regresar a esa pantalla toca el logo de OnRoute o abre el menú ☰.</p>
        <h3>Instalar OnRoute como app</h3>
        <ul><li><b>Android / Chrome:</b> menú ☰ → <i>Instalar OnRoute</i>, o en Chrome ⋮ → <i>Instalar app</i>.</li>
        <li><b>iPhone / Safari:</b> botón Compartir → <i>Agregar a pantalla de inicio</i>. Así también recibes notificaciones.</li>
        <li><b>Computadora:</b> en Chrome o Edge, el ícono de instalar en la barra de direcciones.</li></ul>` },

      { id: "clientes", group: "Guía", title: "Guía para clientes", icon: "🍴", html: `
        <ol class="steps-doc">
          <li><b>Encuentra un negocio.</b> En <i>Pedir comida</i> ves los negocios ordenados por cercanía, en lista o en mapa. Filtra por abiertos, food trucks o restaurantes.</li>
          <li><b>Arma tu pedido.</b> Elige platillos, opciones y extras. Puedes dejar notas para la cocina.</li>
          <li><b>Elige cómo recibirlo.</b> <i>Recoger</i> en el negocio (sin costo) o <i>A domicilio</i> si el negocio lo ofrece. El envío cuesta ${fee}; la propina es opcional y es 100% para el repartidor.</li>
          <li><b>Paga como prefieras.</b> Con tarjeta, Apple Pay o Google Pay (pago seguro con Stripe), Zelle, Cash App o efectivo (al recoger o al repartidor), según lo que acepte cada negocio. También puedes <b>combinar dos</b>: por ejemplo una parte por Zelle y el resto en efectivo. Con Zelle o Cash App te mostramos a dónde mandar el dinero; tu pedido entra a la cocina cuando el negocio confirma que le llegó.</li>
          <li><b>Sigue tu pedido.</b> Ves cada paso en vivo y, a domicilio, al repartidor en el mapa. Toca <i>Avísame</i> para recibir notificación cuando esté listo.</li>
          <li><b>Mensajes.</b> Desde tu pedido escribe al negocio con 💬, y al repartidor cuando ya va en camino.</li>
        </ol>
        <h3>Cuenta (opcional)</h3>
        <p>Puedes pedir sin cuenta. Con cuenta guardas tu historial, tus negocios favoritos y juntas sellos de cliente frecuente.</p>` },

      { id: "negocios", group: "Guía", title: "Guía para negocios", icon: "🏪", html: `
        <ol class="steps-doc">
          <li><b>Regístrate.</b> Elige <i>Tengo un negocio</i>, crea tu cuenta y llena los datos. OnRoute revisa y aprueba cada negocio antes de publicarlo.</li>
          <li><b>Sube tu menú.</b> En <i>Menú</i> agrega platillos con foto, opciones y extras, o toca <i>Subir foto o PDF del menú</i> y la app lo llena por ti. Revisa y guarda.</li>
          <li><b>Perfil.</b> Logo, descripción, teléfono, ubicación (o GPS en vivo si eres food truck), <b>horario</b> y tu enlace con código QR para imprimir.</li>
          <li><b>Pagos con tarjeta.</b> En <i>Perfil → Pagos con tarjeta</i> conecta tu cuenta de Stripe con la guía paso a paso. El dinero llega directo a tu banco; Stripe cobra su comisión por pago y OnRoute no cobra comisión por pedido.</li>
          <li><b>Zelle, Cash App y efectivo.</b> En <i>Perfil → Otras formas de pago</i> escribe tu correo o teléfono de Zelle y tu $cashtag, y elige si aceptas efectivo. Esos pedidos llegan a la columna <i>Por confirmar</i>: revisa que te llegó el dinero y toca <i>Pago recibido</i> (o <i>Aceptar pedido</i> si es en efectivo).</li>
          <li><b>Entrega a domicilio (opcional).</b> En <i>Perfil</i> activa la entrega y el radio en millas. Repartidores de OnRoute llevan tus pedidos; el cliente paga el envío.</li>
          <li><b>Recibe pedidos.</b> En <i>Pedidos</i> suenan los nuevos. Muévelos: <i>Empezar → Marcar listo → Entregado</i>. Pausa los pedidos en línea cuando lo necesites.</li>
          <li><b>Promos y clientes frecuentes.</b> Descuentos automáticos o con código y tarjeta de sellos.</li>
          <li><b>Reportes.</b> Ventas, pedidos y ticket promedio por día.</li>
        </ol>
        <h3>Recomendación de equipo</h3>
        <p>OnRoute funciona en cualquier celular o tableta con navegador. Para la cocina conviene una tableta fija con la app instalada y el volumen alto.</p>` },

      { id: "repartidores", group: "Guía", title: "Guía para repartidores", icon: "🚗", html: `
        <h3>Requisitos</h3>
        <ul><li>18 años o más y licencia de manejo vigente.</li><li>Auto propio con registro y placas vigentes.</li><li>Seguro de auto vigente que cubra hacer entregas (pregúntale a tu aseguradora).</li><li>Celular con GPS e internet.</li></ul>
        <ol class="steps-doc">
          <li><b>Regístrate</b> en <i>Quiero repartir</i> con tus datos, tu auto y la foto de tu licencia. OnRoute revisa y aprueba tu registro.</li>
          <li><b>Elige cómo cobrar:</b> depósito automático a tu banco con Stripe (retiro al instante y formulario 1099) o Cash App, Zelle o Venmo (OnRoute te paga cada semana).</li>
          <li><b>Conéctate</b> con el interruptor y deja la app abierta. Suena un aviso cuando hay entregas cerca.</li>
          <li><b>Acepta</b> la que te convenga: ves cuánto ganas, la distancia y la propina.</li>
          <li><b>Recoge:</b> usa <i>Cómo llegar</i>, confirma el número de pedido y toca <i>Ya recogí</i>.</li>
          <li><b>Entrega:</b> ves la dirección e indicaciones del cliente; llámale o escríbele si hace falta y toca <i>Entregué el pedido</i>. Si el pedido es en efectivo, la app te dice exactamente cuánto cobrar.</li>
        </ol>
        <h3>Ganancias</h3>
        <p>Recibes el <b>${driverPct}% del costo de envío</b> y el <b>100% de la propina</b>. Ves lo de hoy, de los últimos 7 días y lo que está en proceso de pago.</p>
        <h3>Entregas en efectivo</h3>
        <p>Cuando cobras en efectivo, te quedas con lo que ganaste en esa entrega. El resto (la comida y la parte de OnRoute) se lo mandas a OnRoute por Zelle o Cash App; en tu panel, <i>Efectivo y saldo</i> te dice cuánto. Si el cliente pagó por Zelle o Cash App, OnRoute te paga lo tuyo con tu pago de la semana.</p>
        <h3>Seguridad</h3>
        <p>Respeta las leyes de tránsito, no uses el celular mientras manejas y mantén los pedidos cerrados y limpios. La dirección y el teléfono del cliente solo se muestran después de aceptar y no deben usarse para nada más.</p>` },

      { id: "tarifas", group: "Guía", title: "Tarifas y pagos", icon: "💵", html: `
        <table class="doc-table"><tr><th>Concepto</th><th>Quién paga</th><th>Monto</th></tr>
          <tr><td>Comisión por pedido de OnRoute</td><td>Negocio</td><td><b>$0</b></td></tr>
          <tr><td>Comisión de Stripe por pago con tarjeta</td><td>Negocio</td><td>La tarifa estándar de Stripe (aprox. 2.9% + 30¢ en EE. UU.)</td></tr>
          <tr><td>Pagos por Zelle, Cash App o efectivo</td><td>—</td><td>Sin comisión de OnRoute; llegan directo al negocio</td></tr>
          <tr><td>Envío a domicilio</td><td>Cliente</td><td>${fee}</td></tr>
          <tr><td>Propina</td><td>Cliente (opcional)</td><td>100% para el repartidor</td></tr>
          <tr><td>Parte del envío para el repartidor</td><td>—</td><td>${driverPct}%</td></tr>
          <tr><td>Parte del envío para OnRoute</td><td>—</td><td>${onroutePct}%</td></tr></table>
        <p class="hint">Las millas se calculan desde el negocio hasta la dirección de entrega. Los precios del menú los pone cada negocio.</p>` },

      { id: "faq", group: "Ayuda", title: "Preguntas frecuentes", icon: "❓", html: `
        <details><summary>¿Necesito cuenta para pedir?</summary><p>No. Puedes pedir como invitado. Con cuenta guardas tu historial, favoritos y sellos.</p></details>
        <details><summary>¿Por qué un negocio aparece cerrado?</summary><p>Está fuera de su horario, pausó los pedidos o, si es food truck, no está compartiendo su ubicación en este momento.</p></details>
        <details><summary>¿Puedo pagar con Zelle, Cash App o en efectivo?</summary><p>Sí, si el negocio lo acepta. Elige la forma de pago al final de tu pedido; también puedes combinar dos (ej. Zelle + efectivo). Con Zelle o Cash App manda el pago con tu número de pedido en la nota; tu pedido entra a la cocina cuando el negocio lo confirma.</p></details>
        <details><summary>Mandé el pago por Zelle y mi pedido sigue "por confirmar"</summary><p>El negocio tiene que ver el dinero en su app. Escríbele desde el chat de tu pedido. Si no te lo confirma, usa <i>Contacto y soporte</i>.</p></details>
        <details><summary>¿Por qué no puedo pagar a domicilio?</summary><p>Elige tu dirección de la lista de sugerencias (o toca <i>Aquí</i>) y revisa que esté dentro del área de entrega del negocio. El botón te dice qué falta.</p></details>
        <details><summary>¿Puedo pagar con Apple Pay o Google Pay?</summary><p>Sí, en los negocios que aceptan tarjeta. Elige <i>Apple Pay o tarjeta</i> (o <i>Google Pay o tarjeta</i>) y en la página de pago segura de Stripe toca el botón de Apple Pay o Google Pay. Aparece si tienes una tarjeta guardada en Apple Wallet (iPhone, iPad o Mac con Safari) o en Google Wallet / Chrome.</p></details>
        <details><summary>¿Es seguro pagar con tarjeta?</summary><p>Sí. El pago se hace en la página segura de Stripe; OnRoute nunca ve ni guarda los datos de tu tarjeta.</p></details>
        <details><summary>¿Cómo cancelo o pido un reembolso?</summary><p>Escríbele al negocio desde el chat de tu pedido. Si ya pagaste con tarjeta y hay un problema, usa <i>Contacto y soporte</i> y lo resolvemos.</p></details>
        <details><summary>No me llegan las notificaciones</summary><p>Toca <i>Avísame</i> en tu pedido y acepta el permiso. En iPhone instala OnRoute en tu pantalla de inicio. Deja la página del pedido abierta.</p></details>
        <details><summary>Negocio: ¿cuánto tarda la aprobación?</summary><p>Normalmente 1 o 2 días. Mientras tanto puedes preparar tu menú y tu perfil.</p></details>
        <details><summary>Repartidor: ¿cuándo me pagan?</summary><p>Con depósito por Stripe, al marcar la entrega (a veces Stripe tarda unas horas en liberar el saldo). Con Cash App, Zelle o Venmo, cada semana.</p></details>` },

      { id: "seguridad", group: "Ayuda", title: "Seguridad", icon: "🔒", html: `
        <ul class="doc-checks">
          <li><b>Pagos con Stripe:</b> los datos de tarjeta y de banco los maneja Stripe (certificado PCI DSS nivel 1). OnRoute no los ve ni los guarda.</li>
          <li><b>Cuentas protegidas:</b> inicio de sesión con correo y contraseña o con Google (Firebase Authentication).</li>
          <li><b>Reglas de acceso:</b> cada persona solo puede ver y cambiar lo que le corresponde: un negocio solo sus pedidos, un repartidor solo sus entregas, el cliente solo su pedido.</li>
          <li><b>Datos privados:</b> la dirección exacta y el teléfono del cliente solo los ve el repartidor que aceptó la entrega y el negocio. La licencia del repartidor solo la ve el administrador.</li>
          <li><b>Protección contra abuso:</b> App Check con reCAPTCHA comprueba que las peticiones vienen de la app de OnRoute.</li>
          <li><b>Precios verificados:</b> el servidor recalcula cada total con los precios reales del menú; lo que mande el navegador no cuenta.</li>
          <li><b>Conexión segura:</b> todo viaja cifrado (HTTPS).</li>
        </ul>
        <p>Si ves algo raro o crees que alguien usó tu cuenta, cambia tu contraseña y escríbenos en <i>Contacto y soporte</i>.</p>` },

      { id: "contacto", group: "Ayuda", title: "Contacto y soporte", icon: "✉️", html: `
        <p>¿Tuviste un problema con un pedido, un pago o la app? Cuéntanos y te respondemos lo antes posible.</p>
        <div id="supportBox"></div>` },

      { id: "terminos", group: "Legal", title: "Términos de uso", icon: "📄", html: `
        <p class="hint">Última actualización: ${UPDATED}</p>
        <p>Estos términos regulan el uso de OnRoute (la "Plataforma"), operada por InnovationTECH en San Antonio, Texas, EE. UU. Al usar OnRoute aceptas estos términos.</p>
        <h3>1. Qué es OnRoute</h3><p>OnRoute es una plataforma tecnológica que permite a negocios de comida publicar su menú y recibir pedidos, a clientes hacer pedidos y a repartidores independientes entregarlos. OnRoute no prepara alimentos ni es parte de la compraventa entre el cliente y el negocio.</p>
        <h3>2. Cuentas</h3><p>Debes dar información verdadera y cuidar tu contraseña. Eres responsable de lo que se haga con tu cuenta. Podemos suspender cuentas que incumplan estos términos o se usen para fraude.</p>
        <h3>3. Pedidos y precios</h3><p>Los precios, la disponibilidad, la calidad y la seguridad de los alimentos son responsabilidad de cada negocio. El total se confirma antes de pagar. Los pedidos para recoger pagados en efectivo se pagan directamente al negocio.</p>
        <h3>4. Pagos</h3><p>Los pagos con tarjeta los procesa Stripe en nombre del negocio, sujetos a los términos de Stripe. El costo de envío y la propina de pedidos a domicilio los cobra OnRoute para pagar al repartidor según las <a href="#ayuda/tarifas">tarifas publicadas</a>. Los pagos por Zelle, Cash App o efectivo se hacen directamente al negocio o al repartidor; OnRoute no procesa ese dinero, solo lleva el registro para que cada quien reciba su parte. El pedido entra a la cocina cuando el negocio confirma el pago.</p>
        <h3>5. Cancelaciones y reembolsos</h3><p>El negocio decide sobre cancelaciones de pedidos ya preparados. Si un pedido pagado con tarjeta no se entrega o llega incompleto por causas ajenas al cliente, contáctanos y gestionaremos un reembolso total o parcial con el negocio.</p>
        <h3>6. Entregas</h3><p>Los repartidores son contratistas independientes, no empleados de OnRoute ni del negocio. Los tiempos de entrega son estimados.</p>
        <h3>7. Uso aceptable</h3><p>No está permitido usar OnRoute para fraude, acoso, contenido ilegal u ofensivo, intentar acceder a datos de otros o afectar el funcionamiento de la plataforma. Los mensajes del chat deben limitarse al pedido.</p>
        <h3>8. Responsabilidad</h3><p>OnRoute se ofrece "tal cual". En la medida que lo permita la ley, InnovationTECH no es responsable por daños indirectos ni por actos de negocios, repartidores o clientes. Nuestra responsabilidad total por un pedido no excede el monto pagado por ese pedido.</p>
        <h3>9. Cambios</h3><p>Podemos actualizar estos términos; publicaremos la fecha de la última actualización. Si sigues usando OnRoute después de un cambio, aceptas la versión nueva.</p>
        <h3>10. Ley aplicable</h3><p>Estos términos se rigen por las leyes del estado de Texas, EE. UU.</p>` },

      { id: "privacidad", group: "Legal", title: "Política de privacidad", icon: "🛡️", html: `
        <p class="hint">Última actualización: ${UPDATED}</p>
        <h3>Qué datos recopilamos</h3>
        <ul><li><b>Cuenta:</b> nombre, correo, teléfono (opcional) y tipo de cuenta.</li>
          <li><b>Pedidos:</b> productos, totales, notas, nombre para el pedido y, a domicilio, la dirección, indicaciones y teléfono de entrega.</li>
          <li><b>Ubicación:</b> la que eliges compartir para ver negocios cercanos; la del food truck mientras comparte GPS; la del repartidor mientras está en línea o en una entrega.</li>
          <li><b>Repartidores:</b> datos del auto, foto y vencimiento de la licencia y método de cobro.</li>
          <li><b>Mensajes</b> del chat de cada pedido.</li>
          <li><b>Pagos:</b> los procesa Stripe; nosotros solo guardamos el estado del pago, no los datos de tarjeta ni de banco.</li></ul>
        <h3>Para qué los usamos</h3><p>Para operar los pedidos y entregas, procesar pagos, dar soporte, prevenir fraude y mejorar la app. <b>No vendemos tus datos.</b></p>
        <h3>Con quién los compartimos</h3><p>Con el negocio al que le pides; con el repartidor que acepta tu entrega (solo lo necesario para entregar); con proveedores que hacen funcionar la app: Google Firebase (base de datos e inicio de sesión), Stripe (pagos), Netlify (servidor de pagos), OpenStreetMap/Photon (búsqueda de direcciones) y reCAPTCHA (protección contra abuso); y con autoridades cuando la ley lo exija.</p>
        <h3>Cuánto tiempo</h3><p>Mientras tu cuenta esté activa o lo necesitemos para operar, cumplir obligaciones legales o fiscales y resolver disputas.</p>
        <h3>Tus opciones</h3><p>Puedes ver y editar tus datos en tu cuenta, dejar de compartir tu ubicación y pedir que borremos tu cuenta desde <a href="#ayuda/contacto">Contacto y soporte</a>.</p>
        <h3>Menores</h3><p>OnRoute no está dirigida a menores de 13 años. Para registrarse como negocio o repartidor se requiere ser mayor de 18.</p>` },

      { id: "terminos-repartidores", group: "Legal", title: "Términos para repartidores", icon: "🚗", html: `
        <p class="hint">Última actualización: ${UPDATED}</p>
        <h3>Relación</h3><p>Trabajas como <b>contratista independiente</b>. Decides cuándo conectarte y qué entregas aceptar. No eres empleado de OnRoute ni de los negocios.</p>
        <h3>Requisitos que mantienes vigentes</h3><ul><li>Licencia de manejo, registro del auto y seguro que cubra hacer entregas.</li><li>Tu información verdadera y actualizada.</li></ul>
        <h3>Pagos e impuestos</h3><p>Recibes lo indicado en <a href="#ayuda/tarifas">Tarifas</a>. Eres responsable de tus impuestos; con depósito por Stripe recibes tu formulario 1099 cuando corresponda.</p>
        <h3>Conducta</h3><p>Respeta las leyes de tránsito y de seguridad de alimentos, trata con respeto a clientes y negocios y usa sus datos solo para la entrega. Está prohibido marcar entregas que no hiciste.</p>
        <h3>Suspensión</h3><p>Podemos suspender tu cuenta por documentos vencidos, quejas graves, fraude o incumplimiento de estos términos.</p>` },
    ];
  };
})();
