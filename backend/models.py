from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(32), nullable=False, default='member')  # member|admin

    # Admin: peut bloquer un compte membre (empêche les accès / actions)
    is_blocked = db.Column(db.Boolean, default=False, nullable=False, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


    profile = db.relationship('MemberProfile', back_populates='user', uselist=False)
    registrations = db.relationship('EventRegistration', back_populates='user', lazy=True)


    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class MemberProfile(db.Model):
    __tablename__ = 'member_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)

    display_name = db.Column(db.String(120), nullable=False)
    bio = db.Column(db.Text, default='', nullable=True)
    location = db.Column(db.String(120), default='', nullable=True)
    profile_image_url = db.Column(db.String(500), default='', nullable=True)
    ministry_role = db.Column(db.String(120), default='', nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', back_populates='profile')


class ContactRequest(db.Model):
    __tablename__ = 'contact_requests'

    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    requester = db.relationship('User', foreign_keys=[requester_id])
    recipient = db.relationship('User', foreign_keys=[recipient_id])


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, default='', nullable=True)
    media_url = db.Column(db.String(500), default='', nullable=True)
    message_type = db.Column(db.String(32), nullable=False, default='text')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    sender = db.relationship('User', foreign_keys=[sender_id])
    recipient = db.relationship('User', foreign_keys=[recipient_id])


class UserBlock(db.Model):
    __tablename__ = 'user_blocks'

    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    blocked_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint('blocker_id', 'blocked_id', name='uq_user_block'),)


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    created_by = db.relationship('User')


class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='', nullable=True)

    start_at = db.Column(db.DateTime, nullable=False, index=True)
    end_at = db.Column(db.DateTime, nullable=True)

    cover_url = db.Column(db.String(500), default='', nullable=True)
    venue = db.Column(db.String(200), default='', nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    registrations = db.relationship('EventRegistration', back_populates='event', lazy=True)


class EventRegistration(db.Model):
    __tablename__ = 'event_registrations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False, index=True)

    status = db.Column(db.String(32), nullable=False, default='registered')

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', back_populates='registrations')
    event = db.relationship('Event', back_populates='registrations')

    __table_args__ = (db.UniqueConstraint('user_id', 'event_id', name='uq_user_event'),)


class EventRequest(db.Model):
    __tablename__ = 'event_requests'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    whatsapp = db.Column(db.String(60), nullable=False)
    message = db.Column(db.Text, default='', nullable=True)
    status = db.Column(db.String(32), nullable=False, default='new')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    event = db.relationship('Event')


class ProductionService(db.Model):
    __tablename__ = 'production_services'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price_hint = db.Column(db.String(100), default='', nullable=True)
    media_url = db.Column(db.String(500), default='', nullable=True)


class GalleryItem(db.Model):
    __tablename__ = 'gallery_items'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='', nullable=True)
    media_url = db.Column(db.String(500), default='', nullable=True)
    media_type = db.Column(db.String(32), default='image', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ProductionRequest(db.Model):
    __tablename__ = 'production_requests'

    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey('production_services.id'), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    whatsapp = db.Column(db.String(60), nullable=False)
    message = db.Column(db.Text, default='', nullable=True)
    status = db.Column(db.String(32), nullable=False, default='new')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    service = db.relationship('ProductionService')


class ShopItem(db.Model):
    __tablename__ = 'shop_items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    price = db.Column(db.Numeric(10, 2), nullable=False)
    image_url = db.Column(db.String(500), default='', nullable=True)
    kind = db.Column(db.String(32), default='ticket')  # ticket|merch

    available = db.Column(db.Boolean, default=True, nullable=False)


class ShopOrder(db.Model):
    __tablename__ = 'shop_orders'

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('shop_items.id'), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    whatsapp = db.Column(db.String(60), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    message = db.Column(db.Text, default='', nullable=True)
    status = db.Column(db.String(32), nullable=False, default='new')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    item = db.relationship('ShopItem')

