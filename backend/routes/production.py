from flask import Blueprint, jsonify, request

from extensions import db
from models import ProductionRequest, ProductionService

production_bp = Blueprint('production', __name__)


@production_bp.get('/services')
def services():
    services = ProductionService.query.all()
    return jsonify({
        "services": [{
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "price_hint": s.price_hint,
            "media_url": s.media_url
        } for s in services]
    })


@production_bp.post('/services/<int:service_id>/requests')
def create_service_request(service_id):
    service = ProductionService.query.get_or_404(service_id)
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    whatsapp = (data.get('whatsapp') or '').strip()
    message = data.get('message') or ''

    if not name or not whatsapp:
        return jsonify({"error": "nom et WhatsApp requis"}), 400

    req = ProductionRequest(
        service_id=service.id,
        name=name,
        whatsapp=whatsapp,
        message=message,
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({"id": req.id, "status": "received"}), 201

