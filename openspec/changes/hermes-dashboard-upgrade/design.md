## Context

El proyecto es un dashboard editorial SPA (Express + SQLite + vanilla JS) que actualmente ofrece CRUD básico de posts, media y tareas. Todo vive en un único `index.html` con ~480 líneas de HTML/CSS/JS inline. El backend es `server.js` (211 líneas) con `db.js` (219 líneas) manejando 4 tablas: `posts`, `media`, `tasks`, `settings`.

El flujo real de producción lo opera **Hermes Agent**, un agente de IA autónomo que:
1. Investiga diariamente temas del nicho (IA aplicada, agentes, LLMOps, seguridad, infra, open source AI)
2. Entrega **2 posts por día de publicación** — copy + imágenes generadas + formato
3. **Monitorea noticias en tiempo real** y envía alertas en caliente si algo relevante explota
4. Genera las imágenes y assets según las familias visuales aprobadas
5. Deposita todo via API para que Nelson apruebe/programe/publique

El dashboard no soporta este workflow autónomo — no tiene tipos de formato, calendario, propuestas con imágenes, alertas urgentes, ni las instrucciones editoriales integradas.

**Stack actual**: Express 5, better-sqlite3, multer, vanilla JS frontend (single HTML file).
**Restricciones**: Mantener stack vanilla (sin React/Vue), SQLite local, despliegue simple.

## Goals / Non-Goals

**Goals:**
- Transformar el dashboard en un centro de mando editorial para el workflow Hermes → Nelson
- Implementar modelo de formatos de publicación (carousel, single-image, gif, lead-magnet-pdf, text-only)
- Crear vista calendario editorial interactiva para planificación semanal/mensual
- Integrar el manual de lineamientos como referencia viva dentro de la UI
- Implementar sistema de propuestas del agente con imágenes generadas y flujo de aprobación
- Soportar cadencia de 2 posts/día de publicación con tracking
- Implementar sistema de alertas en caliente (hot alerts) para noticias urgentes
- Añadir metadatos de investigación a cada post
- Crear widget de planificación semanal con resumen dominical
- Expandir el pipeline de estados a 7 fases

**Non-Goals:**
- Publicación automática directa a LinkedIn/Threads (eso es responsabilidad de otro sistema)
- Generación de contenido desde el dashboard (Hermes opera externamente y deposita via API)
- Autenticación multi-usuario (es un dashboard personal local)
- Migración a un framework frontend (se mantiene vanilla JS)
- Editor visual de carruseles o generador de imágenes inline

## Decisions

### 1. Frontend: Multi-vista con tabs en lugar de refactorizar a SPA router

**Decisión**: Implementar navegación por tabs dentro del mismo `index.html` usando secciones ocultas/visibles con JS vanilla, sin routing real ni hash routing.

**Alternativas consideradas**:
- *Hash router*: Más limpio pero innecesario para 5-6 vistas sin deep-linking
- *Múltiples HTML*: Duplicación de boilerplate y pérdida de estado compartido

**Razón**: Mínima complejidad, mantiene el stack actual, el estado global (`state`) sigue accesible desde cualquier vista.

**Vistas**: Posts · Calendario · Propuestas · Lineamientos · Planificador Semanal

### 2. Calendario: Implementación vanilla JS sin dependencias externas

**Decisión**: Construir el calendario editorial desde cero con CSS Grid y vanilla JS.

**Alternativas consideradas**:
- *FullCalendar*: Demasiado pesado (~200KB) para un dashboard local
- *tui-calendar*: Buena opción pero añade dependencia innecesaria
- *Vanilla con drag-and-drop nativo*: La API `dragstart`/`drop` del browser es suficiente para mover posts entre días

**Razón**: El calendario necesita mostrar posts programados con preview del copy, chips de formato/plataforma y permitir cambio de fecha — eso se resuelve con una grid 7×N y event listeners.

### 3. Schema de base de datos: Migración aditiva con ALTER TABLE

**Decisión**: Usar `ALTER TABLE` para añadir columnas a `posts` y crear nuevas tablas. No recrear tablas existentes.

**Razón**: Preserva datos existentes. SQLite soporta `ALTER TABLE ADD COLUMN` sin problemas. Las nuevas tablas (`proposals`, `research_sources`) se crean con `CREATE TABLE IF NOT EXISTS`.

**Nuevas columnas en `posts`**:
```sql
format TEXT DEFAULT 'text-only'
format_meta TEXT DEFAULT '{}'
research_insight TEXT DEFAULT ''
editorial_angle TEXT DEFAULT ''
```

