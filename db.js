const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');
// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Ensure uploads/proposals directory exists (task 1.7)
const proposalsUploadDir = path.join(__dirname, 'uploads', 'proposals');
if (!fs.existsSync(proposalsUploadDir)) {
  fs.mkdirSync(proposalsUploadDir, { recursive: true });
}

const db = new Database(DB_PATH);

// WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

// Create base tables (posts without CHECK so we can ALTER later)
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    style TEXT DEFAULT NULL,
    platforms TEXT DEFAULT '["linkedin"]',
    notes TEXT DEFAULT '',
    scheduled_at TEXT DEFAULT NULL,
    published_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT DEFAULT '',
    mime_type TEXT DEFAULT 'image/png',
    file_size INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    due_date TEXT DEFAULT NULL,
    linked_post_id INTEGER DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (linked_post_id) REFERENCES posts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// === ADITIVA MIGRATION: Add new columns to posts if missing (task 1.1) ===
const postCols = db.prepare("PRAGMA table_info(posts)").all().map(c => c.name);
if (!postCols.includes('format'))           db.exec("ALTER TABLE posts ADD COLUMN format TEXT DEFAULT 'text-only'");
if (!postCols.includes('format_meta'))      db.exec("ALTER TABLE posts ADD COLUMN format_meta TEXT DEFAULT '{}'");
if (!postCols.includes('research_insight')) db.exec("ALTER TABLE posts ADD COLUMN research_insight TEXT DEFAULT ''");
if (!postCols.includes('editorial_angle'))  db.exec("ALTER TABLE posts ADD COLUMN editorial_angle TEXT DEFAULT ''");

// === NEW TABLES (tasks 1.3, 1.4, 1.5) ===
db.exec(`
  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER DEFAULT NULL,
    title TEXT NOT NULL DEFAULT '',
    research_summary TEXT DEFAULT '',
    suggested_format TEXT DEFAULT 'text-only',
    suggested_copy TEXT DEFAULT '',
    suggested_platforms TEXT DEFAULT '["linkedin"]',
    sources TEXT DEFAULT '[]',
    agent_notes TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','hot')),
    images TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','merged')),
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT DEFAULT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS research_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER DEFAULT NULL,
    proposal_id INTEGER DEFAULT NULL,
    url TEXT NOT NULL DEFAULT '',
    title TEXT DEFAULT '',
    source_type TEXT DEFAULT 'blog' CHECK(source_type IN ('blog','github','paper','docs','social','other')),
    excerpt TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS hot_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER DEFAULT NULL,
    title TEXT NOT NULL DEFAULT '',
    summary TEXT DEFAULT '',
    urgency_reason TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    suggested_copy TEXT DEFAULT '',
    suggested_format TEXT DEFAULT 'text-only',
    images TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','published','dismissed')),
    created_at TEXT DEFAULT (datetime('now')),
    acted_at TEXT DEFAULT NULL,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL
  );
`);

