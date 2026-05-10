const { renderCarousel } = require('../slide-renderer');

const slides = [
  {
    html: `
<div class="slide hook-hero">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:60px}
    .num{position:absolute;top:48px;left:60px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .red{color:#e11d48}.rule{height:10px;background:#090909;width:55%;margin-bottom:40px}
    .hook-hero h1{font-size:124px;line-height:.78;letter-spacing:-.08em;text-transform:uppercase;font-weight:900;margin-top:60px;max-width:92%}
    .hook-hero .sub{position:absolute;bottom:60px;left:60px;right:60px;font-size:28px;font-weight:700;line-height:1.15;color:#444}
  </style>
  <div class="num">01</div>
  <div class="rule"></div>
  <h1>VIBE CODING<br>TE DA <span class="red">VELOCIDAD</span></h1>
  <div class="sub">Pero sin guardrails también acelera bugs, deuda técnica y riesgos operativos.</div>
</div>`
  },
  {
    html: `
<div class="slide context-split">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden}
    .num{position:absolute;top:48px;left:60px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .context-split{display:grid;grid-template-columns:1fr 1fr;gap:0}
    .context-split .left{background:#090909;color:#fff;padding:60px;display:flex;flex-direction:column;justify-content:center}
    .context-split .left h1{font-size:74px;line-height:.82;letter-spacing:-.06em;text-transform:uppercase;font-weight:900}
    .context-split .right{padding:60px;display:flex;flex-direction:column;justify-content:center}
    .context-split .right p{font-size:30px;font-weight:600;line-height:1.3}
    .red{color:#e11d48}
  </style>
  <div class="left">
    <div class="num" style="color:#777">02</div>
    <h1>PROTOTIPO<br>LIBRE</h1>
  </div>
  <div class="right">
    <p><strong>Despliegue con disciplina.</strong><br><br>Mi regla simple no es frenar la experimentación. Es evitar que la velocidad tape controles básicos justo cuando algo empieza a tocar producción.</p>
  </div>
</div>`
  },
  {
    html: `
<div class="slide develop-checklist">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:60px}
    .num{position:absolute;top:48px;left:60px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .red{color:#e11d48}.rule{height:10px;background:#090909;width:55%;margin-bottom:40px}
    .develop-checklist h2{font-size:54px;font-weight:900;text-transform:uppercase;letter-spacing:-.05em;margin-top:40px;margin-bottom:50px;line-height:.92;max-width:92%}
    .develop-checklist .items{display:grid;gap:20px}
    .develop-checklist .item{display:grid;grid-template-columns:88px 1fr;align-items:start;border-top:3px solid #090909;padding-top:20px}
    .develop-checklist .item b{font-size:38px;font-weight:900}
    .develop-checklist .item span{font-size:28px;font-weight:800;line-height:1.2;text-transform:uppercase;letter-spacing:-.03em}
  </style>
  <div class="num">03</div>
  <div class="rule"></div>
  <h2>CHECKLIST <span class="red">MÍNIMO</span> ANTES DE SUBIR ALGO</h2>
  <div class="items">
    <div class="item"><b>01</b><span>Pruebas antes de confiar en la velocidad</span></div>
    <div class="item"><b>02</b><span>Trazabilidad para saber qué cambió</span></div>
    <div class="item"><b>03</b><span>Gestión de secretos fuera del caos</span></div>
    <div class="item"><b>04</b><span>Control de permisos para no romper más</span></div>
  </div>
</div>`
  },
  {
    html: `
<div class="slide take-inverted">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#090909;color:#f5f1e8;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:60px}
    .num{position:absolute;top:48px;left:60px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .red{color:#e11d48}
    .label{font-size:18px;font-weight:900;color:#e11d48;text-transform:uppercase;letter-spacing:.1em;margin-top:40px;margin-bottom:20px}
    h1{font-size:72px;line-height:.82;letter-spacing:-.06em;text-transform:uppercase;font-weight:900;margin-top:120px;max-width:92%}
    .sub{position:absolute;left:60px;right:60px;bottom:70px;font-size:24px;font-weight:700;color:#d1d5db;line-height:1.25}
  </style>
  <div class="num">04</div>
  <div class="label">TAKE</div>
  <h1>LA VELOCIDAD <span class="red">SIN DISCIPLINA</span><br>NO ESCALA</h1>
  <div class="sub">Vibe coding sirve muchísimo para explorar. Pero publicar sin guardrails convierte velocidad en riesgo.</div>
</div>`
  }
];

(async () => {
  const results = await renderCarousel(slides, '4:5', __dirname);
  console.log(JSON.stringify(results, null, 2));
})();
