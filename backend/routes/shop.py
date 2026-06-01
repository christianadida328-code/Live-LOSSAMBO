from flask import Blueprint, jsonify, request

from extensions import db
from models import ShopItem, ShopOrder

shop_bp = Blueprint('shop', __name__)


@shop_bp.get('/items')
def items():
    kind = (request.args.get('kind') or '').strip()
    q = ShopItem.query.filter_by(available=True)
    if kind in ('ticket', 'merch'):
        q = q.filter_by(kind=kind)

    items = q.order_by(ShopItem.id.desc()).all()

    return jsonify({
        "items": [{
            "id": i.id,
            "name": i.name,
            "description": i.description,
            "price": str(i.price),
            "image_url": i.image_url,
            "kind": i.kind,
        } for i in items]
    })


@shop_bp.post('/items/<int:item_id>/orders')
def create_order(item_id):
    item = ShopItem.query.get_or_404(item_id)
    if not item.available:
        return jsonify({"error": "article indisponible"}), 400

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    whatsapp = (data.get('whatsapp') or '').strip()
    message = data.get('message') or ''

    try:
        quantity = int(data.get('quantity') or 1)
    except (TypeError, ValueError):
        quantity = 1
    quantity = max(1, quantity)

    if not name or not whatsapp:
        return jsonify({"error": "nom et WhatsApp requis"}), 400

    order = ShopOrder(
        item_id=item.id,
        name=name,
        whatsapp=whatsapp,
        quantity=quantity,
        message=message,
    )
    db.session.add(order)
    db.session.commit()
    return jsonify({"id": order.id, "status": "received"}), 201