// ============================
// === POST QUERIES ===
// ============================
const posts = {
  getAll(filters = {}) {
    let sql = 'SELECT * FROM posts WHERE 1=1';
    const params = [];
    if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
    if (filters.style)  { sql += ' AND style = ?'; params.push(filters.style); }
    if (filters.format) { sql += ' AND format = ?'; params.push(filters.format); }
    if (filters.search) {
      sql += ' AND (title LIKE ? OR content LIKE ? OR notes LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    sql += ' ORDER BY COALESCE(scheduled_at, created_at) DESC';
    return db.prepare(sql).all(...params);
  },

  getById(id) {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (post) {
      post.media = db.prepare('SELECT * FROM media WHERE post_id = ? ORDER BY sort_order').all(id);
      post.sources = db.prepare('SELECT * FROM research_sources WHERE post_id = ? ORDER BY id').all(id);
      // parse JSON fields
      try { post.format_meta = JSON.parse(post.format_meta || '{}'); } catch { post.format_meta = {}; }
    }
    return post;
  },

  getBySlug(slug) {
    const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug);
    if (post) {
      post.media = db.prepare('SELECT * FROM media WHERE post_id = ? ORDER BY sort_order').all(post.id);
    }
    return post;
  },

  // Calendar view: posts grouped by date for a given month (task 2.3)
  getByMonth(month) {
    // month = 'YYYY-MM'
    const sql = `SELECT * FROM posts
      WHERE strftime('%Y-%m', COALESCE(scheduled_at, created_at)) = ?
      AND status IN ('approved','scheduled','published')
      ORDER BY scheduled_at ASC`;
    const rows = db.prepare(sql).all(month);
    const grouped = {};
    for (const p of rows) {
      const day = (p.scheduled_at || p.created_at).slice(0, 10);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(p);
    }
    return grouped;
  },

  // Week view: posts for a 7-day window (task 2.4)
  getByWeek(startDate) {
    const sql = `SELECT * FROM posts
      WHERE DATE(COALESCE(scheduled_at, created_at)) >= DATE(?)
        AND DATE(COALESCE(scheduled_at, created_at)) <= DATE(?, '+6 days')
      ORDER BY COALESCE(scheduled_at, created_at) ASC`;
    return db.prepare(sql).all(startDate, startDate);
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO posts (slug, title, content, status, style, platforms, notes,
                         scheduled_at, format, format_meta, research_insight, editorial_angle)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.slug, data.title || '', data.content || '',
      data.status || 'draft', data.style || null,
      JSON.stringify(data.platforms || ['linkedin']),
      data.notes || '', data.scheduled_at || null,
      data.format || 'text-only',
      typeof data.format_meta === 'object' ? JSON.stringify(data.format_meta) : (data.format_meta || '{}'),
      data.research_insight || '',
      data.editorial_angle || ''
    );
    return result.lastInsertRowid;
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['slug','title','content','status','style','platforms','notes',
                     'scheduled_at','published_at','format','format_meta',
                     'research_insight','editorial_angle'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'platforms') params.push(JSON.stringify(data[key]));
        else if (key === 'format_meta') params.push(typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
        else params.push(data[key]);
      }
    }
    if (fields.length === 0) return false;
    fields.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return true;
  },

  delete(id) {
    const mediaRows = db.prepare('SELECT file_path FROM media WHERE post_id = ?').all(id);
    for (const m of mediaRows) {
      const target = path.isAbsolute(m.file_path) ? m.file_path : path.join(__dirname, m.file_path);
      try { fs.unlinkSync(target); } catch(e) {}
    }
    return db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  },

  getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM posts GROUP BY status").all();
    const byStyle  = db.prepare("SELECT style, COUNT(*) as count FROM posts WHERE style IS NOT NULL GROUP BY style").all();
    const byFormat = db.prepare("SELECT format, COUNT(*) as count FROM posts WHERE format IS NOT NULL GROUP BY format").all();
    const upcoming = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status IN ('approved','scheduled') AND scheduled_at >= datetime('now')").get().count;
    const thisWeek = db.prepare("SELECT COUNT(*) as count FROM posts WHERE created_at >= datetime('now', '-7 days')").get().count;
    const pendingProposals = db.prepare("SELECT COUNT(*) as count FROM proposals WHERE status = 'pending'").get().count;
    const activeAlerts = db.prepare("SELECT COUNT(*) as count FROM hot_alerts WHERE status = 'active'").get().count;
    return { total, byStatus, byStyle, byFormat, upcoming, thisWeek, pendingProposals, activeAlerts };
  }
};

