import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory, request

from werkzeug.utils import secure_filename




from flask_cors import CORS
from werkzeug.security import generate_password_hash

from extensions import db, jwt
from routes.auth import auth_bp
from routes.events import events_bp
from routes.production import production_bp
from routes.shop import shop_bp
from routes.gallery import gallery_bp
from routes.members import members_bp
from routes.admin import admin_bp
from routes.pages import pages_bp


# Bootstrap admin: cree ou met a jour le compte admin principal.
# Variables d'env possibles : ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PASSWORD_HASH, ADMIN_DISPLAY_NAME.
DEFAULT_ADMIN_EMAIL = 'kedornyota328@gmail.com'
DEFAULT_ADMIN_PASSWORD_HASH = 'scrypt:32768:8:1$gwBAjMwPTB6hWYbT$6f93fb09d8650be70cc24c2ff9bc436b6a0f36e01bde576f24116f8654089f34ea11eff57a5e41eee1c2818375d900d6072cbd98aeea40626093a39254f34433'


def create_app():

    load_dotenv()

    # Serveur Flask simple: pages HTML + API existante.
    app = Flask(__name__, static_folder='static', template_folder='templates')


    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'change_me')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'change_me_too')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
        minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', '60'))
    )

    # DB: SQLite par défaut pour éviter "Failed to fetch" (backend ne démarre pas)
    # - Si DATABASE_URL est défini (PostgreSQL), on l'utilise
    # - Sinon (ou si USE_SQLITE=true), on utilise SQLite
    db_url = (os.getenv('DATABASE_URL') or '').strip()
    use_sqlite = (os.getenv('USE_SQLITE') or '').strip().lower() in ('1', 'true', 'yes')

    force_sqlite = (os.getenv('FORCE_SQLITE') or '').strip().lower() in ('1', 'true', 'yes')

    # Par défaut: SQLite (simple/dev)
    if force_sqlite or use_sqlite or not db_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLITE_DATABASE_URL', 'sqlite:///dev.db')
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = db_url

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173')
    CORS(app, origins=cors_origins.split(','), supports_credentials=True)

    db.init_app(app)

    # Si on essaye PostgreSQL mais que ça échoue, fallback automatique SQLite.
    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres'):
        try:
            with app.app_context():
                with db.engine.connect() as _conn:
                    pass
        except Exception:
            app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLITE_DATABASE_URL', 'sqlite:///dev.db')

    jwt.init_app(app)

    # En mode dev (SQLite), créer les tables automatiquement
    with app.app_context():
        # Important : create_all ne crée que les colonnes manquantes si le schéma SQLite ne change pas.
        # Pour de vrais changements de colonnes, il faut migrations.
        from models import ChatMessage, ContactRequest, EventRequest, GalleryItem, Notification, ProductionRequest, ShopOrder, User, UserBlock  # noqa: F401
        if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:'):
            db.create_all()
            try:
                cols = [row[1] for row in db.session.execute(db.text("PRAGMA table_info(member_profiles)")).fetchall()]
                if 'profile_image_url' not in cols:
                    db.session.execute(db.text("ALTER TABLE member_profiles ADD COLUMN profile_image_url VARCHAR(500)"))
                    db.session.commit()
                if 'ministry_role' not in cols:
                    db.session.execute(db.text("ALTER TABLE member_profiles ADD COLUMN ministry_role VARCHAR(120)"))
                    db.session.commit()
                db.session.execute(db.text("""
                    DELETE FROM member_profiles
                    WHERE user_id NOT IN (SELECT id FROM users)
                """))
                db.session.commit()
            except Exception as e:
                print('[sqlite_migration] profile_image_url:', e)



    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(members_bp, url_prefix='/api/members')
    app.register_blueprint(production_bp, url_prefix='/api/production')
    app.register_blueprint(shop_bp, url_prefix='/api/shop')
    app.register_blueprint(gallery_bp, url_prefix='/api/gallery')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(pages_bp)

    # Bootstrap admin (optionnel)
    from models import User, MemberProfile  # import local pour éviter cycles
    with app.app_context():
        admin_email = (os.getenv('ADMIN_EMAIL') or DEFAULT_ADMIN_EMAIL).strip().lower()
        admin_password = (os.getenv('ADMIN_PASSWORD') or '').strip()
        admin_password_hash = (os.getenv('ADMIN_PASSWORD_HASH') or DEFAULT_ADMIN_PASSWORD_HASH).strip()
        admin_display_name = (os.getenv('ADMIN_DISPLAY_NAME') or '').strip()
        if admin_email and (admin_password or admin_password_hash):
            try:
                user = User.query.filter_by(email=admin_email).first()
                if not user:
                    user = User(email=admin_email, role='admin')
                    db.session.add(user)
                user.role = 'admin'
                user.password_hash = generate_password_hash(admin_password) if admin_password else admin_password_hash
                if not user.profile:
                    display_name = admin_display_name or admin_email.split('@')[0]
                    user.profile = MemberProfile(display_name=display_name)
                db.session.commit()
                print(f"[bootstrap_admin] Admin pret: {admin_email}")
            except Exception as e:
                print('[bootstrap_admin] Erreur:', e)

    # -----------------------------
    # Serve React build (SPA)
    # -----------------------------
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(project_root, 'frontend', 'dist')
    index_path = os.path.join(dist_dir, 'index.html')
    public_images_dir = os.path.join(project_root, 'images')

    # Configuration du dossier d'uploads pour les images (TODO.md)
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    app.config['UPLOAD_FOLDER'] = upload_dir

    @app.get('/api/health')
    def health():
        return jsonify({"status": "ok"})

    @app.get('/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.get('/images/<path:filename>')
    def serve_public_images(filename):
        return send_from_directory(public_images_dir, filename)

    @app.get('/logo.png')
    def serve_logo():
        return send_from_directory(public_images_dir, 'logo.png')

    # Serve static files / SPA fallback
    if (os.getenv('SERVE_REACT_BUILD') or '').strip().lower() in ('1', 'true', 'yes') and os.path.exists(dist_dir) and os.path.exists(index_path):
        @app.get('/')
        def serve_index():
            return send_from_directory(dist_dir, 'index.html')

        # Route pour servir les fichiers uploadés
        @app.get('/uploads/<path:filename>')
        def serve_uploads(filename):
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

        @app.get('/images/<path:filename>')
        def serve_public_images(filename):
            return send_from_directory(os.path.join(dist_dir, 'images'), filename)

        @app.get('/logo.png')
        def serve_logo():
            return send_from_directory(dist_dir, 'logo.png')

        # Important: servir aussi les assets (sinon le navigateur ne charge pas le JS/CSS)
        @app.get('/assets/<path:filename>')
        def serve_assets(filename):
            return send_from_directory(os.path.join(dist_dir, 'assets'), filename)

        @app.errorhandler(404)
        def spa_fallback(e):
            # Toutes les routes non-API renvoient index.html (SPA)
            path = (request.path or '').strip()
            if path.startswith('/api/'):
                return jsonify({"error": "Not found"}), 404
            return send_from_directory(dist_dir, 'index.html')



    @app.get('/api/debug/db')
    def debug_db():
        # Test simple: connexion DB + version de la base
        try:
            # db.engine.connect() déclenche une connexion
            with db.engine.connect() as conn:
                res = conn.execute(db.text('select 1 as ok'))
                row = res.fetchone()
                dialect = str(db.engine.dialect)
            ok_val = None
                
            try:
                ok_val = row[0] if row else 1
            except Exception:
                ok_val = 1

            return jsonify({"ok": True, "dialect": dialect, "test": ok_val})

        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500

    return app



app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    debug = (os.getenv('FLASK_DEBUG') or '').strip().lower() in ('1', 'true', 'yes')
    app.run(host='0.0.0.0', port=port, debug=debug)
