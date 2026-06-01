from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import Event, EventRegistration, EventRequest, User

events_bp = Blueprint('events', __name__)


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


@events_bp.get('/upcoming')
def upcoming():
    now = datetime.utcnow()
    events = (
        Event.query.filter(Event.start_at >= now)
        .order_by(Event.start_at.asc())
        .limit(50)
        .all()
    )
    return jsonify({"events": [_serialize_event(e) for e in events]})


@events_bp.get('/calendar')
def calendar():
    # Retourne tous les events pour un affichage calendrier (front filtre ensuite)
    events = Event.query.order_by(Event.start_at.asc()).all()
    return jsonify({"events": [_serialize_event(e) for e in events]})


@events_bp.post('/<int:event_id>/register')
@jwt_required()
def register_for_event(event_id):
    user_id = int(get_jwt_identity())

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": 'Utilisateur introuvable'}), 404

    event = Event.query.get_or_404(event_id)

    reg = EventRegistration(user_id=user.id, event_id=event.id)
    db.session.add(reg)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": 'Déjà inscrit ou erreur'}), 409

    return jsonify({"status": 'registered', "event": _serialize_event(event)})


@events_bp.post('/<int:event_id>/requests')
def create_event_request(event_id):
    event = Event.query.get_or_404(event_id)
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    whatsapp = (data.get('whatsapp') or '').strip()
    message = data.get('message') or ''

    if not name or not whatsapp:
        return jsonify({"error": "nom et WhatsApp requis"}), 400

    req = EventRequest(
        event_id=event.id,
        name=name,
        whatsapp=whatsapp,
        message=message,
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({"id": req.id, "status": "received"}), 201


@events_bp.get('/<int:event_id>')
def event_detail(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify({"event": _serialize_event(event)})

