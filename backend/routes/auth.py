import os
import uuid

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from werkzeug.exceptions import BadRequest
from werkzeug.utils import secure_filename



from extensions import db
from models import User, MemberProfile

auth_bp = Blueprint('auth', __name__)
ALLOWED_PROFILE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def _error(msg, code=400):
    return jsonify({"error": msg}), code


def _allowed_profile_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PROFILE_EXTENSIONS


@auth_bp.post('/profile-image')
def upload_profile_image():
    file = request.files.get('file')
    if not file or not file.filename:
        return _error('Image de profil requise', 400)
    if not _allowed_profile_image(file.filename):
        return _error('Format image non autorisé', 400)

    upload_folder = current_app.config.get('UPLOAD_FOLDER')
    os.makedirs(upload_folder, exist_ok=True)
    original_name = secure_filename(file.filename)
    ext = original_name.rsplit('.', 1)[1].lower()
    filename = f"profile_{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_folder, filename))
    return jsonify({"url": request.host_url.rstrip('/') + f"/uploads/{filename}"}), 201


@auth_bp.post('/register')
def register():
    # Nettoyage/validation robuste côté backend
    if not request.data:
        return _error('Body de la requête manquant', 400)

    # Debug: log brut reçu (utile si le client n'envoie pas un vrai JSON)
    try:
        raw = request.get_data(cache=False, as_text=True)
    except Exception:
        raw = ''
    print('[auth/register] Content-Type:', request.headers.get('Content-Type'))
    print('[auth/register] Raw body:', raw)

    try:
        data = request.get_json(force=True, silent=False)
    except BadRequest:
        return _error('Requête JSON invalide', 400)

    # get_json(force=True) peut retourner None si le body est vide / mal formé
    # On accepte aussi le cas où le client envoie un JSON string.
    if data is None:
        raw = request.get_data(cache=False, as_text=True)
        if raw:
            try:
                import json as _json
                data = _json.loads(raw)
            except Exception:
                return _error('Requête JSON invalide (body non-parseable)', 400)
        else:
            return _error('Requête JSON invalide (body vide)', 400)



    # Certains clients renvoient une chaîne au lieu d’un objet JSON.
    if isinstance(data, str):
        try:
            import json as _json
            data = _json.loads(data)
        except Exception:
            return _error('Requête JSON invalide (format attendu: objet)', 400)

    if not isinstance(data, dict):
        return _error('Requête JSON invalide (format attendu: objet)', 400)


    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    raw_display_name = data.get('display_name')
    # Certains clients peuvent envoyer undefined -> JSON sérialise alors null/"undefined".
    display_name = (raw_display_name if isinstance(raw_display_name, str) else '').strip()
    display_name = display_name if display_name else email.split('@')[0]
    profile_image_url = (data.get('profile_image_url') or '').strip()
    ministry_role = (data.get('ministry_role') or '').strip()


    if not email or '@' not in email:
        return _error('Email invalide', 400)
    if len(password) < 8:
        return _error('Mot de passe trop court (min 8 caractères)', 400)
    if not profile_image_url:
        return _error('Image de profil obligatoire', 400)
    if not ministry_role:
        return _error('Rôle/ministère obligatoire', 400)


    user = User(email=email)
    user.set_password(password)

    profile = MemberProfile(
        display_name=display_name,
        profile_image_url=profile_image_url,
        ministry_role=ministry_role,
    )
    user.profile = profile

    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error('Email déjà utilisé', 409)

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "email": user.email, "role": user.role}}), 201


@auth_bp.post('/login')
def login():
    if not request.data:
        return _error('Body de la requête manquant', 400)

    # Rendre le parsing JSON robuste (certains clients envoient une string / body non parfaitement JSON)
    data = None
    try:
        data = request.get_json(force=True, silent=True)
    except Exception:
        data = None

    if data is None:
        import json as _json
        raw = request.get_data(cache=False, as_text=True) or ''
        if raw:
            try:
                data = _json.loads(raw)
            except Exception:
                return _error('Requête JSON invalide', 400)
        else:
            return _error('Requête JSON invalide (body vide)', 400)

    if isinstance(data, str):
        try:
            import json as _json
            data = _json.loads(data)
        except Exception:
            return _error('Requête JSON invalide (format attendu: objet)', 400)

    if not isinstance(data, dict):
        return _error('Requête JSON invalide (format attendu: objet)', 400)

    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()


    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return _error('Identifiants invalides', 401)

    # Si le compte est bloqué, on empêche la connexion.
    if getattr(user, 'is_blocked', False):
        return _error('Compte bloqué par l’admin', 403)


    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "email": user.email, "role": user.role}})

