## Why

El dashboard actual es un CMS editorial básico (CRUD de posts, media, tareas). Pero el flujo real de producción de contenido para la marca personal de Nelson lo opera **Hermes Agent**, un agente de IA autónomo que:

1. **Investiga diariamente** temas del nicho (IA aplicada, agentes, LLMOps, seguridad, infra, open source AI)
2. **Entrega 2 posts por día de publicación** — copy completo + imágenes generadas + formato definido, listos para aprobar
3. **Monitorea noticias en tiempo real** y envía **alertas en caliente** cuando detecta algo relevante para publicar inmediatamente
4. **Genera las imágenes y assets** para cada post según las familias visuales aprobadas

El dashboard no refleja este workflow autónomo: no tiene instrucciones editoriales integradas, no soporta tipos de formato, no tiene vista calendario, no tiene sistema de alertas urgentes, ni mecanismos para que Hermes deposite propuestas completas (con imágenes ya generadas) y Nelson las apruebe/programe/publique.

Se necesita transformar esto de un "editor de posts" genérico a un **centro de mando editorial** donde Hermes opera como motor de contenido autónomo y Nelson decide qué sale, cuándo y cómo.

## What Changes

- **Panel de instrucciones editoriales**: integrar el manual de lineamientos (`manual-lineamientos-contenido-nelson.md`) como referencia viva dentro del dashboard, editable desde la UI
- **Modelo de formato de publicación**: nuevo campo `format` en posts con tipos: `single-image`, `carousel`, `gif`, `lead-magnet-pdf`, `text-only` — cada uno con metadatos específicos (número de slides, URL del PDF, etc.)
- **Vista calendario editorial**: vista mensual/semanal interactiva donde se visualizan las publicaciones programadas, con la capacidad de ver copy, assets, cambiar estado y arrastrar para reprogramar
- **Flujo de aprobación Hermes → Nelson**: estados expandidos del post que reflejan el pipeline real: `research` → `draft` → `review` → `approved` → `scheduled` → `published` → `archived`
- **Panel de propuestas del agente**: sección dedicada donde Hermes deposita propuestas completas (investigación + copy + imágenes generadas + formato) — y Nelson puede aprobar, editar o rechazar
- **Cadencia de 2 posts/día**: Hermes entrega 2 piezas por cada día de publicación (2-3 días/semana), listas con assets
- **Alertas en caliente (Hot Alerts)**: sistema de notificaciones urgentes cuando Hermes detecta una noticia relevante del nicho — Nelson puede aprobar y publicar inmediatamente
- **Metadatos de investigación**: campos para fuentes, insight principal, ángulo editorial y notas de research asociadas a cada post
- **Resumen semanal**: widget que muestre el plan de la semana (qué días publican, qué formatos, qué temas) alineado con la cadencia de producción

## Capabilities

### New Capabilities
- `content-formats`: Modelo de tipos de publicación (carousel, single-image, gif, lead-magnet-pdf, text-only) con metadatos específicos por formato y validación de assets requeridos
- `calendar-view`: Vista calendario editorial interactiva (mensual/semanal) con drag-and-drop para programación, preview del copy y cambio de estado inline
- `editorial-guidelines`: Panel integrado que renderiza el manual de lineamientos como referencia viva, con secciones colapsables y búsqueda — editable desde la UI
- `agent-proposals`: Sistema de propuestas donde Hermes entrega piezas completas (investigación + copy + formato + imágenes generadas) para revisión y aprobación por Nelson, con cadencia de 2 posts/día de publicación
- `hot-alerts`: Sistema de alertas en caliente para noticias urgentes del nicho — Hermes detecta, prepara propuesta express y Nelson aprueba para publicación inmediata
- `research-metadata`: Campos de investigación por post: fuentes usadas, insight principal, ángulo editorial, plantilla mental de análisis
- `weekly-planner`: Widget de planificación semanal que muestra distribución de publicaciones por día, formato y plataforma, con generación del resumen dominical

### Modified Capabilities
_(No hay specs existentes que modificar)_

## Impact

- **Base de datos**: Nuevas tablas (`proposals`, `research_sources`, `hot_alerts`) y columnas en `posts` (`format`, `format_meta`, `research_insight`, `editorial_angle`). Migración de estados del post (5 → 7 estados)
- **API REST**: Nuevos endpoints para proposals (con soporte de imágenes adjuntas), hot alerts, calendar view, guidelines CRUD, weekly summary. Modificación de endpoints existentes de posts para soportar nuevos campos
- **Frontend (public/index.html)**: Refactorización completa del SPA — nueva navegación por tabs/vistas (Posts, Calendario, Propuestas, Lineamientos, Planificador), componentes de calendario, drag-and-drop, paneles de revisión, y banner de alertas en caliente
- **server.js**: Nuevas rutas API, middleware para validación de formatos, endpoint de resumen semanal, endpoint de hot alerts
- **db.js**: Schema expansion, nuevas queries, migración automática de datos existentes
- **Dependencias**: Posible adición de una librería de calendario ligera (o implementación vanilla JS)
