import os
import uuid

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_
from werkzeug.utils import secure_filename

from extensions import db
from models import User, MemberProfile, EventRegistration, Notification, ContactRequest, ChatMessage, UserBlock

members_bp = Blueprint('members', __name__)
ALLOWED_CHAT_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'm4a', 'webm'}
IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a', 'webm'}


def _profile(user):
    profile = user.profile
    return {
        "id": user.id,
        "display_name": profile.display_name if profile else user.email.split('@')[0],
        "profile_image_url": profile.profile_image_url if profile else '',
        "ministry_role": profile.ministry_role if profile else '',
    }


def _friends_count(user_id):
    return ContactRequest.query.filter(
        ContactRequest.status == 'accepted',
        or_(ContactRequest.requester_id == user_id, ContactRequest.recipient_id == user_id),
    ).count()


def _is_blocked(a, b):
    return UserBlock.query.filter(
        or_(
            and_(UserBlock.blocker_id == a, UserBlock.blocked_id == b),
            and_(UserBlock.blocker_id == b, UserBlock.blocked_id == a),
        )
    ).first() is not None


def _contact_status(a, b):
    req = ContactRequest.query.filter(
        or_(
            and_(ContactRequest.requester_id == a, ContactRequest.recipient_id == b),
            and_(ContactRequest.requester_id == b, ContactRequest.recipient_id == a),
        )
    ).order_by(ContactRequest.created_at.desc()).first()
    return req


@members_bp.get('/me')
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    profile = user.profile

    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "profile": {
                "display_name": profile.display_name if profile else None,
                "bio": profile.bio if profile else None,
                "location": profile.location if profile else None,
                "profile_image_url": profile.profile_image_url if profile else None,
                "ministry_role": profile.ministry_role if profile else None,
            } if profile else None,
            "friends_count": _friends_count(user_id),
        }
    })


@members_bp.put('/me')
@jwt_required()
def update_me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    profile = user.profile
    if not profile:
        profile = MemberProfile(user_id=user.id, display_name=user.email.split('@')[0])
        db.session.add(profile)

    data = request.get_json() or {}
    if 'display_name' in data:
        display_name = (data.get('display_name') or '').strip()
        if not display_name:
            return jsonify({"error": "nom requis"}), 400
        profile.display_name = display_name
    if 'profile_image_url' in data:
        profile.profile_image_url = (data.get('profile_image_url') or '').strip()
    if 'ministry_role' in data:
        profile.ministry_role = (data.get('ministry_role') or '').strip()
    if 'bio' in data:
        profile.bio = data.get('bio') or ''
    if 'location' in data:
        profile.location = data.get('location') or ''

    db.session.commit()
    return jsonify({"status": "updated"})


@members_bp.put('/me/block')
@jwt_required()
def block_own_account():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    user.is_blocked = True
    db.session.commit()
    return jsonify({"status": "blocked"})


@members_bp.delete('/me')
@jwt_required()
def delete_own_account():
    user_id = int(get_jwt_identity())
    ChatMessage.query.filter(or_(ChatMessage.sender_id == user_id, ChatMessage.recipient_id == user_id)).delete(synchronize_session=False)
    ContactRequest.query.filter(or_(ContactRequest.requester_id == user_id, ContactRequest.recipient_id == user_id)).delete(synchronize_session=False)
    UserBlock.query.filter(or_(UserBlock.blocker_id == user_id, UserBlock.blocked_id == user_id)).delete(synchronize_session=False)
    EventRegistration.query.filter_by(user_id=user_id).delete(synchronize_session=False)
    MemberProfile.query.filter_by(user_id=user_id).delete(synchronize_session=False)
    User.query.filter_by(id=user_id).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({"status": "deleted"})


@members_bp.get('/my-registrations')
@jwt_required()
def my_registrations():
    user_id = int(get_jwt_identity())

    regs = (
        EventRegistration.query.filter_by(user_id=user_id)
        .order_by(EventRegistration.created_at.desc())
        .all()
    )

    def serialize_event(e):
        return {
            "id": e.id,
            "title": e.title,
            "start_at": e.start_at.isoformat(),
            "cover_url": e.cover_url,
            "venue": e.venue,
        }

    return jsonify({
        "registrations": [{"id": r.id, "status": r.status, "event": serialize_event(r.event)} for r in regs]
    })


