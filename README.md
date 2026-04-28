# Personal Brand Dashboard

Dashboard editorial para gestionar posts, estados, imágenes y TODOs internos de una marca personal.

## Incluye
- Express
- SQLite (`data/dashboard.db`)
- CRUD de posts
- Estados: `draft`, `approved`, `scheduled`, `published`, `archived`
- Upload de imágenes
- Biblioteca visual por post
- TODO interno
- Importador opcional desde `linkedin-autopilot/queue/posts.json`

## Instalación
```bash
npm install
npm start
```

Abre:
- `http://127.0.0.1:8788`

## Estructura
- `server.js` — API + servidor web
- `db.js` — acceso a SQLite
- `public/index.html` — dashboard UI
- `data/dashboard.db` — base de datos incluida
- `exports/` — imágenes ya asociadas a posts importados
- `uploads/` — nuevas imágenes que subas desde el panel

## Notas
- La base incluida trae posts y medios ya cargados.
- Si quieres empezar limpio, borra `data/dashboard.db` y reinicia.
- Si quieres importar de nuevo tu cola histórica, usa el botón **Importar cola actual**.
