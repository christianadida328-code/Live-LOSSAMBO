from datetime import datetime
from functools import wraps
from urllib.parse import quote

from flask import Blueprint, flash, redirect, render_template, request, session, url_for

from extensions import db
from models import (
    Event,
    EventRequest,
    GalleryItem,
    MemberProfile,
    Notification,
    ProductionRequest,
    ProductionService,
    ShopItem,
    ShopOrder,
    User,
)


pages_bp = Blueprint("pages", __name__)


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return User.query.get(user_id)


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if not user or user.role != "admin":
            flash("Connexion admin requise.", "err")
            return redirect(url_for("pages.admin_login"))
        return view(*args, **kwargs)

    return wrapped


@pages_bp.app_context_processor
def inject_user():
    return {"current_user": current_user()}


def clean_whatsapp(value):
    return "".join(ch for ch in (value or "") if ch.isdigit())


def whatsapp_url(phone, text):
    phone = clean_whatsapp(phone)
    return f"https://wa.me/{phone}?text={quote(text)}" if phone else ""


@pages_bp.get("/")
def home():
    events = Event.query.filter(Event.start_at >= datetime.utcnow()).order_by(Event.start_at.asc()).limit(6).all()
    gallery = GalleryItem.query.order_by(GalleryItem.created_at.desc()).limit(6).all()
    return render_template("home.html", events=events, gallery=gallery)


@pages_bp.route("/events", methods=["GET", "POST"])
def events():
    if request.method == "POST":
        event = Event.query.get_or_404(int(request.form.get("event_id") or 0))
        name = (request.form.get("name") or "").strip()
        whatsapp = (request.form.get("whatsapp") or "").strip()
        message = request.form.get("message") or ""
        if not name or not whatsapp:
            flash("Nom et WhatsApp requis.", "err")
        else:
            db.session.add(EventRequest(event_id=event.id, name=name, whatsapp=whatsapp, message=message))
            db.session.commit()
            flash("Demande envoyee. L'admin vous repondra sur WhatsApp.", "toast")
        return redirect(url_for("pages.events") + f"#event-{event.id}")

    items = Event.query.order_by(Event.start_at.asc()).all()
    return render_template("events.html", events=items)


@pages_bp.route("/production", methods=["GET", "POST"])
def production():
    if request.method == "POST":
        service = ProductionService.query.get_or_404(int(request.form.get("service_id") or 0))
        name = (request.form.get("name") or "").strip()
        whatsapp = (request.form.get("whatsapp") or "").strip()
        message = request.form.get("message") or ""
        if not name or not whatsapp:
            flash("Nom et WhatsApp requis.", "err")
        else:
            db.session.add(ProductionRequest(service_id=service.id, name=name, whatsapp=whatsapp, message=message))
            db.session.commit()
            flash("Demande envoyee. L'admin vous repondra sur WhatsApp.", "toast")
        return redirect(url_for("pages.production") + f"#service-{service.id}")

    services = ProductionService.query.order_by(ProductionService.id.desc()).all()
    return render_template("production.html", services=services)


@pages_bp.route("/shop", methods=["GET", "POST"])
def shop():
    if request.method == "POST":
        item = ShopItem.query.get_or_404(int(request.form.get("item_id") or 0))
        name = (request.form.get("name") or "").strip()
        whatsapp = (request.form.get("whatsapp") or "").strip()
        message = request.form.get("message") or ""
        try:
            quantity = max(1, int(request.form.get("quantity") or 1))
        except ValueError:
            quantity = 1
        if not name or not whatsapp:
            flash("Nom et WhatsApp requis.", "err")
        else:
            db.session.add(ShopOrder(item_id=item.id, name=name, whatsapp=whatsapp, quantity=quantity, message=message))
            db.session.commit()
            flash("Commande envoyee. L'admin vous repondra sur WhatsApp.", "toast")
        return redirect(url_for("pages.shop") + f"#item-{item.id}")

    items = ShopItem.query.filter_by(available=True).order_by(ShopItem.id.desc()).all()
    return render_template("shop.html", items=items)


@pages_bp.route("/auth", methods=["GET", "POST"])
def auth():
    if request.method == "POST":
        action = request.form.get("action")
        email = (request.form.get("email") or "").strip().lower()
        password = (request.form.get("password") or "").strip()
        if action == "login":
            user = User.query.filter_by(email=email).first()
            if not user or not user.check_password(password):
                flash("Identifiants invalides.", "err")
            elif user.is_blocked:
                flash("Compte bloque par l'admin.", "err")
            else:
                session["user_id"] = user.id
                flash("Connexion reussie.", "toast")
                return redirect(url_for("pages.home"))
        elif action == "register":
            display_name = (request.form.get("display_name") or email.split("@")[0]).strip()
            ministry_role = (request.form.get("ministry_role") or "").strip()
            if not email or "@" not in email or len(password) < 8 or not ministry_role:
                flash("Email, mot de passe de 8 caracteres et role/ministere requis.", "err")
            elif User.query.filter_by(email=email).first():
                flash("Email deja utilise.", "err")
            else:
                user = User(email=email)
                user.set_password(password)
                user.profile = MemberProfile(
                    display_name=display_name,
                    ministry_role=ministry_role,
                    profile_image_url="/images/logo.png",
                )
                db.session.add(user)
                db.session.commit()
                session["user_id"] = user.id
                flash("Compte cree.", "toast")
                return redirect(url_for("pages.home"))
    return render_template("auth.html")


