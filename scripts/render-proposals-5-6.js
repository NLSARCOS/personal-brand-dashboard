const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const outDir = path.join(__dirname, '..', 'uploads', 'proposals');
fs.mkdirSync(outDir, { recursive: true });

const baseHead = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box} html,body{margin:0;padding:0;background:#080b12}
body{font-family:Inter,sans-serif}
.slide{width:1080px;height:1350px;position:relative;overflow:hidden}
.mono{font-family:'IBM Plex Mono',monospace}
.h{font-family:'Space Grotesk',sans-serif}
.small{font-size:24px;letter-spacing:.12em;text-transform:uppercase}
</style>`;

const slides = [
  {
    file: 'proposal5-slide-1.png',
    html: `<!doctype html><html><head>${baseHead}<style>
      .slide{background:radial-gradient(circle at 20% 0%,#223b7a 0,#07101f 40%,#05070d 100%);color:#f4f7ff;padding:52px}
      .frame{position:absolute;inset:18px;border:1px solid rgba(255,255,255,.14);border-radius:14px}
      .tag{color:#8fb6ff}.issue{position:absolute;top:52px;right:52px;color:#6b8fd4;font-size:22px}
      h1{font-family:'Space Grotesk',sans-serif;font-size:96px;line-height:.88;letter-spacing:-.07em;margin:128px 0 18px;max-width:92%}
      .deck{font-size:32px;color:#b9c7e6;line-height:1.15;max-width:90%}
      .bars{position:absolute;left:52px;right:52px;bottom:52px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      .bar{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px}
      .bar b{display:block;font-size:34px}.bar span{font-size:18px;color:#9fb2d8}
    </style></head><body><div class="slide"><div class="frame"></div><div class="small mono tag">Open source · empresa</div><div class="issue mono">01</div><h1>YA NO ES SOLO<br>UNA OPCIÓN<br>BARATA</h1><div class="deck">La IA open source empieza a verse como una opción seria para empresas reales.</div><div class="bars"><div class="bar"><b>control</b><span>más margen para operar</span></div><div class="bar"><b>costos</b><span>más claridad al escalar</span></div><div class="bar"><b>dependencia</b><span>menos lock-in cerrado</span></div></div></div></body></html>`
  },
  {
    file: 'proposal5-slide-2.png',
    html: `<!doctype html><html><head>${baseHead}<style>
      .slide{background:radial-gradient(circle at 20% 0%,#223b7a 0,#07101f 40%,#05070d 100%);color:#f4f7ff;padding:52px}
      .frame{position:absolute;inset:18px;border:1px solid rgba(255,255,255,.14);border-radius:14px}
      .tag{color:#8fb6ff}.issue{position:absolute;top:52px;right:52px;color:#6b8fd4;font-size:22px}
      h1{font-family:'Space Grotesk',sans-serif;font-size:86px;line-height:.9;letter-spacing:-.06em;margin:116px 0 18px;max-width:92%}
      .deck{font-size:31px;color:#b9c7e6;line-height:1.15;max-width:90%}
      .bars{position:absolute;left:52px;right:52px;bottom:52px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      .bar{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px}
      .bar b{display:block;font-size:32px}.bar span{font-size:18px;color:#9fb2d8}
    </style></head><body><div class="slide"><div class="frame"></div><div class="small mono tag">Granite 4.1 · qué cambia</div><div class="issue mono">02</div><h1>No es solo rendimiento.<br>Es una señal de madurez.</h1><div class="deck">Contexto largo, licencia abierta y foco en calidad: el open source empieza a jugar con más seriedad.</div><div class="bars"><div class="bar"><b>15T</b><span>tokens de entrenamiento</span></div><div class="bar"><b>512K</b><span>contexto largo</span></div><div class="bar"><b>Apache 2.0</b><span>licencia abierta</span></div></div></div></body></html>`
  },
  {
    file: 'proposal5-slide-3.png',
    html: `<!doctype html><html><head>${baseHead}<style>
      .slide{background:radial-gradient(circle at 20% 0%,#223b7a 0,#07101f 40%,#05070d 100%);color:#f4f7ff;padding:52px}
      .frame{position:absolute;inset:18px;border:1px solid rgba(255,255,255,.14);border-radius:14px}
      .tag{color:#8fb6ff}.issue{position:absolute;top:52px;right:52px;color:#6b8fd4;font-size:22px}
      h1{font-family:'Space Grotesk',sans-serif;font-size:82px;line-height:.9;letter-spacing:-.06em;margin:112px 0 24px;max-width:90%}
      .kpis{display:grid;grid-template-columns:1fr 1fr;gap:12px;position:absolute;left:52px;right:52px;bottom:52px}
      .k{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:20px}
      .k b{display:block;font-size:30px;color:#fff;margin-bottom:10px}.k span{font-size:20px;color:#b9c7e6;line-height:1.18}
    </style></head><body><div class="slide"><div class="frame"></div><div class="small mono tag">Empresa real · control y costo</div><div class="issue mono">03</div><h1>Lo que importa no es solo usar IA.<br>Es poder operarla bien.</h1><div class="kpis"><div class="k"><b>más control</b><span>sobre cómo la integras a tu operación</span></div><div class="k"><b>menos dependencia</b><span>de un único proveedor cerrado</span></div><div class="k"><b>costos más claros</b><span>para probar y escalar con criterio</span></div><div class="k"><b>mejor encaje</b><span>con compliance y procesos internos</span></div></div></div></body></html>`
  },
  {
    file: 'proposal5-slide-4.png',
    html: `<!doctype html><html><head>${baseHead}<style>
      .slide{background:radial-gradient(circle at 20% 0%,#223b7a 0,#07101f 40%,#05070d 100%);color:#f4f7ff;padding:52px}
      .frame{position:absolute;inset:18px;border:1px solid rgba(255,255,255,.14);border-radius:14px}
      .tag{color:#8fb6ff}.issue{position:absolute;top:52px;right:52px;color:#6b8fd4;font-size:22px}
      h1{font-family:'Space Grotesk',sans-serif;font-size:80px;line-height:.9;letter-spacing:-.06em;margin:112px 0 18px;max-width:90%}
      .rows{position:absolute;left:52px;right:52px;bottom:52px;display:grid;grid-template-columns:1fr;gap:12px}
      .row{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:22px;font-size:25px;line-height:1.15;font-weight:700;color:#eef3ff}
    </style></head><body><div class="slide"><div class="frame"></div><div class="small mono tag">Dependencia y arquitectura</div><div class="issue mono">04</div><h1>La pregunta ya no es solo “¿funciona?”</h1><div class="rows"><div class="row">¿Lo puedes integrar sin crear más complejidad?</div><div class="row">¿Lo puedes operar sin quedar atado a una sola forma de trabajar?</div><div class="row">¿Lo puedes sostener cuando el experimento se convierta en proceso real?</div></div></div></body></html>`
  },
  {
    file: 'proposal5-slide-5.png',
    html: `<!doctype html><html><head>${baseHead}<style>
      .slide{background:radial-gradient(circle at 20% 0%,#223b7a 0,#07101f 40%,#05070d 100%);color:#f4f7ff;padding:52px}
      .frame{position:absolute;inset:18px;border:1px solid rgba(255,255,255,.14);border-radius:14px}
      .tag{color:#8fb6ff}.issue{position:absolute;top:52px;right:52px;color:#6b8fd4;font-size:22px}
      .mega{font-family:'Space Grotesk',sans-serif;font-size:116px;line-height:.82;letter-spacing:-.08em;font-weight:700;margin:110px 0 18px}
      .accent{color:#8fb6ff}.strip{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:20px 22px;font-size:28px;font-weight:800;margin:20px 0;color:#f4f7ff}
      .list{display:grid;grid-template-columns:1fr;gap:10px;position:absolute;left:52px;right:52px;bottom:52px}
      .item{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:16px 18px;font-size:23px;font-weight:700;color:#cfe0ff}
    </style></head><body><div class="slide"><div class="frame"></div><div class="small mono tag">Take final</div><div class="issue mono">05</div><div class="mega">GANA LO<br><span class="accent">CONFIABLE</span></div><div class="strip">Cuando una tecnología madura, deja de venderse solo por lo impresionante.</div><div class="list"><div class="item">open source útil &gt; open source solo “barato”</div><div class="item">empresa real = control + costo + sostenibilidad</div><div class="item">esa es la señal que vale mirar ahora</div></div></div></body></html>`
  },
  {
    file: 'proposal6-single.png',
    html: `<!doctype html><html><head>${baseHead}<style>
      .slide{background:#0d0d0d;color:#f7f7f7;padding:58px}
      .wrap{position:absolute;left:58px;right:58px;top:50%;transform:translateY(-50%);text-align:left}
      .eyebrow{color:#f97316}.headline{font-size:116px;line-height:.84;letter-spacing:-.08em;font-weight:900;margin:18px 0 18px;text-transform:uppercase}
      .accent{color:#f97316}.sub{font-size:34px;line-height:1.14;color:#d1d5db;max-width:90%;font-weight:600;margin-bottom:28px}
      .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      .box{border:2px solid #3f3f46;border-radius:14px;padding:18px;background:#151515}.box b{display:block;font-size:20px;color:#f97316;margin-bottom:8px}.box span{font-size:20px;line-height:1.15}
    </style></head><body><div class="slide"><div class="wrap"><div class="small mono eyebrow">Agentes · criterio · riesgo</div><div class="headline">DECIDIR MAL<br><span class="accent">CON CONFIANZA</span></div><div class="sub">Ese es un problema más peligroso que responder mal. Porque parece correcto justo cuando más daño puede hacer.</div><div class="grid"><div class="box"><b>criterio</b><span>no basta con sonar inteligente</span></div><div class="box"><b>riesgo</b><span>puede empujar una mala decisión</span></div><div class="box"><b>valor real</b><span>confiar solo cuando decide bien</span></div></div></div></div></body></html>`
  }
];

(async () => {
  const browser = await puppeteer.launch({headless:'new', args:['--no-sandbox','--disable-setuid-sandbox']});
  for (const slide of slides) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    await page.setContent(slide.html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2200));
    const out = path.join(outDir, slide.file);
    await page.screenshot({ path: out, type: 'png' });
    console.log(out);
    await page.close();
  }
  await browser.close();
})();
