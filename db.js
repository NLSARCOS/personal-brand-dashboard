const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');
const db = new Database(DB_PATH);

// WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','scheduled','published','archived')),
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

// === POST QUERIES ===
const posts = {
  getAll(filters = {}) {
    let sql = 'SELECT * FROM posts WHERE 1=1';
    const params = [];
    if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
    if (filters.style) { sql += ' AND style = ?'; params.push(filters.style); }
    if (filters.search) { sql += ' AND (title LIKE ? OR content LIKE ? OR notes LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
    sql += ' ORDER BY COALESCE(scheduled_at, created_at) DESC';
    return db.prepare(sql).all(...params);
  },

  getById(id) {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (post) {
      post.media = db.prepare('SELECT * FROM media WHERE post_id = ? ORDER BY sort_order').all(id);
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

  create(data) {
    const stmt = db.prepare(`
      INSERT INTO posts (slug, title, content, status, style, platforms, notes, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.slug, data.title || '', data.content || '',
      data.status || 'draft', data.style || null,
      JSON.stringify(data.platforms || ['linkedin']),
      data.notes || '', data.scheduled_at || null
    );
    return result.lastInsertRowid;
  },

  update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ['slug','title','content','status','style','platforms','notes','scheduled_at','published_at'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(key === 'platforms' ? JSON.stringify(data[key]) : data[key]);
      }
    }
    if (fields.length === 0) return false;
    fields.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return true;
  },

  delete(id) {
    // Delete media files first
    const media = db.prepare('SELECT file_path FROM media WHERE post_id = ?').all(id);
    const fs = require('fs');
    for (const m of media) {
      const target = require('path').isAbsolute(m.file_path) ? m.file_path : require('path').join(__dirname, m.file_path);
      try { fs.unlinkSync(target); } catch(e) {}
    }
    return db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  },

  getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM posts GROUP BY status").all();
    const byStyle = db.prepare("SELECT style, COUNT(*) as count FROM posts WHERE style IS NOT NULL GROUP BY style").all();
    const upcoming = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status IN ('approved','scheduled') AND scheduled_at >= datetime('now')").get().count;
    const thisWeek = db.prepare("SELECT COUNT(*) as count FROM posts WHERE created_at >= datetime('now', '-7 days')").get().count;
    return { total, byStatus, byStyle, upcoming, thisWeek };
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
      const fs = require('fs');
      const target = require('path').isAbsolute(m.file_path) ? m.file_path : require('path').join(__dirname, m.file_path);
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
    sql += ' ORDER BY CASE priority WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, due_date ASC';
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
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (fields.length === 0) return false;
    fields.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return true;
  },

  delete(id) {
    return db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }
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

module.exports = { db, posts, media, tasks, settings };
