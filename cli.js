#!/usr/bin/env node
/**
 * Hermes Agent CLI — Interfaz de línea de comandos para el Personal Brand Dashboard.
 *
 * Permite al agente de IA:
 *  - Leer contexto completo de marca (editorial, diseño, prompts)
 *  - Crear/listar/aprobar propuestas de contenido
 *  - Subir imágenes a propuestas
 *  - Gestionar hot alerts (noticias en caliente)
 *  - Ver calendario y posts
 *  - Obtener estadísticas
 *
 * Uso:
 *   node cli.js <comando> [opciones]
 */

const fs = require('fs');
const path = require('path');

// Importamos directamente la base de datos (no necesita servidor corriendo)
const { posts, media, tasks, settings, proposals, researchSources, hotAlerts } = require('./db');
const monitor = require('./monitor');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function printJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printHelp() {
  console.log(`
Hermes Agent CLI — Dashboard Editorial

USO:
  node cli.js <comando> [opciones]

COMANDOS DE CONTEXTO:
  context                          Muestra el contexto completo de marca
  stats                            Estadísticas del dashboard

COMANDOS DE PROPUESTAS:
  proposals list [--status pending|approved|rejected|merged]
  proposal get <id>
  proposal create --title "..." --copy "..." [opciones]
  proposal approve <id> [--title "..."] [--copy "..."]
  proposal reject <id>
  proposal merge <proposal-id> <post-id>
  proposal upload-images <id> <ruta1> [ruta2 ...]

COMANDOS DE HOT ALERTS:
  hot-alerts list [--status active|published|dismissed]
  hot-alert create --title "..." --summary "..." [opciones]
  hot-alert publish <id> [--title "..."] [--copy "..."]
  hot-alert dismiss <id>

COMANDOS DE POSTS:
  posts list [--status ...] [--format ...]
  post get <id>
  post schedule <id> --date YYYY-MM-DD

COMANDOS DE CALENDARIO:
  calendar [YYYY-MM]               Ver posts del mes (default: mes actual)
  week [YYYY-MM-DD]                Ver posts de la semana (default: hoy)

COMANDOS DE MONITOREO (hot alerts automáticos):
  monitor sources                  Listar fuentes RSS configuradas
  monitor run [--dry-run]          Ejecutar monitoreo y crear alertas
  monitor add-source --id <id> --name "..." --url <rss> --keywords "kw1,kw2"
  monitor remove-source <id>
  monitor history                  Ver historial de items procesados

OPCIONES PARA proposal create:
  --title "Título"
  --copy "Texto sugerido"
  --format text-only|single-image|carousel|gif|lead-magnet-pdf
  --style premium-editorial|swiss-brutal|dashboard|blueprint|founder-note|data-poster
  --platforms linkedin,threads      (default: linkedin)
  --research "Resumen de investigación"
  --sources '[{"url":"...","title":"..."}]'
  --notes "Notas del agente"
  --priority normal|hot
  --scheduled-at YYYY-MM-DD

OPCIONES PARA hot-alert create:
  --title "Título"
  --summary "Resumen"
  --urgency "Razón de urgencia"
  --source-url "https://..."
  --copy "Copy sugerido"
  --format text-only|single-image|carousel|gif

EJEMPLOS:
  node cli.js context
  node cli.js proposal create --title "Nuevo modelo X" --copy "El cuello de botella..." --format carousel --style premium-editorial
  node cli.js proposal approve 42
  node cli.js hot-alert create --title "Bug crítico en OpenAI" --summary "..." --urgency "Seguridad"
  node cli.js calendar 2026-05
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = [];
  const flags = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      cmd.push(a);
      i++;
    }
  }
  return { cmd, flags };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFileToUploads(srcPath, subdir = 'proposals') {
  ensureDir(path.join(__dirname, 'uploads', subdir));
  const ext = path.extname(srcPath);
  const base = path.basename(srcPath, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const destName = `${base}_${Date.now()}${ext}`;
  const destPath = path.join(__dirname, 'uploads', subdir, destName);
  fs.copyFileSync(srcPath, destPath);
  return destPath;
}

// ─────────────────────────────────────────────
// Contexto de marca
// ─────────────────────────────────────────────

function getHermesContext() {
  const editorial = settings.get('editorial_guidelines') || '';

  let designManual = '';
  const designPath = path.join(__dirname, 'manual-lineamientos-diseno-aprobado-nelson.md');
  if (fs.existsSync(designPath)) designManual = fs.readFileSync(designPath, 'utf8');

  let contentManual = '';
  const contentPath = path.join(__dirname, 'manual-lineamientos-contenido-nelson.md');
  if (fs.existsSync(contentPath)) contentManual = fs.readFileSync(contentPath, 'utf8');

  let designHtml = '';
  const htmlPath = path.join(__dirname, 'post-prueba-direcciones-v2.html');
  if (fs.existsSync(htmlPath)) designHtml = fs.readFileSync(htmlPath, 'utf8');

  let designPrompts = {};
  const promptsPath = path.join(__dirname, 'hermes-design-prompts.json');
  if (fs.existsSync(promptsPath)) designPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));

  return {
    brand: {
      name: 'Nelson Sarcos',
      accent: '#f97316',
      bg: '#080b12',
      fonts: ['Inter', 'IBM Plex Mono', 'Space Grotesk'],
      aspect_ratio: '4:5'
    },
    editorial_guidelines: editorial,
    content_manual: contentManual,
    design_manual: designManual,
    design_reference_html_sample: designHtml.slice(0, 3000) + (designHtml.length > 3000 ? '\n... [truncado]' : ''),
    design_prompts: designPrompts,
    approved_styles: ['premium-editorial', 'swiss-brutal', 'dashboard', 'blueprint', 'founder-note', 'data-poster'],
    formats: ['text-only', 'single-image', 'carousel', 'gif', 'lead-magnet-pdf'],
    daily_target: 2,
    rules: [
      'Titulares grandes con presencia real — nunca pequeños frente al canvas',
      'Fondo oscuro con gradientes sutiles — nunca plano',
      'Composición densa — evitar zonas muertas sin intención',
      'Cada slide aporta algo diferente — no repetir layouts',
      'Progresión narrativa: hook → contexto → desarrollo → marco → cierre',
      'NO usar palabras meta (carrusel, post, slide, LinkedIn, marca personal)',
      'Respetar estructura y proporciones del HTML de referencia aprobado',
      'Container queries (cqw) para responsive en piezas 4:5',
      'Investigar antes de proponer. Mínimo 2 fuentes primarias.',
      'Tono humano, claro, técnico, sin hype. Español.',
      'Calidad > cantidad. 2 posts en días de publicación.'
    ]
  };
}

// ─────────────────────────────────────────────
// Comandos
// ─────────────────────────────────────────────

function cmdContext() {
  printJSON(getHermesContext());
}

function cmdStats() {
  const stats = posts.getStats();
  const pendingProposals = proposals.countPending();
  const todayProposals = proposals.countToday();
  const activeAlerts = hotAlerts.countActive();

  printJSON({
    ...stats,
    pending_proposals: pendingProposals,
    proposals_today: todayProposals,
    active_hot_alerts: activeAlerts,
    proposal_quota_remaining: Math.max(0, 2 - todayProposals)
  });
}

// ─── Propuestas ───

function cmdProposalsList({ status } = {}) {
  const list = proposals.getAll({ status });
  printJSON(list.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    format: p.suggested_format,
    priority: p.priority,
    created_at: p.created_at,
    reviewed_at: p.reviewed_at
  })));
}

function cmdProposalGet(id) {
  const p = proposals.getById(id);
  if (!p) {
    console.error(JSON.stringify({ error: 'Propuesta no encontrada' }));
    process.exit(1);
  }
  printJSON(p);
}

function cmdProposalCreate(flags) {
  const todayCount = proposals.countToday();
  if (todayCount >= 2) {
    console.error(JSON.stringify({ error: 'Límite diario alcanzado: ya hay 2 propuestas de hoy' }));
    process.exit(1);
  }

  const data = {
    title: flags.title || '',
    suggested_copy: flags.copy || flags['suggested-copy'] || '',
    suggested_format: flags.format || 'text-only',
    style: flags.style || null,
    suggested_platforms: (flags.platforms || 'linkedin').split(',').map(s => s.trim()),
    research_summary: flags.research || '',
    sources: [],
    agent_notes: flags.notes || '',
    priority: flags.priority || 'normal',
    images: []
  };

  if (flags.sources) {
    try { data.sources = JSON.parse(flags.sources); } catch {}
  }

  const id = proposals.create(data);

  // Si viene --scheduled-at, creamos un post en estado approved con fecha
  if (flags['scheduled-at']) {
    const postId = posts.create({
      slug: `proposal-${id}-${Date.now()}`,
      title: data.title,
      content: data.suggested_copy,
      status: 'approved',
      format: data.suggested_format,
      style: data.style,
      platforms: data.suggested_platforms,
      scheduled_at: flags['scheduled-at'],
      research_insight: data.research_summary,
      editorial_angle: data.agent_notes
    });
    proposals.update(id, { post_id: postId, status: 'approved' });
    printJSON({ ok: true, proposal_id: id, post_id: postId, message: 'Propuesta creada y agendada' });
    return;
  }

  printJSON({ ok: true, id, message: 'Propuesta creada', remaining_quota: Math.max(0, 2 - (todayCount + 1)) });
}

function cmdProposalApprove(id, flags) {
  const p = proposals.getById(id);
  if (!p) {
    console.error(JSON.stringify({ error: 'Propuesta no encontrada' }));
    process.exit(1);
  }

  const postData = {
    slug: `proposal-${p.id}-${Date.now()}`,
    title: flags.title || p.title,
    content: flags.copy || p.suggested_copy || '',
    status: 'approved',
    format: flags.format || p.suggested_format || 'text-only',
    style: flags.style || p.style || null,
    platforms: p.suggested_platforms || ['linkedin'],
    research_insight: p.research_summary || '',
    editorial_angle: p.agent_notes || ''
  };

  const postId = posts.create(postData);

  // Transferir imágenes de la propuesta al post
  const imgs = p.images || [];
  imgs.forEach((imgPath, i) => {
    const absPath = path.isAbsolute(imgPath) ? imgPath : path.join(__dirname, imgPath);
    if (fs.existsSync(absPath)) {
      media.add(postId, {
        file_name: path.basename(imgPath),
        file_path: imgPath,
        original_name: path.basename(imgPath),
        mime_type: 'image/jpeg',
        file_size: fs.statSync(absPath).size,
        sort_order: i
      });
    }
  });

  // Transferir fuentes de investigación
  const sources = researchSources.getByProposalId(p.id);
  for (const s of sources) {
    researchSources.create({ ...s, post_id: postId, proposal_id: null });
  }

  proposals.update(p.id, { status: 'approved', post_id: postId, reviewed_at: new Date().toISOString() });
  printJSON({ ok: true, post_id: postId, message: 'Propuesta aprobada y convertida en post' });
}

function cmdProposalReject(id) {
  const p = proposals.getById(id);
  if (!p) {
    console.error(JSON.stringify({ error: 'Propuesta no encontrada' }));
    process.exit(1);
  }
  proposals.update(id, { status: 'rejected', reviewed_at: new Date().toISOString() });
  printJSON({ ok: true, message: 'Propuesta rechazada' });
}

function cmdProposalMerge(proposalId, postId) {
  const p = proposals.getById(proposalId);
  if (!p) {
    console.error(JSON.stringify({ error: 'Propuesta no encontrada' }));
    process.exit(1);
  }
  posts.update(postId, {
    content: p.suggested_copy,
    format: p.suggested_format,
    style: p.style || null,
    research_insight: p.research_summary
  });

  (p.images || []).forEach((imgPath, i) => {
    const absPath = path.isAbsolute(imgPath) ? imgPath : path.join(__dirname, imgPath);
    if (fs.existsSync(absPath)) {
      media.add(postId, {
        file_name: path.basename(imgPath),
        file_path: imgPath,
        original_name: path.basename(imgPath),
        mime_type: 'image/jpeg',
        file_size: fs.statSync(absPath).size,
        sort_order: i
      });
    }
  });

  proposals.update(proposalId, { status: 'merged', post_id: postId, reviewed_at: new Date().toISOString() });
  printJSON({ ok: true, message: `Propuesta ${proposalId} fusionada en post ${postId}` });
}

function cmdProposalUploadImages(id, filePaths) {
  const p = proposals.getById(id);
  if (!p) {
    console.error(JSON.stringify({ error: 'Propuesta no encontrada' }));
    process.exit(1);
  }

  const existing = p.images || [];
  const uploaded = [];

  for (const fp of filePaths) {
    const abs = path.resolve(fp);
    if (!fs.existsSync(abs)) {
      console.error(JSON.stringify({ error: `Archivo no existe: ${fp}` }));
      process.exit(1);
    }
    const dest = copyFileToUploads(abs, 'proposals');
    existing.push(dest);
    uploaded.push(dest);
  }

  proposals.update(id, { images: existing });
  printJSON({ ok: true, proposal_id: id, uploaded, total_images: existing.length });
}

// ─── Hot Alerts ───

function cmdHotAlertsList({ status } = {}) {
  const list = hotAlerts.getAll({ status });
  printJSON(list);
}

function cmdHotAlertCreate(flags) {
  const data = {
    title: flags.title || '',
    summary: flags.summary || '',
    urgency_reason: flags.urgency || '',
    source_url: flags['source-url'] || '',
    suggested_copy: flags.copy || '',
    suggested_format: flags.format || 'text-only',
    images: []
  };
  const id = hotAlerts.create(data);
  printJSON({ ok: true, id, message: 'Hot alert creada' });
}

function cmdHotAlertPublish(id, flags) {
  const a = hotAlerts.getById(id);
  if (!a) {
    console.error(JSON.stringify({ error: 'Alerta no encontrada' }));
    process.exit(1);
  }

  const postData = {
    slug: `alert-${a.id}-${Date.now()}`,
    title: flags.title || a.title,
    content: flags.copy || a.suggested_copy || '',
    status: 'published',
    format: flags.format || a.suggested_format || 'text-only',
    published_at: new Date().toISOString(),
    notes: `Publicado desde hot alert. Fuente: ${a.source_url}`
  };

  const postId = posts.create(postData);

  (a.images || []).forEach((imgPath, i) => {
    const absPath = path.isAbsolute(imgPath) ? imgPath : path.join(__dirname, imgPath);
    if (fs.existsSync(absPath)) {
      media.add(postId, {
        file_name: path.basename(imgPath),
        file_path: imgPath,
        original_name: path.basename(imgPath),
        mime_type: 'image/jpeg',
        file_size: fs.statSync(absPath).size,
        sort_order: i
      });
    }
  });

  hotAlerts.update(a.id, { status: 'published', acted_at: new Date().toISOString() });
  printJSON({ ok: true, post_id: postId, message: 'Hot alert publicada como post' });
}

function cmdHotAlertDismiss(id) {
  const a = hotAlerts.getById(id);
  if (!a) {
    console.error(JSON.stringify({ error: 'Alerta no encontrada' }));
    process.exit(1);
  }
  hotAlerts.update(id, { status: 'dismissed', acted_at: new Date().toISOString() });
  printJSON({ ok: true, message: 'Hot alert descartada' });
}

// ─── Posts ───

function cmdPostsList(flags) {
  const list = posts.getAll({
    status: flags.status,
    format: flags.format,
    style: flags.style
  });
  printJSON(list.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    format: p.format,
    style: p.style,
    scheduled_at: p.scheduled_at,
    created_at: p.created_at
  })));
}

function cmdPostGet(id) {
  const p = posts.getById(id);
  if (!p) {
    console.error(JSON.stringify({ error: 'Post no encontrado' }));
    process.exit(1);
  }
  printJSON(p);
}

function cmdPostSchedule(id, date) {
  const p = posts.getById(id);
  if (!p) {
    console.error(JSON.stringify({ error: 'Post no encontrado' }));
    process.exit(1);
  }
  posts.update(id, { scheduled_at: date, status: 'scheduled' });
  printJSON({ ok: true, message: `Post ${id} agendado para ${date}` });
}

// ─── Calendario ───

function cmdCalendar(month) {
  const target = month || new Date().toISOString().slice(0, 7);
  const data = posts.getByMonth(target);
  printJSON({ month: target, days: data });
}

function cmdWeek(date) {
  const target = date || new Date().toISOString().slice(0, 10);
  const data = posts.getByWeek(target);
  printJSON({ week_start: target, posts: data });
}

// ─── Monitor ───

async function cmdMonitorSources() {
  printJSON(monitor.listSources());
}

async function cmdMonitorRun(flags) {
  const result = await monitor.run({ dryRun: flags['dry-run'] || false, verbose: true });
  printJSON(result);
}

async function cmdMonitorAddSource(flags) {
  const data = {
    id: flags.id,
    name: flags.name || flags.id,
    url: flags.url,
    type: flags.type || 'rss',
    keywords: (flags.keywords || '').split(',').map(s => s.trim()).filter(Boolean),
    enabled: flags.enabled !== 'false'
  };
  const id = monitor.addSource(data);
  printJSON({ ok: true, id, message: 'Fuente agregada' });
}

async function cmdMonitorRemoveSource(id) {
  monitor.removeSource(id);
  printJSON({ ok: true, message: `Fuente ${id} eliminada` });
}

async function cmdMonitorHistory() {
  printJSON(monitor.getHistory());
}

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────

async function runCLI() {
  const { cmd, flags } = parseArgs(process.argv);

  if (cmd.length === 0) {
    printHelp();
    process.exit(0);
  }

  const [main, sub, ...rest] = cmd;

  try {
    // Comandos de 1 palabra que pueden recibir argumento posicional
    if (main === 'calendar') {
      cmdCalendar(sub);
    } else if (main === 'week') {
      cmdWeek(sub);
    } else {
      switch (`${main} ${sub || ''}`.trim()) {
        // Contexto
        case 'context':
          cmdContext();
          break;
        case 'stats':
          cmdStats();
          break;

        // Propuestas
        case 'proposals list':
          cmdProposalsList(flags);
          break;
        case 'proposal get':
          cmdProposalGet(rest[0]);
          break;
        case 'proposal create':
          cmdProposalCreate(flags);
          break;
        case 'proposal approve':
          cmdProposalApprove(rest[0], flags);
          break;
        case 'proposal reject':
          cmdProposalReject(rest[0]);
          break;
        case 'proposal merge':
          cmdProposalMerge(rest[0], rest[1]);
          break;
        case 'proposal upload-images':
          cmdProposalUploadImages(rest[0], rest.slice(1));
          break;

        // Hot alerts
        case 'hot-alerts list':
          cmdHotAlertsList(flags);
          break;
        case 'hot-alert create':
          cmdHotAlertCreate(flags);
          break;
        case 'hot-alert publish':
          cmdHotAlertPublish(rest[0], flags);
          break;
        case 'hot-alert dismiss':
          cmdHotAlertDismiss(rest[0]);
          break;

        // Posts
        case 'posts list':
          cmdPostsList(flags);
          break;
        case 'post get':
          cmdPostGet(rest[0]);
          break;
        case 'post schedule':
          cmdPostSchedule(rest[0], flags.date);
          break;

        // Monitor
        case 'monitor sources':
          await cmdMonitorSources();
          break;
        case 'monitor run':
          await cmdMonitorRun(flags);
          break;
        case 'monitor add-source':
          await cmdMonitorAddSource(flags);
          break;
        case 'monitor remove-source':
          await cmdMonitorRemoveSource(rest[0]);
          break;
        case 'monitor history':
          await cmdMonitorHistory();
          break;

        default:
          console.error(JSON.stringify({ error: `Comando desconocido: ${main} ${sub || ''}` }));
          printHelp();
          process.exit(1);
      }
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message, stack: err.stack }));
    process.exit(1);
  }
}

runCLI();
