from datetime import datetime
import os
from urllib.parse import quote
import uuid

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from models import User, Event, EventRequest, GalleryItem, Notification, ProductionRequest, ProductionService, ShopItem, ShopOrder
from extensions import db



admin_bp = Blueprint('admin', __name__)

ALLOWED_UPLOAD_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return False
    return True


def _serialize_event(e: Event):
    return {
        "id": e.id,
        "title": e.title,
        "description": e.description,
        "start_at": e.start_at.isoformat(),
        "end_at": e.end_at.isoformat() if e.end_at else None,
        "cover_url": e.cover_url,
        "venue": e.venue,
    }


def _serialize_service(s: ProductionService):
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "price_hint": s.price_hint,
        "media_url": s.media_url,
    }


def _serialize_gallery_item(item: GalleryItem):
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "media_url": item.media_url,
        "media_type": item.media_type,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _serialize_shop_item(i: ShopItem):
    return {
        "id": i.id,
        "name": i.name,
        "description": i.description,
        "price": str(i.price),
        "image_url": i.image_url,
        "kind": i.kind,
        "available": i.available,
    }


def _clean_whatsapp(value):
    return ''.join(ch for ch in (value or '') if ch.isdigit())


def _serialize_event_request(r: EventRequest):
    text = f"Bonjour {r.name}, je vous contacte pour votre demande d'inscription à l'événement: {r.event.title if r.event else ''}"
    phone = _clean_whatsapp(r.whatsapp)
    return {
        "id": r.id,
        "type": "event",
        "title": r.event.title if r.event else "Événement supprimé",
        "name": r.name,
        "whatsapp": r.whatsapp,
        "message": r.message,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "whatsapp_url": f"https://wa.me/{phone}?text={quote(text)}" if phone else "",
    }


def _serialize_production_request(r: ProductionRequest):
    text = f"Bonjour {r.name}, je vous contacte pour votre demande production: {r.service.name if r.service else ''}"
    phone = _clean_whatsapp(r.whatsapp)
    return {
        "id": r.id,
        "type": "production",
        "title": r.service.name if r.service else "Service supprimé",
        "name": r.name,
        "whatsapp": r.whatsapp,
        "message": r.message,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "whatsapp_url": f"https://wa.me/{phone}?text={quote(text)}" if phone else "",
    }


def _serialize_shop_order(r: ShopOrder):
    text = f"Bonjour {r.name}, je vous contacte pour votre commande: {r.item.name if r.item else ''}"
    phone = _clean_whatsapp(r.whatsapp)
    return {
        "id": r.id,
        "type": "shop",
        "title": r.item.name if r.item else "Article supprimé",
        "name": r.name,
        "whatsapp": r.whatsapp,
        "quantity": r.quantity,
        "message": r.message,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "whatsapp_url": f"https://wa.me/{phone}?text={quote(text)}" if phone else "",
    }


def _serialize_notification(n: Notification):
    return {
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "created_by": n.created_by.email if n.created_by else None,
    }


# -----------------
# Uploads
# -----------------