**Nuevas tablas**:
```sql
proposals (id, post_id NULL, title, research_summary, suggested_format, 
           suggested_copy, suggested_platforms, sources JSON, 
           agent_notes, priority ['normal','hot'], images JSON,
           status ['pending','approved','rejected','merged'], 
           created_at, reviewed_at)

research_sources (id, post_id OR proposal_id, url, title, source_type, 
                  excerpt, created_at)

hot_alerts (id, proposal_id NULL, title, summary, urgency_reason,
            source_url, suggested_copy, suggested_format, images JSON,
            status ['active','published','dismissed'],
            created_at, acted_at)
```

### 4. Estados del post: Expandir de 5 a 7 con migración automática

**Decisión**: Nuevos estados: `research` → `draft` → `review` → `approved` → `scheduled` → `published` → `archived`

**Migración**: Los posts existentes mantienen sus estados (todos son válidos en el nuevo set excepto que se añaden `research` y `review`).

**Alternativa considerada**: Usar un campo separado `agent_status` para el pipeline del agente — rechazado porque crea confusión sobre cuál es el "estado real" del post.

### 5. Lineamientos: Markdown almacenado en settings, renderizado con parser ligero

**Decisión**: Cargar el contenido de `manual-lineamientos-contenido-nelson.md` en la tabla `settings` (key: `editorial_guidelines`) y renderizarlo con un parser markdown minimal (regex-based, ~50 líneas).

**Alternativas consideradas**:
- *marked.js CDN*: Funciona pero es ~30KB de dependencia externa
- *Cargar el .md directamente vía fetch*: No permite edición desde la UI

**Razón**: El manual es relativamente simple (headers, bullets, code ticks). Un parser minimal cubre el 90% y permite edición live desde un `<textarea>`.

### 6. API de propuestas: Diseñada para que Hermes escriba y Nelson lea/apruebe

**Decisión**: Endpoints RESTful donde Hermes `POST /api/proposals` con la propuesta completa (copy + imágenes + formato), y Nelson las gestiona desde la UI con `PUT /api/proposals/:id` (aprobar/rechazar/editar). Al aprobar, se crea o actualiza el post vinculado automáticamente, transfiriendo las imágenes. Soporte para batch (`POST /api/proposals/batch`) para entregar las 2 piezas diarias de una vez.

### 7. Hot Alerts: Polling ligero + banner persistente

**Decisión**: El dashboard hace polling cada 30 segundos a `GET /api/hot-alerts/active`. Si hay alertas activas, se muestra un banner pulsante fijo en la parte superior del viewport, visible desde cualquier tab. El flujo de "publicar ahora" crea el post directamente con status `published`.

**Alternativas consideradas**:
- *WebSockets*: Sobredimensionado para un dashboard personal local con un solo usuario
- *Server-Sent Events*: Más elegante pero innecesario dado el caso de uso

**Razón**: Polling cada 30s tiene impacto insignificante en performance local y es trivial de implementar. El banner usa `position: fixed` para ser siempre visible.

### 8. Imágenes en propuestas: Upload multipart + referencia JSON

**Decisión**: Hermes envía propuestas con imágenes vía multipart form. Las imágenes se almacenan en `uploads/proposals/` con subdirectorio por proposal ID. El campo `images` en la DB es un JSON array con las rutas relativas.

**Razón**: Reutiliza la infraestructura de multer existente. Al aprobar una propuesta, las imágenes se copian a la carpeta de media del post creado.

## Risks / Trade-offs

- **Complejidad del index.html** → Se acerca a ~1500+ líneas con todas las vistas. Mitigation: Organizar cada vista en una función `render*()` autocontenida con su CSS scoped por clase padre.

- **Drag-and-drop cross-browser** → La API nativa funciona bien en desktop pero es limitada en mobile. Mitigation: Implementar fallback con click-to-move para mobile, y CSS media queries que cambien el calendario a vista lista en pantallas pequeñas.

- **Migración de estados** → Posts existentes con estado `draft` ahora tienen más estados previos. Mitigation: `draft` sigue siendo válido — los nuevos estados (`research`, `review`) son opcionales en el flujo.

- **Tamaño del markdown en settings** → El manual tiene ~8KB, cabe sin problema en SQLite TEXT. No es un riesgo real pero se documenta por completitud.

## Open Questions

- ¿Hermes decidirá automáticamente qué días de la semana son "de publicación" o Nelson los configura previamente en el planificador?
- ¿Las alertas en caliente deben tener un TTL (time-to-live) después del cual se autodescarten si Nelson no actúa?
