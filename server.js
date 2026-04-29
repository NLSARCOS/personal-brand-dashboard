try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (_) {}
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { posts, media, tasks, settings, proposals, researchSources, hotAlerts } = require('./db');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 8788;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// === Multer: post images ===
const makeStorage = (subdir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', subdir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${name}_${Date.now()}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Solo imágenes permitidas'));
};

const uploadPost    = multer({ storage: makeStorage(''), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: imageFilter });
const uploadProposal = multer({ storage: makeStorage('proposals'), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: imageFilter });
const uploadAlert   = multer({ storage: makeStorage('alerts'), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: imageFilter });

// Helper to build relative URL for an uploaded file
const fileUrl = (filePath, prefix = '') => {
  if (!filePath) return '';
  const base = path.basename(filePath);
  return prefix ? `/uploads/${prefix}/${base}` : `/uploads/${base}`;
};

// ===========================
// STATS
// ===========================
app.get('/api/stats', (req, res) => {
  res.json(posts.getStats());
});

// ===========================
// POSTS (tasks 2.1–2.5)
// ===========================
app.get('/api/posts', (req, res) => {
  res.json(posts.getAll(req.query));
});

// Calendar view (task 2.3) — must come BEFORE /api/posts/:id
app.get('/api/posts/calendar', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  res.json(posts.getByMonth(month));
});

// Week view (task 2.4) — must come BEFORE /api/posts/:id
app.get('/api/posts/week', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(posts.getByWeek(date));
});

app.get('/api/posts/:id', (req, res) => {
  const post = posts.getById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  res.json(post);
});

app.post('/api/posts', (req, res) => {
  if (!req.body.slug) req.body.slug = `post-${Date.now()}`;
  const id = posts.create(req.body);
  res.json({ id, ...req.body });
});

app.put('/api/posts/:id', (req, res) => {
  posts.update(req.params.id, req.body);
  res.json({ ok: true });
});

app.delete('/api/posts/:id', (req, res) => {
  posts.delete(req.params.id);
  res.json({ ok: true });
});

// ===========================
// MEDIA
// ===========================
app.post('/api/posts/:postId/media', uploadPost.array('images', 10), (req, res) => {
  const postId = parseInt(req.params.postId);
  const results = [];
  for (const file of req.files) {
    const info = {
      file_name: file.filename,
      file_path: file.path,
      original_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      sort_order: results.length
    };
    media.add(postId, info);
    results.push(info);
  }
  res.json({ ok: true, files: results });
});

app.post('/api/media/upload', uploadPost.array('images', 10), (req, res) => {
  const results = req.files.map(f => ({
    file_name: f.filename, file_path: f.path,
    url: `/uploads/${f.filename}`,
    original_name: f.originalname, mime_type: f.mimetype, file_size: f.size
  }));
  res.json({ ok: true, files: results });
});

app.delete('/api/media/:id', (req, res) => {
  media.delete(req.params.id);
  res.json({ ok: true });
});

app.put('/api/media/:id/reorder', (req, res) => {
  media.reorder(req.params.id, req.body.sort_order);
  res.json({ ok: true });
});

// ===========================
// TASKS
// ===========================
app.get('/api/tasks', (req, res) => { res.json(tasks.getAll(req.query)); });
app.post('/api/tasks', (req, res) => {
  const id = tasks.create(req.body);
  res.json({ id, ...req.body });
});
app.put('/api/tasks/:id', (req, res) => { tasks.update(req.params.id, req.body); res.json({ ok: true }); });
app.delete('/api/tasks/:id', (req, res) => { tasks.delete(req.params.id); res.json({ ok: true }); });

// ===========================
// SETTINGS
// ===========================
app.get('/api/settings/:key', (req, res) => {
  const val = settings.get(req.params.key);
  res.json({ key: req.params.key, value: val });
});
app.put('/api/settings/:key', (req, res) => {
  settings.set(req.params.key, req.body.value);
  res.json({ ok: true });
});

