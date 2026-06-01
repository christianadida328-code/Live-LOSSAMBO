# Mise à jour manuelle DB (sans migrations)

Ce projet utilise des migrations Flask uniquement si elles sont configurées/initialisées.
Dans l’état actuel, l’option la plus simple en dev est :

## 1) Changer `backend/models.py`
- Ajouts/colonnes → modifie les modèles.

## 2) Recréer la DB SQLite de dev
- Supprimer `backend/instance/dev.db`
- Redémarrer `backend/app.py`

Le code fait déjà `db.create_all()` en SQLite, ce qui recrée les tables avec le schéma courant.

## Note
Si `DATABASE_URL` pointe vers autre chose que SQLite (ex: PostgreSQL), il faut utiliser de vraies migrations.

