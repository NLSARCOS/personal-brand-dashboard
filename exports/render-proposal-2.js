const { renderCarousel } = require('../slide-renderer');

const slides = [
  { html: `
<div class="slide hook-hero">
  <style>*{box-sizing:border-box;margin:0;padding:0}.slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:52px}.num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}.red{color:#e11d48}.rule{height:10px;background:#090909;width:58%;margin-bottom:28px}h1{font-size:114px;line-height:.78;letter-spacing:-.08em;text-transform:uppercase;font-weight:900;margin-top:36px;max-width:96%}.sub{margin-top:26px;font-size:28px;font-weight:800;line-height:1.15;max-width:88%;color:#333}.foot{position:absolute;left:52px;right:52px;bottom:52px;border-top:3px solid #090909;padding-top:18px;font-size:22px;font-weight:700;color:#444;line-height:1.18}</style>
  <div class="num">01</div><div class="rule"></div>
  <h1>EL MODELO NO<br>ES EL <span class="red">CUELLO</span><br>DE BOTELLA</h1>
  <div class="sub">Cuando OpenAI entra a AWS, la conversación deja de ser solo modelo y pasa a ser infraestructura.</div>
  <div class="foot">Esto no es solo distribución. Es señal de madurez operativa para IA en producción.</div>
</div>`},
  { html: `
<div class="slide context-news">
  <style>*{box-sizing:border-box;margin:0;padding:0}.slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:52px}.num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}.red{color:#e11d48}.rule{height:10px;background:#090909;width:58%;margin-bottom:28px}h1{font-size:74px;line-height:.82;letter-spacing:-.07em;text-transform:uppercase;font-weight:900;margin-top:34px;margin-bottom:28px;max-width:94%}.body{font-size:29px;font-weight:600;line-height:1.28;color:#333;max-width:90%}.source{position:absolute;bottom:52px;left:52px;font-size:18px;color:#999;font-family:'IBM Plex Mono',monospace}</style>
  <div class="num">02</div><div class="rule"></div>
  <h1>OPENAI + AWS<br><span class="red">NO ES SOLO</span><br>UN MARKETPLACE</h1>
  <div class="body">Significa modelos, Codex y agentes gestionados viviendo más cerca de tu base de datos, tu red y tus controles reales de plataforma.</div>
  <div class="source">fuente: openai + aws marketplace</div>
</div>`},
  { html: `
<div class="slide grid-4">
  <style>*{box-sizing:border-box;margin:0;padding:0}.slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden}.num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}.title{padding:110px 52px 24px;font-size:52px;font-weight:900;text-transform:uppercase;letter-spacing:-.05em;line-height:.86;max-width:92%}.cells{display:grid;grid-template-columns:1fr 1fr;position:absolute;left:52px;right:52px;bottom:52px;top:330px;gap:10px}.cell{border:3px solid #090909;padding:24px;display:flex;flex-direction:column;justify-content:center;background:#fff}.cell.dark{background:#090909;color:#fff}.cell b{font-size:40px;font-weight:900;display:block;margin-bottom:8px}.cell span{font-size:22px;font-weight:800;line-height:1.16}.red{color:#e11d48}</style>
  <div class="num">03</div>
  <div class="title">LO QUE <span class="red">CAMBIA</span><br>PARA EQUIPOS</div>
  <div class="cells">
    <div class="cell dark"><b>LATENCIA</b><span>Menos hops y tiempos más predecibles para agentes.</span></div>
    <div class="cell"><b>COSTOS</b><span>Facturación más trazable dentro del stack AWS.</span></div>
    <div class="cell"><b>SEGURIDAD</b><span>IAM, KMS y controles que platform ya entiende.</span></div>
    <div class="cell dark"><b>OPERACIÓN</b><span>La IA empieza a comportarse como infraestructura.</span></div>
  </div>
</div>`},
  { html: `
<div class="slide take-inverted">
  <style>*{box-sizing:border-box;margin:0;padding:0}.slide{width:1080px;height:1350px;background:#090909;color:#f5f1e8;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:52px}.num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}.red{color:#e11d48}.label{font-size:18px;font-weight:900;color:#e11d48;text-transform:uppercase;letter-spacing:.1em;margin-top:36px;margin-bottom:22px}h1{font-size:70px;line-height:.84;letter-spacing:-.06em;text-transform:uppercase;font-weight:900;margin-top:120px;max-width:94%}.sub{position:absolute;left:52px;right:52px;bottom:52px;font-size:24px;font-weight:700;color:#d1d5db;line-height:1.18}</style>
  <div class="num">04</div><div class="label">TAKE</div>
  <h1>LA VENTAJA YA NO ES SOLO EL <span class="red">MODELO</span></h1>
  <div class="sub">La ventaja está en qué tan bien integras IA en tu stack sin crear más deuda técnica que velocidad.</div>
</div>`},
  { html: `
<div class="slide close-summary">
  <style>*{box-sizing:border-box;margin:0;padding:0}.slide{width:1080px;height:1350px;background:#f5f1e8;color:#090909;font-family:Inter,sans-serif;position:relative;overflow:hidden;padding:52px}.num{position:absolute;top:40px;left:52px;font-family:'IBM Plex Mono',monospace;font-size:16px;color:#777;font-weight:600}.rule{height:10px;background:#090909;width:58%;margin-bottom:28px}h2{font-size:56px;font-weight:900;text-transform:uppercase;letter-spacing:-.05em;margin-top:36px;margin-bottom:34px;line-height:.86;max-width:94%}.points{display:grid;gap:22px}.pt{border-left:8px solid #e11d48;padding-left:22px}.pt b{font-size:30px;font-weight:900;display:block;text-transform:uppercase}.pt span{font-size:21px;color:#555;font-weight:700;line-height:1.2;display:block;margin-top:6px}.cta{position:absolute;bottom:52px;left:52px;right:52px;font-size:24px;font-weight:900;color:#e11d48;text-transform:uppercase;letter-spacing:.04em}</style>
  <div class="num">05</div><div class="rule"></div>
  <h2>ANTES DE CELEBRAR<br>AWS + OPENAI</h2>
  <div class="points">
    <div class="pt"><b>mide el lock-in</b><span>No conviertas una integración rápida en una dependencia rígida.</span></div>
    <div class="pt"><b>mira la arquitectura</b><span>El cambio importante es operativo, no solo comercial.</span></div>
    <div class="pt"><b>diseña abstractions</b><span>Piensa en salida antes de escalar entrada.</span></div>
  </div>
  <div class="cta">#LLMOps #AWS #OpenSourceAI #AIInfra #ProduccionIA</div>
</div>`}
];
(async()=>{const results=await renderCarousel(slides,'4:5',__dirname);console.log(JSON.stringify(results,null,2));})();