// === MEDIA QUERIES ===
const media = {
  add(postId, fileInfo) {
    const stmt = db.prepare(`
      INSERT INTO media (post_id, file_name, file_path, original_name, mime_type, file_size, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(postId, fileInfo.file_name, fileInfo.file_path, fileInfo.original_name,
      fileInfo.mime_type, fileInfo.file_size, fileInfo.sort_order || 0);
  },

  delete(id) {
    const m = db.prepare('SELECT file_path FROM media WHERE id = ?').get(id);
    if (m) {
      const target = path.isAbsolute(m.file_path) ? m.file_path : path.join(__dirname, m.file_path);
      try { fs.unlinkSync(target); } catch(e) {}
    }
    return db.prepare('DELETE FROM media WHERE id = ?').run(id);
  },

  reorder(id, newOrder) {
    return db.prepare('UPDATE media SET sort_order = ? WHERE id = ?').run(newOrder, id);
  }
};

// === TASK QUERIES ===
const tasks = {
  getAll(filters = {}) {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
    sql += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, due_date ASC";
    return db.prepare(sql).all(...params);
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, status, priority, due_date, linked_post_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.title, data.description || '', data.status || 'pending',
      data.priority || 'medium', data.due_date || null, data.linked_post_id || null);
    return result.lastInsertRowid;
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['title','description','status','priority','due_date','linked_post_id'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
    }
    if (fields.length === 0) return false;
    fields.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return true;
  },

  delete(id) { return db.prepare('DELETE FROM tasks WHERE id = ?').run(id); }
};

// === SETTINGS ===
const settings = {
  get(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  set(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
};

// === PROPOSALS ===
const proposals = {
  getAll(filters = {}) {
    let sql = 'SELECT * FROM proposals WHERE 1=1';
    const params = [];
    if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
    if (filters.priority) { sql += ' AND priority = ?'; params.push(filters.priority); }
    sql += " ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC";
    return db.prepare(sql).all(...params);
  },

  getById(id) {
    const p = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
    if (p) {
      p.sourcesData = db.prepare('SELECT * FROM research_sources WHERE proposal_id = ?').all(id);
      try { p.images = JSON.parse(p.images || '[]'); } catch { p.images = []; }
      try { p.sources = JSON.parse(p.sources || '[]'); } catch { p.sources = []; }
      try { p.suggested_platforms = JSON.parse(p.suggested_platforms || '["linkedin"]'); } catch { p.suggested_platforms = ['linkedin']; }
    }
    return p;
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO proposals (post_id, title, research_summary, suggested_format, suggested_copy,
                              suggested_platforms, sources, agent_notes, priority, images, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = stmt.run(
      data.post_id || null, data.title || '', data.research_summary || '',
      data.suggested_format || 'text-only', data.suggested_copy || '',
      JSON.stringify(data.suggested_platforms || ['linkedin']),
      JSON.stringify(data.sources || []), data.agent_notes || '',
      data.priority || 'normal',
      JSON.stringify(data.images || [])
    );
    return result.lastInsertRowid;
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['post_id','title','research_summary','suggested_format','suggested_copy',
                     'suggested_platforms','sources','agent_notes','priority','images','status','reviewed_at'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (['suggested_platforms','sources','images'].includes(key))
          params.push(JSON.stringify(data[key]));
        else params.push(data[key]);
      }
    }
    if (fields.length === 0) return false;
    params.push(id);
    db.prepare(`UPDATE proposals SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return true;
  },

  delete(id) { return db.prepare('DELETE FROM proposals WHERE id = ?').run(id); },

  countPending() { return db.prepare("SELECT COUNT(*) as count FROM proposals WHERE status = 'pending'").get().count; },

  countToday() {
    return db.prepare("SELECT COUNT(*) as count FROM proposals WHERE DATE(created_at) = DATE('now')").get().count;
  }
};

// === RESEARCH SOURCES ===
const researchSources = {
  getByPostId(postId) {
    return db.prepare('SELECT * FROM research_sources WHERE post_id = ? ORDER BY id').all(postId);
  },
  getByProposalId(proposalId) {
    return db.prepare('SELECT * FROM research_sources WHERE proposal_id = ? ORDER BY id').all(proposalId);
  },
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO research_sources (post_id, proposal_id, url, title, source_type, excerpt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(data.post_id || null, data.proposal_id || null,
      data.url || '', data.title || '', data.source_type || 'blog', data.excerpt || '').lastInsertRowid;
  },
  delete(id) { return db.prepare('DELETE FROM research_sources WHERE id = ?').run(id); }
};

// === HOT ALERTS ===
const hotAlerts = {
  getAll(filters = {}) {
    let sql = 'SELECT * FROM hot_alerts WHERE 1=1';
    const params = [];
    if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
    sql += ' ORDER BY created_at DESC';
    return db.prepare(sql).all(...params);
  },

  getActive() {
    return db.prepare("SELECT * FROM hot_alerts WHERE status = 'active' ORDER BY created_at DESC").all();
  },

  getById(id) {
    const a = db.prepare('SELECT * FROM hot_alerts WHERE id = ?').get(id);
    if (a) {
      try { a.images = JSON.parse(a.images || '[]'); } catch { a.images = []; }
    }
    return a;
  },

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO hot_alerts (proposal_id, title, summary, urgency_reason, source_url,
                               suggested_copy, suggested_format, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.proposal_id || null, data.title || '', data.summary || '',
      data.urgency_reason || '', data.source_url || '',
      data.suggested_copy || '', data.suggested_format || 'text-only',
      JSON.stringify(data.images || [])
    ).lastInsertRowid;
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['status', 'acted_at', 'suggested_copy', 'suggested_format'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
    }
    if (fields.length === 0) return false;
    params.push(id);
    db.prepare(`UPDATE hot_alerts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return true;
  },

  countActive() {
    return db.prepare("SELECT COUNT(*) as count FROM hot_alerts WHERE status = 'active'").get().count;
  }
};

module.exports = { db, posts, media, tasks, settings, proposals, researchSources, hotAlerts };
