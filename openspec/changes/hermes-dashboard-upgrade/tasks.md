## 1. Database Schema Migration

- [x] 1.1 Add `format`, `format_meta`, `research_insight`, `editorial_angle` columns to `posts` table via ALTER TABLE in `db.js`
- [x] 1.2 Update posts status CHECK constraint to support 7 states: `research`, `draft`, `review`, `approved`, `scheduled`, `published`, `archived`
- [x] 1.3 Create `proposals` table with fields: id, post_id, title, research_summary, suggested_format, suggested_copy, suggested_platforms, sources, agent_notes, priority, images, status, created_at, reviewed_at
- [x] 1.4 Create `research_sources` table with fields: id, post_id, proposal_id, url, title, source_type, excerpt, created_at
- [x] 1.5 Create `hot_alerts` table with fields: id, proposal_id, title, summary, urgency_reason, source_url, suggested_copy, suggested_format, images, status, created_at, acted_at
- [x] 1.6 Add migration logic to handle existing posts gracefully (default format to `text-only`, preserve current states)
- [x] 1.7 Create `uploads/proposals/` directory structure for proposal image storage

## 2. Backend API — Posts Extended

- [x] 2.1 Update `posts.create()` and `posts.update()` to handle new fields: format, format_meta, research_insight, editorial_angle
- [x] 2.2 Update `posts.getAll()` to support filtering by format type
- [x] 2.3 Add `GET /api/posts/calendar?month=YYYY-MM` endpoint returning posts grouped by scheduled_at date
- [x] 2.4 Add `GET /api/posts/week?date=YYYY-MM-DD` endpoint returning posts for a 7-day window
- [x] 2.5 Update allowed fields in `posts.update()` to include format, format_meta, research_insight, editorial_angle

## 3. Backend API — Proposals

- [x] 3.1 Add proposals queries module in `db.js`: getAll, getById, create, update, delete, getByStatus, countPending, countToday
- [x] 3.2 Add `POST /api/proposals` endpoint with multipart support for Hermes to submit proposals with images
- [x] 3.3 Add `POST /api/proposals/batch` endpoint for Hermes to submit 2 proposals at once (daily cadence)
- [x] 3.4 Add `GET /api/proposals` endpoint with status filter and daily count support
- [x] 3.5 Add `GET /api/proposals/:id` endpoint with linked sources and image URLs
- [x] 3.6 Add `PUT /api/proposals/:id` endpoint for status changes (approve/reject/merge)
- [x] 3.7 Add `PUT /api/proposals/:id/approve` endpoint that creates a post from proposal data, transfers images to post media, and sets status to approved
- [x] 3.8 Add `PUT /api/proposals/:id/merge/:postId` endpoint that merges proposal into existing post with image transfer

## 4. Backend API — Research Sources

- [x] 4.1 Add research_sources queries in `db.js`: getByPostId, getByProposalId, create, delete
- [x] 4.2 Add `POST /api/posts/:id/sources` endpoint to add research sources to a post
- [x] 4.3 Add `GET /api/posts/:id/sources` endpoint to list sources for a post
- [x] 4.4 Add `DELETE /api/sources/:id` endpoint to remove a source

## 5. Backend API — Guidelines & Weekly Summary

- [x] 5.1 Add auto-import logic in server startup: read `manual-lineamientos-contenido-nelson.md` into `settings.editorial_guidelines` if not set
- [x] 5.2 Verify existing `GET /api/settings/editorial_guidelines` and `PUT /api/settings/editorial_guidelines` endpoints work for full markdown content
- [x] 5.3 Add `GET /api/weekly-summary?date=YYYY-MM-DD` endpoint that generates the structured weekly summary

## 6. Backend API — Hot Alerts

- [x] 6.1 Add hot_alerts queries in `db.js`: getAll, getActive, getById, create, update, countActive
- [x] 6.2 Add `POST /api/hot-alerts` endpoint for Hermes to submit breaking news alerts with optional images
- [x] 6.3 Add `GET /api/hot-alerts/active` endpoint for frontend polling (returns active alerts)
- [x] 6.4 Add `GET /api/hot-alerts` endpoint with status filter for history view
- [x] 6.5 Add `PUT /api/hot-alerts/:id/publish` endpoint that creates a post with status `published` from alert data and images
- [x] 6.6 Add `PUT /api/hot-alerts/:id/dismiss` endpoint to mark alert as dismissed

## 7. Frontend — Navigation & Shell

- [ ] 7.1 Refactor index.html to add tab navigation bar with 5 tabs: Posts, Calendario, Propuestas, Lineamientos, Planificador
- [ ] 7.2 Implement view switching logic: show/hide section containers based on active tab
- [ ] 7.3 Add active tab styling with orange underline indicator
- [ ] 7.4 Add pending proposals badge counter on Propuestas tab
- [ ] 7.5 Add hot alert banner component: fixed position, pulsing animation, visible from any tab
- [ ] 7.6 Implement hot alert polling: fetch `/api/hot-alerts/active` every 30 seconds, show/hide banner
- [ ] 7.7 Add notification chime sound when new hot alert arrives

## 8. Frontend — Posts View Enhancements