@members_bp.get('/notifications')
@jwt_required()
def notifications():
    items = Notification.query.order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify({
        "notifications": [{
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in items]
    })


@members_bp.get('/search')
@jwt_required()
def search_members():
    user_id = int(get_jwt_identity())
    q = (request.args.get('q') or '').strip()

    query = User.query.join(MemberProfile).filter(User.id != user_id)
    if q:
        query = query.filter(MemberProfile.display_name.ilike(f"%{q}%"))
    users = query.order_by(MemberProfile.display_name.asc()).limit(60).all()
    return jsonify({"members": [_profile(u) for u in users if not _is_blocked(user_id, u.id)]})


@members_bp.get('/contacts')
@jwt_required()
def contacts():
    user_id = int(get_jwt_identity())
    requests = ContactRequest.query.filter(
        or_(ContactRequest.requester_id == user_id, ContactRequest.recipient_id == user_id)
    ).order_by(ContactRequest.updated_at.desc()).all()

    return jsonify({"contacts": [{
        "id": r.id,
        "status": r.status,
        "direction": "sent" if r.requester_id == user_id else "received",
        "member": _profile(r.recipient if r.requester_id == user_id else r.requester),
    } for r in requests if not _is_blocked(user_id, r.recipient_id if r.requester_id == user_id else r.requester_id)]})


@members_bp.post('/contacts/<int:member_id>/request')
@jwt_required()
def request_contact(member_id):
    user_id = int(get_jwt_identity())
    if user_id == member_id:
        return jsonify({"error": "demande impossible"}), 400
    User.query.get_or_404(member_id)
    if _is_blocked(user_id, member_id):
        return jsonify({"error": "contact bloqué"}), 403

    existing = _contact_status(user_id, member_id)
    if existing and existing.status != 'deleted':
        return jsonify({"id": existing.id, "status": existing.status}), 200

    req = ContactRequest(requester_id=user_id, recipient_id=member_id)
    db.session.add(req)
    db.session.commit()
    return jsonify({"id": req.id, "status": req.status}), 201


@members_bp.put('/contacts/<int:request_id>')
@jwt_required()
def update_contact(request_id):
    user_id = int(get_jwt_identity())
    req = ContactRequest.query.get_or_404(request_id)
    data = request.get_json() or {}
    status = data.get('status')
    if status == 'accepted' and req.recipient_id == user_id:
        req.status = 'accepted'
    elif status == 'deleted' and user_id in (req.requester_id, req.recipient_id):
        req.status = 'deleted'
    else:
        return jsonify({"error": "action non autorisée"}), 403
    db.session.commit()
    return jsonify({"status": req.status})


@members_bp.post('/block/<int:member_id>')
@jwt_required()
def block_member(member_id):
    user_id = int(get_jwt_identity())
    if user_id == member_id:
        return jsonify({"error": "blocage impossible"}), 400
    User.query.get_or_404(member_id)
    ContactRequest.query.filter(
        or_(
            and_(ContactRequest.requester_id == user_id, ContactRequest.recipient_id == member_id),
            and_(ContactRequest.requester_id == member_id, ContactRequest.recipient_id == user_id),
        )
    ).delete()
    if not UserBlock.query.filter_by(blocker_id=user_id, blocked_id=member_id).first():
        db.session.add(UserBlock(blocker_id=user_id, blocked_id=member_id))
    db.session.commit()
    return jsonify({"status": "blocked"})


@members_bp.post('/messages/upload')
@jwt_required()
def upload_message_media():
    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({"error": "fichier requis"}), 400
    if '.' not in file.filename:
        return jsonify({"error": "format invalide"}), 400
    ext = file.filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_CHAT_EXTENSIONS:
        return jsonify({"error": "format non autorisé"}), 400
    media_type = 'image' if ext in IMAGE_EXTENSIONS else 'audio' if ext in AUDIO_EXTENSIONS else ''
    if not media_type:
        return jsonify({"error": "vidéo non autorisée"}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER')
    os.makedirs(upload_folder, exist_ok=True)
    filename = f"chat_{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_folder, secure_filename(filename)))
    return jsonify({"url": request.host_url.rstrip('/') + f"/uploads/{filename}", "message_type": media_type}), 201


@members_bp.get('/messages/<int:member_id>')
@jwt_required()
def list_messages(member_id):
    user_id = int(get_jwt_identity())
    if _is_blocked(user_id, member_id):
        return jsonify({"error": "contact bloqué"}), 403

    messages = ChatMessage.query.filter(
        or_(
            and_(ChatMessage.sender_id == user_id, ChatMessage.recipient_id == member_id),
            and_(ChatMessage.sender_id == member_id, ChatMessage.recipient_id == user_id),
        )
    ).order_by(ChatMessage.created_at.asc()).limit(200).all()
    contact = _contact_status(user_id, member_id)
    return jsonify({
        "contact_status": contact.status if contact else None,
        "messages": [{
            "id": m.id,
            "sender_id": m.sender_id,
            "recipient_id": m.recipient_id,
            "content": m.content,
            "media_url": m.media_url,
            "message_type": m.message_type,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        } for m in messages]
    })


@members_bp.post('/messages/<int:member_id>')
@jwt_required()
def send_message(member_id):
    user_id = int(get_jwt_identity())
    User.query.get_or_404(member_id)
    if _is_blocked(user_id, member_id):
        return jsonify({"error": "contact bloqué"}), 403

    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    media_url = (data.get('media_url') or '').strip()
    message_type = data.get('message_type') or ('text' if content else '')
    if message_type not in ('text', 'image', 'audio') or (not content and not media_url):
        return jsonify({"error": "message invalide"}), 400

    contact = _contact_status(user_id, member_id)
    if not contact:
        contact = ContactRequest(requester_id=user_id, recipient_id=member_id)
        db.session.add(contact)
        db.session.flush()

    if contact.status != 'accepted':
        sent_before_accept = ChatMessage.query.filter_by(sender_id=user_id, recipient_id=member_id).count()
        if sent_before_accept >= 2:
            return jsonify({"error": "limite de 2 messages avant acceptation"}), 403

    msg = ChatMessage(
        sender_id=user_id,
        recipient_id=member_id,
        content=content,
        media_url=media_url,
        message_type=message_type,
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify({"id": msg.id}), 201

