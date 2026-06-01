# Live LOSSAMBO

Site web moderne (Netflix-like) pour une organisation religieuse: musiciens religieux, chorales, chantres, centres.

## Stack
- Backend: Flask (API REST) + JWT Auth
- Database: PostgreSQL
- Frontend: React (Vite) + Responsive UI

## Démarrage
Voir `backend/README.md` et `frontend/README.md`.

## Deploiement Railway

Le projet se deploie comme une application Python/Flask a la racine du depot.

- `requirements.txt` installe les dependances backend et Gunicorn.
- `railpack.json` force le provider Python et ajoute Node pour compiler React.
- `railway.json` lance le build React avec `npm --prefix frontend ci && npm --prefix frontend run build`.
- `start.sh` demarre Flask via Gunicorn sur le port fourni par Railway (`$PORT`).

Le frontend React est servi par Flask depuis `frontend/dist` apres le build Railway.