- [ ] 8.1 Add format selector card grid in the post editor (5 format types with icons)
- [ ] 8.2 Add format-specific metadata fields that appear/hide based on selected format (slide_count, slide_titles for carousel; pdf_url for lead-magnet)
- [ ] 8.3 Add format chip to post list items with distinct colors per format
- [ ] 8.4 Add format validation warning badges (e.g., "Faltan slides" for carousel with < 2 media)
- [ ] 8.5 Update post status dropdown to include 7 states with proper chip colors for `research` and `review`
- [ ] 8.6 Add collapsible "Investigación" section in post editor with research_insight textarea, editorial_angle input
- [ ] 8.7 Add research sources sub-panel: list existing sources, "Añadir fuente" form (url, title, source_type, excerpt)
- [ ] 8.8 Add research completeness indicator chip based on source count and types
- [ ] 8.9 Add analysis template checklist (6 items from the manual) with toggleable state persisted in format_meta

## 9. Frontend — Calendar View

- [ ] 9.1 Build monthly calendar grid component: 7-column CSS Grid with day cells, month/year header, prev/next navigation
- [ ] 9.2 Render scheduled posts as compact cards within day cells (truncated title, format chip, status chip)
- [ ] 9.3 Implement weekly view toggle: switch grid to 7-column expanded layout with taller cells and copy preview
- [ ] 9.4 Add click-on-post handler to open detail modal/side panel with full post info and action buttons
- [ ] 9.5 Implement drag-and-drop rescheduling: dragstart/dragover/drop on day cells, API call to update scheduled_at
- [ ] 9.6 Add mobile fallback: disable drag-and-drop below 768px, show "Mover a..." date picker button instead
- [ ] 9.7 Add "+" button on empty day cells that opens the editor with pre-filled scheduled_at
- [ ] 9.8 Add today highlight and current-month-only styling (gray out adjacent month days)

## 10. Frontend — Proposals View

- [ ] 10.1 Build proposals list layout: left list, right detail panel
- [ ] 10.2 Render proposal cards with orange left border for pending, title, format chip, date, summary preview
- [ ] 10.3 Add daily delivery tracker in header: "2/2 propuestas entregadas" or "1/2 — falta 1 pieza"
- [ ] 10.4 Add status filter dropdown (pending/approved/rejected/merged)
- [ ] 10.5 Build proposal detail panel: research summary, formatted copy preview, image gallery grid, sources list with clickable URLs, format metadata, agent notes
- [ ] 10.6 Add action buttons: Aprobar, Rechazar, Editar y Aprobar, Fusionar con post existente
- [ ] 10.7 Implement "Editar y Aprobar" flow: make copy/format fields editable, show "Confirmar y crear post" button
- [ ] 10.8 Implement "Fusionar" flow: show post selector dropdown, merge on confirm
- [ ] 10.9 Add "Historial de alertas" link that shows past hot alerts with status and linked posts

## 11. Frontend — Guidelines View

- [ ] 11.1 Build guidelines renderer: parse markdown into HTML with headings, lists, code blocks
- [ ] 11.2 Implement collapsible accordion for each H2 section with smooth toggle animation
- [ ] 11.3 Add search bar that filters sections by keyword with text highlighting
- [ ] 11.4 Add "Editar" mode toggle: switch between rendered view and full-height textarea with raw markdown
- [ ] 11.5 Implement save/cancel for edit mode: PUT to settings API, re-render on save

## 12. Frontend — Weekly Planner View

- [ ] 12.1 Build weekly planner layout: 7 day columns (Lun-Dom), week navigation arrows, date range display
- [ ] 12.2 Render scheduled posts as compact cards in their respective day columns
- [ ] 12.3 Add publishing frequency validation: warnings for > 3 days/week or < 2 posts/day
- [ ] 12.4 Add format distribution summary bar below the planner grid
- [ ] 12.5 Add platform distribution summary row
- [ ] 12.6 Implement "Generar resumen semanal" button: compile next week's posts into copyable formatted text block
- [ ] 12.7 Add "+" quick-schedule button on empty day slots (pre-fills scheduled_at to 08:00 of that day)

## 13. Frontend — Hot Alert Banner & Actions

- [ ] 13.1 Build hot alert banner component: fixed top position, red/orange gradient, pulsing glow animation
- [ ] 13.2 Render alert content: title, urgency reason, source link, and action buttons (Publicar ahora, Editar y publicar, Descartar)
- [ ] 13.3 Implement multi-alert navigation: counter "(+N más)" with left/right arrows to cycle
- [ ] 13.4 Implement "Publicar ahora" flow: create post with status published, transfer images, dismiss alert
- [ ] 13.5 Implement "Editar y publicar" flow: open editor pre-filled with alert data, save creates published post
- [ ] 13.6 Implement "Descartar" flow: mark alert as dismissed, hide banner
- [ ] 13.7 Add live preview of alert content: show how the post would look with generated images and copy

## 14. Polish & Integration

- [ ] 14.1 Update stats panel to include format breakdown, proposal counts, and active hot alerts count
- [ ] 14.2 Add CSS for all new components maintaining the existing design system (dark theme, orange accents, border-radius:22px, IBM Plex Mono)
- [ ] 14.3 Add responsive breakpoints for calendar (list mode on mobile), planner (stack columns), and proposals (stack panels)
- [ ] 14.4 Test full Hermes workflow: POST proposal with images → review in UI → approve → post appears in calendar with images → schedule → mark published
- [ ] 14.5 Test hot alert workflow: POST hot alert → banner appears → publish now → post created immediately
- [ ] 14.6 Verify existing data migration: existing posts load correctly with default format and states
