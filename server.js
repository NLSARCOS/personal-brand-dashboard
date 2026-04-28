try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (_) {}
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { posts, media, tasks, settings } = require('./db');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 8788;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Also serve the exports directory for existing images
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// === Multer config for image uploads ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${name}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes permitidas'));
  }
});

// ===========================
// API ROUTES
// ===========================

// --- STATS ---
app.get('/api/stats', (req, res) => {
  res.json(posts.getStats());
});

// --- POSTS ---
app.get('/api/posts', (req, res) => {
  res.json(posts.getAll(req.query));
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

// --- MEDIA ---
app.post('/api/posts/:postId/media', upload.array('images', 10), (req, res) => {
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

// Upload standalone (no post linked yet)
app.post('/api/media/upload', upload.array('images', 10), (req, res) => {
  const results = req.files.map(f => ({
    file_name: f.filename,
    file_path: f.path,
    url: `/uploads/${f.filename}`,
    original_name: f.originalname,
    mime_type: f.mimetype,
    file_size: f.size
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

// --- TASKS ---
app.get('/api/tasks', (req, res) => {
  res.json(tasks.getAll(req.query));
});

app.post('/api/tasks', (req, res) => {
  const id = tasks.create(req.body);
  res.json({ id, ...req.body });
});

app.put('/api/tasks/:id', (req, res) => {
  tasks.update(req.params.id, req.body);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  tasks.delete(req.params.id);
  res.json({ ok: true });
});

// --- SETTINGS ---
app.get('/api/settings/:key', (req, res) => {
  const val = settings.get(req.params.key);
  res.json({ key: req.params.key, value: val });
});

app.put('/api/settings/:key', (req, res) => {
  settings.set(req.params.key, req.body.value);
  res.json({ ok: true });
});

// --- IMPORT existing posts from queue ---
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
      slug: p.id,
      title: p.notes || p.id,
      content: (p.content || '').replace(/\\n/g, '\n'),
      status: p.status === 'published' ? 'published' : (p.status || 'draft'),
      platforms: p.platforms || ['linkedin'],
      notes: p.notes || '',
      scheduled_at: p.scheduled_at || null,
      published_at: p.published_at || null
    };
    const newId = posts.create(postData);
    // Import media paths
    if (p.media_paths && Array.isArray(p.media_paths)) {
      p.media_paths.forEach((mp, i) => {
        if (fs.existsSync(mp)) {
          media.add(newId, {
            file_name: path.basename(mp),
            file_path: mp,
            original_name: path.basename(mp),
            mime_type: 'image/png',
            file_size: fs.statSync(mp).size,
            sort_order: i
          });
        }
      });
    }
    imported++;
  }
  res.json({ imported, skipped });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎯 Dashboard running at http://localhost:${PORT}`);
});
