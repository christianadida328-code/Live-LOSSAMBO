# Backend - Flask

## Tech
- Flask
- SQLAlchemy
- PostgreSQL
- Flask-JWT-Extended (auth JWT)
- Flask-Migrate (migrations)

## Installation (dans `backend/`)
1. Créer un environnement virtuel
2. `pip install -r requirements.txt`
3. Configurer `.env`
4. `flask db upgrade`
5. `python app.py`

## Notes
- Les routes admin nécessitent le rôle `admin`.
- Les inscriptions aux événements nécessitent le rôle `member` (membre).

