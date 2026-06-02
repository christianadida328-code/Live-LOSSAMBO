# Railway setup

Ce projet doit etre deploye depuis la racine du repo, pas depuis `frontend/` ou `backend/`.

## Service

- Root Directory: vide
- Builder: Dockerfile
- Healthcheck path: `/api/health`

## Base de donnees

Ajoute un service PostgreSQL dans Railway. Railway injecte ensuite `DATABASE_URL`.

Ne pousse pas la base SQLite locale (`backend/dev.db`) sur GitHub: elle est ignoree volontairement.
Le backend cree les tables au demarrage avec `db.create_all()` et ajoute le contenu public de base si les tables sont vides.

## Variables conseillees

```text
SECRET_KEY=une_valeur_longue_et_secrete
JWT_SECRET_KEY=une_autre_valeur_longue_et_secrete
ADMIN_EMAIL=ton-email-admin@example.com
ADMIN_PASSWORD=mot-de-passe-admin
ADMIN_DISPLAY_NAME=Admin
SEED_PUBLIC_CONTENT=true
```

Si le frontend et le backend sont sur le meme service Railway, ne mets pas `VITE_API_BASE`.
Les appels API utilisent `/api/...` sur le meme domaine.

## Verification apres deploy

Ouvre:

```text
https://livelossambo.up.railway.app/api/health
```

Le resultat doit etre:

```json
{"status":"ok"}
```
