const { renderCarousel } = require('../slide-renderer');

const slides = [
  {
    html: `
<div class="slide hook-hero">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:52px}
    .num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .red{color:#e11d48}.rule{height:10px;background:#090909;width:58%;margin-bottom:28px}
    h1{font-size:118px;line-height:.78;letter-spacing:-.08em;text-transform:uppercase;font-weight:900;margin-top:36px;max-width:96%}
    .sub{margin-top:28px;font-size:30px;font-weight:800;line-height:1.12;max-width:88%;color:#2f2f2f}
    .strip{position:absolute;left:52px;right:52px;bottom:52px;border-top:3px solid #090909;padding-top:18px;font-size:24px;font-weight:700;line-height:1.2;color:#444}
  </style>
  <div class="num">01</div>
  <div class="rule"></div>
  <h1>VIBE CODING<br>DA <span class="red">VELOCIDAD</span></h1>
  <div class="sub">Pero sin guardrails también acelera bugs, deuda técnica y riesgos operativos.</div>
  <div class="strip">El problema no es prototipar rápido. El problema es confundir velocidad con criterio de release.</div>
</div>`
  },
  {
    html: `
<div class="slide grid-4">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden}
    .num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .title{padding:110px 52px 24px;font-size:56px;font-weight:900;text-transform:uppercase;letter-spacing:-.06em;line-height:.84;max-width:90%}
    .cells{display:grid;grid-template-columns:1fr 1fr;position:absolute;left:52px;right:52px;bottom:52px;top:340px;gap:10px}
    .cell{border:3px solid #090909;padding:26px;display:flex;flex-direction:column;justify-content:center;background:#fff}
    .cell.dark{background:#090909;color:#fff}
    .cell b{font-size:42px;font-weight:900;display:block;margin-bottom:10px}
    .cell span{font-size:23px;font-weight:800;line-height:1.15;letter-spacing:-.02em}
    .red{color:#e11d48}
  </style>
  <div class="num">02</div>
  <div class="title">PROTOTIPO <span class="red">LIBRE</span>.<br>DESPLIEGUE CON DISCIPLINA.</div>
  <div class="cells">
    <div class="cell dark"><b>DEV</b><span>Explora rápido. Rompe, prueba y aprende.</span></div>
    <div class="cell"><b>RELEASE</b><span>Sube solo lo que ya tiene controles mínimos.</span></div>
    <div class="cell"><b>VELOCIDAD</b><span>Sirve para descubrir opciones, no para saltarte guardrails.</span></div>
    <div class="cell dark"><b>CRITERIO</b><span>Lo que llega a producción necesita disciplina operativa.</span></div>
  </div>
</div>`
  },
  {
    html: `
<div class="slide develop-checklist">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:52px}
    .num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .red{color:#e11d48}.rule{height:10px;background:#090909;width:58%;margin-bottom:28px}
    h2{font-size:58px;font-weight:900;text-transform:uppercase;letter-spacing:-.06em;margin-top:26px;margin-bottom:34px;line-height:.88;max-width:94%}
    .items{display:grid;gap:18px}
    .item{display:grid;grid-template-columns:86px 1fr;align-items:start;border-top:3px solid #090909;padding-top:18px}
    .item b{font-size:38px;font-weight:900}
    .item span{font-size:27px;font-weight:800;line-height:1.16;letter-spacing:-.02em}
    .foot{position:absolute;left:52px;right:52px;bottom:52px;font-size:21px;color:#555;font-weight:700;line-height:1.2}
  </style>
  <div class="num">03</div>
  <div class="rule"></div>
  <h2>CHECKLIST <span class="red">MÍNIMO</span><br>ANTES DE PUBLICAR</h2>
  <div class="items">
    <div class="item"><b>01</b><span>PRUEBAS PARA NO CONFUNDIR VELOCIDAD CON CALIDAD</span></div>
    <div class="item"><b>02</b><span>TRAZABILIDAD PARA ENTENDER QUÉ CAMBIÓ Y POR QUÉ</span></div>
    <div class="item"><b>03</b><span>GESTIÓN DE SECRETOS FUERA DEL CAOS DEL PROTOTIPO</span></div>
    <div class="item"><b>04</b><span>CONTROL DE PERMISOS PARA NO ESCALAR EL RIESGO</span></div>
  </div>
  <div class="foot">Si no tienes esto, quizá tienes un demo rápido… pero todavía no un release serio.</div>
</div>`
  },
  {
    html: `
<div class="slide close-summary">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .slide{width:1080px;height:1350px;background:#090909;color:#f5f1e8;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:52px}
    .num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}
    .rule{height:10px;background:#f5f1e8;width:58%;margin-bottom:28px}
    h2{font-size:64px;font-weight:900;text-transform:uppercase;letter-spacing:-.06em;margin-top:36px;margin-bottom:40px;line-height:.86;max-width:94%}
    .points{display:grid;gap:24px}
    .pt{border-left:8px solid #e11d48;padding-left:24px}
    .pt b{font-size:31px;font-weight:900;display:block;text-transform:uppercase;line-height:1}
    .pt span{font-size:22px;color:#d1d5db;font-weight:700;line-height:1.18;display:block;margin-top:8px}
    .cta{position:absolute;bottom:52px;left:52px;right:52px;font-size:24px;font-weight:900;color:#e11d48;text-transform:uppercase;letter-spacing:.04em}
  </style>
  <div class="num">04</div>
  <div class="rule"></div>
  <h2>LA VELOCIDAD<br>SIEMPRE NECESITA<br>DISCIPLINA</h2>
  <div class="points">
    <div class="pt"><b>Explora libre</b><span>Usa vibe coding para descubrir y aprender más rápido.</span></div>
    <div class="pt"><b>Despliega con control</b><span>Producción exige pruebas, trazabilidad y permisos claros.</span></div>
    <div class="pt"><b>No escales el caos</b><span>Sin guardrails, la velocidad también multiplica errores.</span></div>
  </div>
  <div class="cta">#VibeCoding #DevTools #SoftwareEngineering #AIProduct #DevOps</div>
</div>`
  }
];

(async () => {
  const results = await renderCarousel(slides, '4:5', __dirname);
  console.log(JSON.stringify(results, null, 2));
})();