def _allowed_upload(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_UPLOAD_EXTENSIONS


@admin_bp.post('/uploads')
@jwt_required()
def upload_file():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({"error": "fichier requis"}), 400

    if not _allowed_upload(file.filename):
        return jsonify({"error": "format non autorisé"}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER')
    if not upload_folder:
        return jsonify({"error": "dossier upload indisponible"}), 500

    os.makedirs(upload_folder, exist_ok=True)
    original_name = secure_filename(file.filename)
    ext = original_name.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(upload_folder, filename)
    file.save(path)

    url = request.host_url.rstrip('/') + f"/uploads/{filename}"
    return jsonify({"filename": filename, "url": url}), 201


# -----------------
# Visitor requests
# -----------------

@admin_bp.get('/requests')
@jwt_required()
def list_requests():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    event_requests = EventRequest.query.order_by(EventRequest.created_at.desc()).all()
    production_requests = ProductionRequest.query.order_by(ProductionRequest.created_at.desc()).all()
    shop_orders = ShopOrder.query.order_by(ShopOrder.created_at.desc()).all()

    requests = (
        [_serialize_event_request(r) for r in event_requests]
        + [_serialize_production_request(r) for r in production_requests]
        + [_serialize_shop_order(r) for r in shop_orders]
    )
    requests.sort(key=lambda r: r.get('created_at') or '', reverse=True)
    return jsonify({"requests": requests})


@admin_bp.put('/requests/<kind>/<int:request_id>')
@jwt_required()
def update_request_status(kind, request_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    data = request.get_json() or {}
    status = data.get('status') or 'done'
    model = {
        'event': EventRequest,
        'production': ProductionRequest,
        'shop': ShopOrder,
    }.get(kind)
    if not model:
        return jsonify({"error": "type invalide"}), 400

    item = model.query.get_or_404(request_id)
    item.status = status
    db.session.commit()
    return jsonify({"status": "updated"})


# -----------------
# Notifications
# -----------------

@admin_bp.get('/notifications')
@jwt_required()
def list_notifications():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    items = Notification.query.order_by(Notification.created_at.desc()).limit(100).all()
    return jsonify({"notifications": [_serialize_notification(n) for n in items]})


@admin_bp.post('/notifications')
@jwt_required()
def create_notification():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    message = (data.get('message') or '').strip()
    if not title or not message:
        return jsonify({"error": "titre et message requis"}), 400

    item = Notification(
        title=title,
        message=message,
        created_by_id=int(get_jwt_identity()),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"id": item.id, "status": "sent"}), 201


# -----------------
# Events
# -----------------

@admin_bp.get('/events')
@jwt_required()
def list_events():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    events = Event.query.order_by(Event.start_at.asc()).all()
    return jsonify({"events": [_serialize_event(e) for e in events]})


@admin_bp.post('/events')
@jwt_required()
def create_event():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    description = data.get('description') or ''
    start_at = data.get('start_at')
    end_at = data.get('end_at')
    cover_url = data.get('cover_url') or ''
    venue = data.get('venue') or ''

    if not title or not start_at:
        return jsonify({"error": "title et start_at requis"}), 400

    ev = Event(
        title=title,
        description=description,
        start_at=datetime.fromisoformat(start_at),
        end_at=datetime.fromisoformat(end_at) if end_at else None,
        cover_url=cover_url,
        venue=venue,
    )
    db.session.add(ev)
    db.session.commit()

    return jsonify({"id": ev.id}), 201


@admin_bp.put('/events/<int:event_id>')
@jwt_required()
def update_event(event_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    ev = Event.query.get_or_404(event_id)
    data = request.get_json() or {}

    if 'title' in data:
        ev.title = (data.get('title') or '').strip()
    if 'description' in data:
        ev.description = data.get('description') or ''
    if 'start_at' in data and data['start_at']:
        ev.start_at = datetime.fromisoformat(data['start_at'])
    if 'end_at' in data:
        ev.end_at = datetime.fromisoformat(data['end_at']) if data['end_at'] else None
    if 'cover_url' in data:
        ev.cover_url = data.get('cover_url') or ''
    if 'venue' in data:
        ev.venue = data.get('venue') or ''

    db.session.commit()
    return jsonify({"status": "updated"})


@admin_bp.delete('/events/<int:event_id>')
@jwt_required()
def delete_event(event_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    ev = Event.query.get_or_404(event_id)
    db.session.delete(ev)
    db.session.commit()
    return jsonify({"status": "deleted"})


# -----------------
# Production services
# -----------------

@admin_bp.get('/production/services')
@jwt_required()
def list_services():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    services = ProductionService.query.order_by(ProductionService.id.desc()).all()
    return jsonify({"services": [_serialize_service(s) for s in services]})


@admin_bp.post('/production/services')
@jwt_required()
def create_service():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({"error": "nom du service requis"}), 400

    s = ProductionService(
        name=name,
        description=data.get('description') or '',
        price_hint=data.get('price_hint') or '',
        media_url=data.get('media_url') or ''
    )
    db.session.add(s)
    db.session.commit()
    return jsonify({"id": s.id}), 201


@admin_bp.put('/production/services/<int:service_id>')
@jwt_required()
def update_service(service_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    s = ProductionService.query.get_or_404(service_id)
    data = request.get_json() or {}

    if 'name' in data:
        s.name = (data.get('name') or '').strip()
    if 'description' in data:
        s.description = data.get('description') or ''
    if 'price_hint' in data:
        s.price_hint = data.get('price_hint') or ''
    if 'media_url' in data:
        s.media_url = data.get('media_url') or ''

    db.session.commit()
    return jsonify({"status": "updated"})


@admin_bp.delete('/production/services/<int:service_id>')
@jwt_required()
def delete_service(service_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    s = ProductionService.query.get_or_404(service_id)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"status": "deleted"})


# -----------------
# Gallery
# -----------------

@admin_bp.get('/gallery/items')
@jwt_required()
def list_gallery_items():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    items = GalleryItem.query.order_by(GalleryItem.created_at.desc()).all()
    return jsonify({"items": [_serialize_gallery_item(item) for item in items]})


@admin_bp.post('/gallery/items')
@jwt_required()
def create_gallery_item():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({"error": "titre requis"}), 400

    item = GalleryItem(
        title=title,
        description=data.get('description') or '',
        media_url=data.get('media_url') or '',
        media_type=data.get('media_type') or 'image',
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"id": item.id}), 201


@admin_bp.put('/gallery/items/<int:item_id>')
@jwt_required()
def update_gallery_item(item_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    item = GalleryItem.query.get_or_404(item_id)
    data = request.get_json() or {}

    if 'title' in data:
        item.title = (data.get('title') or '').strip()
    if 'description' in data:
        item.description = data.get('description') or ''
    if 'media_url' in data:
        item.media_url = data.get('media_url') or ''
    if 'media_type' in data:
        item.media_type = data.get('media_type') or 'image'

    db.session.commit()
    return jsonify({"status": "updated"})


@admin_bp.delete('/gallery/items/<int:item_id>')
@jwt_required()
def delete_gallery_item(item_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    item = GalleryItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"status": "deleted"})


# -----------------
# Shop items
# -----------------

@admin_bp.get('/shop/items')
@jwt_required()
def list_shop_items():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    items = ShopItem.query.order_by(ShopItem.id.desc()).all()
    return jsonify({"items": [_serialize_shop_item(i) for i in items]})


@admin_bp.post('/shop/items')
@jwt_required()
def create_shop_item():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({"error": "nom de l'item requis"}), 400

    item = ShopItem(
        name=name,
        description=data.get('description') or '',
        price=data.get('price') or 0,
        image_url=data.get('image_url') or '',
        kind=data.get('kind') or 'ticket',
        available=bool(data.get('available', True))
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"id": item.id}), 201


@admin_bp.put('/shop/items/<int:item_id>')
@jwt_required()
def update_shop_item(item_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    item = ShopItem.query.get_or_404(item_id)
    data = request.get_json() or {}

    if 'name' in data:
        item.name = (data.get('name') or '').strip()
    if 'description' in data:
        item.description = data.get('description') or ''
    if 'price' in data:
        item.price = data.get('price') or 0
    if 'image_url' in data:
        item.image_url = data.get('image_url') or ''
    if 'kind' in data:
        item.kind = data.get('kind') or 'ticket'
    if 'available' in data:
        item.available = bool(data.get('available', True))

    db.session.commit()
    return jsonify({"status": "updated"})


@admin_bp.delete('/shop/items/<int:item_id>')
@jwt_required()
def delete_shop_item(item_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    item = ShopItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"status": "deleted"})


# -----------------
# Members
# -----------------


def _serialize_member(u: User):
    return {
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "is_blocked": bool(getattr(u, 'is_blocked', False)),
        "display_name": u.profile.display_name if getattr(u, 'profile', None) else None,
        "profile_image_url": u.profile.profile_image_url if getattr(u, 'profile', None) else None,
        "ministry_role": u.profile.ministry_role if getattr(u, 'profile', None) else None,
        "bio": u.profile.bio if getattr(u, 'profile', None) else None,
        "location": u.profile.location if getattr(u, 'profile', None) else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@admin_bp.get('/members')
@jwt_required()
def list_members():
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    users = User.query.order_by(User.created_at.desc()).all()
    # Montrer tous les comptes (membre + admin). Le rôle est retourné dans la sérialisation.
    return jsonify({"members": [_serialize_member(u) for u in users]})


@admin_bp.put('/members/<int:user_id>/block')
@jwt_required()
def set_member_block(user_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    u = User.query.get_or_404(user_id)
    if u.role != 'member':
        return jsonify({"error": "impossible: compte non-member"}), 400

    data = request.get_json() or {}
    should_block = bool(data.get('is_blocked', True))

    u.is_blocked = should_block
    db.session.commit()
    return jsonify({"status": "updated", "user": _serialize_member(u)})


@admin_bp.delete('/members/<int:user_id>')
@jwt_required()
def delete_member(user_id):
    if not require_admin():
        return jsonify({"error": "admin requis"}), 403

    u = User.query.get_or_404(user_id)
    if u.role != 'member':
        return jsonify({"error": "impossible: compte non-member"}), 400

    db.session.delete(u)
    db.session.commit()
    return jsonify({"status": "deleted"})



