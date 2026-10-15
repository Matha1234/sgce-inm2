#!/bin/sh
set -e

echo "→ Application des migrations Django..."
python manage.py migrate --noinput

echo "→ Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

echo "→ Démarrage de Gunicorn..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 150 \
    --max-requests 200 \
    --max-requests-jitter 50
