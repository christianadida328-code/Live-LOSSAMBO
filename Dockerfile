FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci

COPY frontend ./frontend
RUN npm --prefix frontend run build


FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-5000} --workers ${WEB_CONCURRENCY:-2} --timeout ${GUNICORN_TIMEOUT:-120}"]
