/**
 * monitor.js — Motor de monitoreo de noticias para hot alerts
 *
 * Lee fuentes RSS configuradas, evalúa relevancia por keywords,
 * y crea hot alerts automáticamente cuando detecta noticias importantes.
 *
 * Uso:
 *   const monitor = require('./monitor');
 *   await monitor.run();           // Ejecuta monitoreo completo
 *   monitor.listSources();         // Lista fuentes
 *   monitor.addSource({...});      // Agrega fuente
 *   monitor.removeSource(id);      // Elimina fuente
 */

const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const { hotAlerts } = require('./db');

const SOURCES_PATH = path.join(__dirname, 'monitor-sources.json');
const HISTORY_PATH = path.join(__dirname, 'data', 'monitor-history.json');
const rssParser = new Parser({ timeout: 15000 });

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function loadSources() {
  if (!fs.existsSync(SOURCES_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveSources(sources) {
  fs.writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2));
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return { lastRun: null, processed: [] };
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    return { lastRun: null, processed: [] };
  }
}

function saveHistory(history) {
  const dir = path.dirname(HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function makeItemId(sourceId, item) {
  // Hash simple del título + fecha para evitar duplicados
  const str = `${sourceId}::${item.title || ''}::${item.isoDate || item.pubDate || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `item_${Math.abs(hash)}`;
}

function evaluateRelevance(item, keywords) {
  const text = `${item.title || ''} ${item.contentSnippet || item.summary || ''}`.toLowerCase();
  let score = 0;
  const matched = [];
  for (const kw of keywords) {
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (regex.test(text)) {
      score += 1;
      matched.push(kw);
      // Bonus si aparece en el título
      if (regex.test((item.title || '').toLowerCase())) score += 0.5;
    }
  }
  return { score, matched };
}

function inferUrgency(item, score) {
  const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
  if (/critical|cve|vulnerability|rce|exploit|security|breach|leak/.test(text)) {
    return { level: 'critical', reason: 'Seguridad — requiere acción inmediata' };
  }
  if (/launch|release|announced|introducing|new|shipped/.test(text) && score >= 2) {
    return { level: 'high', reason: 'Lanzamiento importante — oportunidad de contenido temprano' };
  }
  if (score >= 2) {
    return { level: 'medium', reason: 'Noticia relevante para la vertical de IA' };
  }
  return { level: 'low', reason: 'Mención menor' };
}

function inferFormat(title, content) {
  const text = `${title || ''} ${content || ''}`.toLowerCase();
  if (/checklist|list|steps|guide|how to/.test(text)) return 'carousel';
  if (/bug|cve|vulnerability|critical|alert/.test(text)) return 'single-image';
  if (/data|benchmark|numbers|stats|report/.test(text)) return 'single-image';
  return 'text-only';
}

function inferStyle(title, content) {
  const text = `${title || ''} ${content || ''}`.toLowerCase();
  if (/security|cve|vulnerability|warning|alert/.test(text)) return 'swiss-brutal';
  if (/architecture|system|framework|blueprint/.test(text)) return 'blueprint';
  if (/dashboard|metrics|kpi|analytics/.test(text)) return 'dashboard';
  if (/data|numbers|stats|benchmark/.test(text)) return 'data-poster';
  if (/opinion|take|lesson|learned|founder/.test(text)) return 'founder-note';
  return 'premium-editorial';
}

// ─────────────────────────────────────────────
// Core: fetch + evaluate
// ─────────────────────────────────────────────

async function fetchRSS(url) {
  try {
    const timeoutMs = 12000;
    const feedPromise = rssParser.parseURL(url);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );
    const feed = await Promise.race([feedPromise, timeoutPromise]);
    return feed.items || [];
  } catch (err) {
    return { error: err.message };
  }
}

async function checkSource(source, history, dryRun = false) {
  const results = [];
  const items = await fetchRSS(source.url);

  if (items.error) {
    return [{ source: source.id, error: items.error }];
  }

  // Solo evaluar items de las últimas 48 horas
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  for (const item of items.slice(0, 15)) { // max 15 items por fuente
    const itemDate = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date());
    if (itemDate < cutoff) continue;

    const itemId = makeItemId(source.id, item);
    if (history.processed.includes(itemId)) continue;

    const { score, matched } = evaluateRelevance(item, source.keywords || []);

    if (score >= 1.5) {
      const urgency = inferUrgency(item, score);
      const fmt = inferFormat(item.title, item.contentSnippet);
      const style = inferStyle(item.title, item.contentSnippet);

      if (!dryRun) {
        const alertId = hotAlerts.create({
          title: item.title || 'Sin título',
          summary: (item.contentSnippet || '').slice(0, 500),
          urgency_reason: `${urgency.level.toUpperCase()}: ${urgency.reason}`,
          source_url: item.link || source.url,
          suggested_copy: '', // El agente deberá redactar esto
          suggested_format: fmt
        });

        history.processed.push(itemId);
        results.push({
          source: source.id,
          itemId,
          alertId,
          title: item.title,
          score,
          matched,
          urgency: urgency.level,
          format: fmt,
          style,
          url: item.link
        });
      } else {
        results.push({
          source: source.id,
          itemId,
          title: item.title,
          score,
          matched,
          urgency: urgency.level,
          format: fmt,
          style,
          url: item.link,
          dryRun: true
        });
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

async function run(options = {}) {
  const { dryRun = false, verbose = false } = options;
  const sources = loadSources().filter(s => s.enabled !== false);
  const history = loadHistory();
  const allResults = [];

  if (verbose && !dryRun) console.error(`[monitor] Escaneando ${sources.length} fuentes...`);

  for (const source of sources) {
    if (verbose) console.error(`[monitor] → ${source.name}`);
    const results = await checkSource(source, history, dryRun);
    if (results.length) {
      allResults.push(...results);
    }
  }

  if (!dryRun) {
    history.lastRun = new Date().toISOString();
    // Mantener solo últimos 500 processed para no inflar
    if (history.processed.length > 500) {
      history.processed = history.processed.slice(-500);
    }
    saveHistory(history);
  }

  return {
    runAt: new Date().toISOString(),
    dryRun,
    sourcesChecked: sources.length,
    alertsCreated: allResults.filter(r => r.alertId).length,
    findings: allResults
  };
}

function listSources() {
  return loadSources();
}

function addSource(data) {
  const sources = loadSources();
  if (sources.find(s => s.id === data.id)) {
    throw new Error(`Ya existe una fuente con id "${data.id}"`);
  }
  sources.push({
    id: data.id,
    name: data.name || data.id,
    url: data.url,
    type: data.type || 'rss',
    keywords: data.keywords || [],
    enabled: data.enabled !== false
  });
  saveSources(sources);
  return data.id;
}

function removeSource(id) {
  const sources = loadSources().filter(s => s.id !== id);
  saveSources(sources);
  return true;
}

function getHistory() {
  return loadHistory();
}

module.exports = {
  run,
  listSources,
  addSource,
  removeSource,
  getHistory
};
