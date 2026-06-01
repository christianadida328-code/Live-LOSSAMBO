# TODO

- [x] Implémenter upload image (multipart/form-data) pour **AdminEvents**
  - [ ] Backend: modifier `backend/routes/admin.py` (POST/PUT events) pour gérer `cover_file` et stocker fichier
  - [x] Backend: ajouter route de service statique pour les uploads (ou config serve static)
  - [ ] Frontend: modifier `frontend/src/pages/admin/AdminEvents.tsx` pour utiliser input file + FormData
  - [ ] Conserver compatibilité `cover_url` texte
- [ ] Tester:
  - [ ] Création event avec image
  - [ ] Mise à jour event en remplaçant l’image
  - [ ] Création sans image (champ cover_url texte ou vide)
