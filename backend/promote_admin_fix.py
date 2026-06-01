"""Fix/replace for backend/set_admin.py

Reason:
- backend/set_admin.py uses: `with db.app.app_context():`
- Flask-SQLAlchemy `db` (SQLAlchemy instance) does NOT have `.app`.
- Correct pattern: create an app context using the Flask app created in backend/app.py.

Usage:
  python backend/promote_admin_fix.py

Environment variables:
  TARGET_EMAIL (required)
  TARGET_PASSWORD (optional, verify existing password)

Notes:
- This script promotes the user role to 'admin'.
- It ensures a MemberProfile exists.
"""

import os

from werkzeug.security import check_password_hash

from extensions import db
from models import User, MemberProfile

from app import create_app


def main() -> None:
    target_email = (os.getenv("TARGET_EMAIL") or "").strip().lower()
    target_password = (os.getenv("TARGET_PASSWORD") or "").strip()

    if not target_email:
        raise SystemExit("TARGET_EMAIL is required")

    app = create_app()

    with app.app_context():
        user = User.query.filter_by(email=target_email).first()
        if not user:
            raise SystemExit(f"No user found for email: {target_email}")

        if target_password:
            # verify password using existing stored hash
            if not check_password_hash(user.password_hash, target_password):
                raise SystemExit("TARGET_PASSWORD does not match existing password")

        user.role = "admin"

        # Ensure profile exists
        if not getattr(user, "profile", None):
            user.profile = MemberProfile(display_name=target_email.split("@")[0])

        db.session.commit()

    print(f"User promoted to admin: {target_email}")


if __name__ == "__main__":
    main()

