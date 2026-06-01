from flask import Blueprint, jsonify

from models import GalleryItem

gallery_bp = Blueprint('gallery', __name__)


def _serialize_gallery_item(item: GalleryItem):
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "media_url": item.media_url,
        "media_type": item.media_type,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@gallery_bp.get('/items')
def list_gallery_items():
    items = GalleryItem.query.order_by(GalleryItem.created_at.desc()).limit(12).all()
    return jsonify({"items": [_serialize_gallery_item(item) for item in items]})