// ===========================
// RESEARCH SOURCES (tasks 4.1–4.4)
// ===========================
app.get('/api/posts/:id/sources', (req, res) => {
  res.json(researchSources.getByPostId(req.params.id));
});

app.post('/api/posts/:id/sources', (req, res) => {
  const id = researchSources.create({ ...req.body, post_id: parseInt(req.params.id) });
  res.json({ id, ...req.body });
});

app.delete('/api/sources/:id', (req, res) => {
  researchSources.delete(req.params.id);
  res.json({ ok: true });
});

// ===========================
// GUIDELINES & WEEKLY SUMMARY (tasks 5.1–5.3)
// ===========================
app.get('/api/weekly-summary', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  // Get next 7 days starting from the given date
  const weekPosts = posts.getByWeek(date);
  if (!weekPosts.length) {
    return res.json({
      summary: 'No hay publicaciones programadas para esta semana. Revisa las propuestas pendientes.',
      posts: []
    });
  }
  const lines = weekPosts.map(p => {
    const day = new Date(p.scheduled_at || p.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
    const plats = (() => { try { return JSON.parse(p.platforms || '[]').join(', '); } catch { return p.platforms || ''; } })();
    return `📅 ${day} — [${(p.format || 'text-only').toUpperCase()}] ${p.title || p.slug} (${plats}) — ${p.status}`;
  });
  res.json({ summary: lines.join('\n'), posts: weekPosts });
});

// ===========================
// HERMES AGENT CONTEXT — all design + content rules in one call
// ===========================
app.get('/api/hermes/context', (req, res) => {
  const editorial = settings.get('editorial_guidelines') || '';
  let designHtml = '';
  const htmlPath = path.join(__dirname, 'post-prueba-direcciones-v2.html');
  if (fs.existsSync(htmlPath)) designHtml = fs.readFileSync(htmlPath, 'utf8');
  let designManual = '';
  const designPath = path.join(__dirname, 'manual-lineamientos-diseno-aprobado-nelson.md');
  if (fs.existsSync(designPath)) designManual = fs.readFileSync(designPath, 'utf8');
  let designPrompts = {};
  const promptsPath = path.join(__dirname, 'hermes-design-prompts.json');
  if (fs.existsSync(promptsPath)) designPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));

  res.json({
    editorial_guidelines: editorial,
    design_manual: designManual,
    design_reference_html: designHtml,
    design_prompts: designPrompts,
    approved_styles: ['premium-editorial','swiss-brutal','dashboard','blueprint','founder-note','data-poster'],
    formats: ['text-only','single-image','carousel','gif','lead-magnet-pdf'],
    brand: {
      accent: '#f97316', bg: '#080b12',
      fonts: ['Inter','IBM Plex Mono','Space Grotesk'],
      aspect_ratio: '4:5',
      rules: [
        'Titulares grandes con presencia real — nunca pequeños frente al canvas',
        'Fondo oscuro con gradientes sutiles — nunca plano',
        'Composición densa — evitar zonas muertas sin intención',
        'Cada slide aporta algo diferente — no repetir layouts',
        'Progresión narrativa: hook → contexto → desarrollo → marco → cierre',
        'NO usar palabras meta (carrusel, post, slide, LinkedIn, marca personal)',
        'Respetar estructura y proporciones del HTML de referencia aprobado',
        'Container queries (cqw) para responsive en piezas 4:5'
      ]
    }
  });
});

// Serve visual directions gallery
app.get('/direcciones-visuales', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'direcciones-visuales.html'));
});

// Serve slide templates for Hermes and preview
app.use('/templates', express.static(path.join(__dirname, 'templates')));
app.get('/api/templates', (req, res) => {
  const dir = path.join(__dirname, 'templates');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  res.json(files.map(f => ({ name: f.replace('.html',''), url: `/templates/${f}` })));
});

// ===========================
// SLIDE RENDERER — Hermes generates PNGs from HTML
// ===========================
const slideRenderer = require('./slide-renderer');