@pages_bp.post("/logout")
def logout():
    session.clear()
    flash("Deconnexion effectuee.", "toast")
    return redirect(url_for("pages.home"))


@pages_bp.get("/members")
def members():
    if not current_user():
        flash("Connexion requise.", "err")
        return redirect(url_for("pages.auth"))
    users = User.query.filter_by(is_blocked=False).order_by(User.created_at.desc()).all()
    return render_template("members.html", members=users)


@pages_bp.get("/messages")
def messages():
    if not current_user():
        flash("Connexion requise.", "err")
        return redirect(url_for("pages.auth"))
    return render_template("messages.html")


@pages_bp.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = (request.form.get("password") or "").strip()
        user = User.query.filter_by(email=email, role="admin").first()
        if not user or not user.check_password(password):
            flash("Gmail ou mot de passe admin invalide.", "err")
        else:
            session["user_id"] = user.id
            flash("Connexion admin reussie.", "toast")
            return redirect(url_for("pages.admin"))
    return render_template("admin_login.html")


@pages_bp.get("/admin")
@admin_required
def admin():
    requests = []
    for item in EventRequest.query.order_by(EventRequest.created_at.desc()).all():
        requests.append({
            "kind": "event",
            "id": item.id,
            "title": item.event.title if item.event else "Evenement supprime",
            "name": item.name,
            "whatsapp": item.whatsapp,
            "message": item.message,
            "status": item.status,
            "whatsapp_url": whatsapp_url(item.whatsapp, f"Bonjour {item.name}, je vous contacte pour votre demande d'inscription."),
        })
    for item in ProductionRequest.query.order_by(ProductionRequest.created_at.desc()).all():
        requests.append({
            "kind": "production",
            "id": item.id,
            "title": item.service.name if item.service else "Service supprime",
            "name": item.name,
            "whatsapp": item.whatsapp,
            "message": item.message,
            "status": item.status,
            "whatsapp_url": whatsapp_url(item.whatsapp, f"Bonjour {item.name}, je vous contacte pour votre demande production."),
        })
    for item in ShopOrder.query.order_by(ShopOrder.created_at.desc()).all():
        requests.append({
            "kind": "shop",
            "id": item.id,
            "title": item.item.name if item.item else "Article supprime",
            "name": item.name,
            "whatsapp": item.whatsapp,
            "message": item.message,
            "status": item.status,
            "quantity": item.quantity,
            "whatsapp_url": whatsapp_url(item.whatsapp, f"Bonjour {item.name}, je vous contacte pour votre commande."),
        })
    return render_template(
        "admin.html",
        events=Event.query.order_by(Event.start_at.asc()).all(),
        services=ProductionService.query.order_by(ProductionService.id.desc()).all(),
        shop_items=ShopItem.query.order_by(ShopItem.id.desc()).all(),
        members=User.query.order_by(User.created_at.desc()).all(),
        requests=requests,
    )


@pages_bp.post("/admin/events")
@admin_required
def admin_create_event():
    title = (request.form.get("title") or "").strip()
    start_at = request.form.get("start_at")
    if not title or not start_at:
        flash("Titre et date requis.", "err")
    else:
        db.session.add(Event(
            title=title,
            description=request.form.get("description") or "",
            start_at=datetime.fromisoformat(start_at),
            cover_url=request.form.get("cover_url") or "",
            venue=request.form.get("venue") or "",
        ))
        db.session.commit()
        flash("Evenement cree.", "toast")
    return redirect(url_for("pages.admin"))


@pages_bp.post("/admin/services")
@admin_required
def admin_create_service():
    name = (request.form.get("name") or "").strip()
    if not name:
        flash("Nom du service requis.", "err")
    else:
        db.session.add(ProductionService(
            name=name,
            description=request.form.get("description") or "",
            price_hint=request.form.get("price_hint") or "",
            media_url=request.form.get("media_url") or "",
        ))
        db.session.commit()
        flash("Service cree.", "toast")
    return redirect(url_for("pages.admin"))


@pages_bp.post("/admin/shop")
@admin_required
def admin_create_shop_item():
    name = (request.form.get("name") or "").strip()
    if not name:
        flash("Nom de l'article requis.", "err")
    else:
        db.session.add(ShopItem(
            name=name,
            description=request.form.get("description") or "",
            price=request.form.get("price") or 0,
            image_url=request.form.get("image_url") or "",
            kind=request.form.get("kind") or "ticket",
            available=True,
        ))
        db.session.commit()
        flash("Article cree.", "toast")
    return redirect(url_for("pages.admin"))


@pages_bp.post("/admin/delete/<kind>/<int:item_id>")
@admin_required
def admin_delete(kind, item_id):
    model = {"event": Event, "service": ProductionService, "shop": ShopItem}.get(kind)
    if model:
        item = model.query.get_or_404(item_id)
        db.session.delete(item)
        db.session.commit()
        flash("Element supprime.", "toast")
    return redirect(url_for("pages.admin"))


@pages_bp.post("/admin/requests/<kind>/<int:item_id>/done")
@admin_required
def admin_mark_done(kind, item_id):
    model = {"event": EventRequest, "production": ProductionRequest, "shop": ShopOrder}.get(kind)
    if model:
        item = model.query.get_or_404(item_id)
        item.status = "done"
        db.session.commit()
        flash("Demande marquee comme traitee.", "toast")
    return redirect(url_for("pages.admin"))
