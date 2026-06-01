"""Utility to promote an existing user to admin.

Usage (from project root):
  python backend/set_admin.py

This script reads environment variables:
  TARGET_EMAIL   (required) e.g. "kedornyota328@gmail.com"
  TARGET_PASSWORD (optional, for verification only)

Then it updates the user's role to 'admin'.

WARNING: This directly modifies the database.
"""

import os
from werkzeug.security import check_password_hash

from extensions import db
from models import User, MemberProfile


def main() -> None:
    target_email = (os.getenv("TARGET_EMAIL") or "").strip().lower()
    target_password = (os.getenv("TARGET_PASSWORD") or "").strip()

    if not target_email:
        raise SystemExit("TARGET_EMAIL is required")

    with db.app.app_context():
        user = User.query.filter_by(email=target_email).first()
        if not user:
            raise SystemExit(f"No user found for email: {target_email}")

        if target_password:
            if not user.check_password(target_password):
                raise SystemExit("TARGET_PASSWORD does not match existing password")

        if user.role != "admin":
            user.role = "admin"

        # Ensure profile exists
        if not getattr(user, "profile", None):
            user.profile = MemberProfile(display_name=target_email.split("@")[0])

        db.session.commit()

    print(f"User promoted to admin: {target_email}")


if __name__ == "__main__":
    main()