// POST /api/render-slides — Hermes sends slide HTML, gets back PNG paths
// Body: { slides: [{ html: "<div>...</div>" }], ratio: "4:5" }
app.post('/api/render-slides', async (req, res) => {
  try {
    const { slides, ratio = '4:5' } = req.body;
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'slides array required' });
    }
    if (slides.length > 12) {
      return res.status(400).json({ error: 'max 12 slides per call' });
    }
    const results = await slideRenderer.renderCarousel(
      slides, ratio, path.join(__dirname, 'exports')
    );
    res.json({ success: true, slides: results, ratio, dimensions: slideRenderer.DIMENSIONS[ratio] });
  } catch (err) {
    console.error('Render error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/render-slide — single slide render (for preview)
app.post('/api/render-slide', async (req, res) => {
  try {
    const { html, ratio = '4:5' } = req.body;
    if (!html) return res.status(400).json({ error: 'html required' });
    const buffer = await slideRenderer.renderSlideToPng(html, ratio);
    res.set({ 'Content-Type': 'image/png', 'Content-Length': buffer.length });
    res.send(buffer);
  } catch (err) {
    console.error('Render error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/render-template?style=swiss-brutal&variant=hook-hero&ratio=4:5
// Renders a template variant directly to PNG
app.get('/api/render-template', async (req, res) => {
  try {
    const { style, variant = 'hook-hero', ratio = '4:5' } = req.query;
    if (!style) return res.status(400).json({ error: 'style param required' });
    const tplPath = path.join(__dirname, 'templates', `${style}.html`);
    if (!fs.existsSync(tplPath)) return res.status(404).json({ error: 'template not found' });

    const fullHtml = fs.readFileSync(tplPath, 'utf8');
    // Extract just the target variant's slide div
    const regex = new RegExp(`<div[^>]*data-variant="${variant}"[^>]*>[\\s\\S]*?<\\/div>\\s*(?=<div|<script)`, 'i');
    const match = fullHtml.match(regex);
    if (!match) return res.status(404).json({ error: `variant ${variant} not found` });

    // Extract styles from template
    const styleMatch = fullHtml.match(/<style>([\s\S]*?)<\/style>/);
    const css = styleMatch ? styleMatch[1] : '';
    const linkMatch = fullHtml.match(/<link[^>]*fonts[^>]*>/);
    const fontLink = linkMatch ? linkMatch[0] : '';

    const slideHtml = `${fontLink}<style>${css}</style>${match[0].replace(/style="display:none"/, '')}`;
    const buffer = await slideRenderer.renderSlideToPng(slideHtml, ratio);
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' });
    res.send(buffer);
  } catch (err) {
    console.error('Template render error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================
// PROPOSALS (tasks 3.1–3.8)
// ===========================
app.get('/api/proposals', (req, res) => {
  const all = proposals.getAll(req.query);
  const todayCount = proposals.countToday();
  res.json({ proposals: all, todayCount, dailyTarget: 2 });
});

// Batch submit (task 3.3) — must be BEFORE /api/proposals/:id
app.post('/api/proposals/batch', uploadProposal.array('images', 20), (req, res) => {
  let items = [];
  try { items = JSON.parse(req.body.proposals || '[]'); } catch { return res.status(400).json({ error: 'Invalid proposals JSON' }); }
  const ids = [];
  for (const item of items) {
    const id = proposals.create(item);
    ids.push(id);
  }
  res.json({ ok: true, ids });
});

app.get('/api/proposals/:id', (req, res) => {
  const p = proposals.getById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Propuesta no encontrada' });
  // Add image URLs
  if (Array.isArray(p.images)) {
    p.imageUrls = p.images.map(img => {
      const base = path.basename(img);
      return `/uploads/proposals/${base}`;
    });
  }
  res.json(p);
});

// Submit new proposal with images (task 3.2)
app.post('/api/proposals', uploadProposal.array('images', 10), (req, res) => {
  const data = { ...req.body };
  // Parse JSON fields if sent as strings
  for (const f of ['sources','suggested_platforms']) {
    if (typeof data[f] === 'string') { try { data[f] = JSON.parse(data[f]); } catch { data[f] = []; } }
  }
  // Attach uploaded image paths
  if (req.files && req.files.length) {
    data.images = req.files.map(f => f.path);
  }
  const id = proposals.create(data);
  res.json({ id, ...data });
});

// General update (task 3.6)
app.put('/api/proposals/:id', (req, res) => {
  proposals.update(req.params.id, { ...req.body, reviewed_at: new Date().toISOString() });
  res.json({ ok: true });
});

// Approve: create post from proposal, transfer images (task 3.7)
app.put('/api/proposals/:id/approve', (req, res) => {
  const p = proposals.getById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Propuesta no encontrada' });

  // Use override data if provided (edit-before-approve flow)
  const override = req.body || {};
  const postData = {
    slug: `proposal-${p.id}-${Date.now()}`,
    title: override.title || p.title,
    content: override.suggested_copy || p.suggested_copy,
    status: 'approved',
    format: override.suggested_format || p.suggested_format,
    platforms: override.suggested_platforms || p.suggested_platforms,
    research_insight: p.research_summary,
    editorial_angle: p.agent_notes,
    notes: p.agent_notes
  };

  const postId = posts.create(postData);

  // Transfer images (task 3.7)
  const images = p.images || [];
  images.forEach((imgPath, i) => {
    if (fs.existsSync(imgPath)) {
      media.add(postId, {
        file_name: path.basename(imgPath),
        file_path: imgPath,
        original_name: path.basename(imgPath),
        mime_type: 'image/jpeg',
        file_size: fs.statSync(imgPath).size,
        sort_order: i
      });
    }
  });

  // Transfer research sources
  const sources = researchSources.getByProposalId(p.id);
  for (const s of sources) {
    researchSources.create({ ...s, post_id: postId, proposal_id: null, id: undefined });
  }

  proposals.update(p.id, { status: 'approved', post_id: postId, reviewed_at: new Date().toISOString() });
  res.json({ ok: true, postId });
});

// Merge into existing post (task 3.8)
app.put('/api/proposals/:id/merge/:postId', (req, res) => {
  const p = proposals.getById(req.params.id);
  const postId = parseInt(req.params.postId);
  if (!p) return res.status(404).json({ error: 'Propuesta no encontrada' });

  posts.update(postId, {
    content: p.suggested_copy,
    format: p.suggested_format,
    research_insight: p.research_summary
  });

  // Transfer images
  (p.images || []).forEach((imgPath, i) => {
    if (fs.existsSync(imgPath)) {
      media.add(postId, {
        file_name: path.basename(imgPath), file_path: imgPath,
        original_name: path.basename(imgPath), mime_type: 'image/jpeg',
        file_size: fs.statSync(imgPath).size, sort_order: i
      });
    }
  });

  proposals.update(p.id, { status: 'merged', post_id: postId, reviewed_at: new Date().toISOString() });
  res.json({ ok: true });
});

// ===========================
// HOT ALERTS (tasks 6.1–6.6)
// ===========================
// Active alerts for polling (task 6.3) — must be BEFORE /:id
app.get('/api/hot-alerts/active', (req, res) => {
  res.json(hotAlerts.getActive());
});

app.get('/api/hot-alerts', (req, res) => {
  res.json(hotAlerts.getAll(req.query));
});

app.get('/api/hot-alerts/:id', (req, res) => {
  const a = hotAlerts.getById(req.params.id);
  if (!a) return res.status(404).json({ error: 'Alerta no encontrada' });
  res.json(a);
});

// Submit hot alert with optional images (task 6.2)
app.post('/api/hot-alerts', uploadAlert.array('images', 5), (req, res) => {
  const data = { ...req.body };
  if (req.files && req.files.length) data.images = req.files.map(f => f.path);
  const id = hotAlerts.create(data);
  res.json({ id, ...data });
});

// Publish from alert: create post with status=published (task 6.5)
app.put('/api/hot-alerts/:id/publish', (req, res) => {
  const a = hotAlerts.getById(req.params.id);
  if (!a) return res.status(404).json({ error: 'Alerta no encontrada' });

  const override = req.body || {};
  const postData = {
    slug: `alert-${a.id}-${Date.now()}`,
    title: override.title || a.title,
    content: override.suggested_copy || a.suggested_copy,
    status: 'published',
    format: override.suggested_format || a.suggested_format,
    published_at: new Date().toISOString(),
    notes: `Publicado desde alerta en caliente. Fuente: ${a.source_url}`
  };

  const postId = posts.create(postData);
  (a.images || []).forEach((imgPath, i) => {
    if (fs.existsSync(imgPath)) {
      media.add(postId, {
        file_name: path.basename(imgPath), file_path: imgPath,
        original_name: path.basename(imgPath), mime_type: 'image/jpeg',
        file_size: fs.statSync(imgPath).size, sort_order: i
      });
    }
  });

  hotAlerts.update(a.id, { status: 'published', acted_at: new Date().toISOString() });
  res.json({ ok: true, postId });
});

// Dismiss alert (task 6.6)
app.put('/api/hot-alerts/:id/dismiss', (req, res) => {
  hotAlerts.update(req.params.id, { status: 'dismissed', acted_at: new Date().toISOString() });
  res.json({ ok: true });
});

// ===========================
// IMPORT EXISTING QUEUE
// ===========================
app.post('/api/import/queue', (req, res) => {
  const candidates = [
    path.join(__dirname, '..', 'queue', 'posts.json'),
    '/Users/nelsonmini/linkedin-autopilot/queue/posts.json'
  ];
  const queuePath = candidates.find(p => fs.existsSync(p));
  if (!queuePath) return res.status(404).json({ error: 'No existe posts.json en rutas conocidas' });
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  let imported = 0, skipped = 0;
  for (const p of queue) {
    const existing = posts.getBySlug(p.id);
    if (existing) { skipped++; continue; }
    const postData = {
      slug: p.id, title: p.notes || p.id,
      content: (p.content || '').replace(/\\n/g, '\n'),
      status: p.status === 'published' ? 'published' : (p.status || 'draft'),
      platforms: p.platforms || ['linkedin'],
      notes: p.notes || '', scheduled_at: p.scheduled_at || null,
      published_at: p.published_at || null
    };
    const newId = posts.create(postData);
    if (p.media_paths && Array.isArray(p.media_paths)) {
      p.media_paths.forEach((mp, i) => {
        if (fs.existsSync(mp)) {
          media.add(newId, {
            file_name: path.basename(mp), file_path: mp,
            original_name: path.basename(mp), mime_type: 'image/png',
            file_size: fs.statSync(mp).size, sort_order: i
          });
        }
      });
    }
    imported++;
  }
  res.json({ imported, skipped });
});

// ===========================
// HEALTH & SPA FALLBACK
// ===========================
app.get('/health', (req, res) => { res.json({ ok: true }); });

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===========================
// STARTUP
// ===========================
app.listen(PORT, () => {
  console.log(`🎯 Dashboard running at http://localhost:${PORT}`);

  // Auto-import both editorial guideline files merged
  const contentManual = path.join(__dirname, 'manual-lineamientos-contenido-nelson.md');
  const designManual = path.join(__dirname, 'manual-lineamientos-diseno-aprobado-nelson.md');
  const parts = [];
  if (fs.existsSync(contentManual)) parts.push(fs.readFileSync(contentManual, 'utf8'));
  if (fs.existsSync(designManual)) parts.push(fs.readFileSync(designManual, 'utf8'));
  if (parts.length) {
    settings.set('editorial_guidelines', parts.join('\n\n---\n\n'));
    console.log(`📖 Lineamientos importados: ${parts.length} manual(es)`);
  }
});
