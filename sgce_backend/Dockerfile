# ── Étape unique : Python 3.11 (aligné sur ta config locale) ──────────────
FROM python:3.11-slim

# oracledb en mode "thin" ne nécessite PAS l'Oracle Instant Client :
# aucun paquet système Oracle à installer ici.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les dépendances Python d'abord (cache Docker efficace)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copier le code du projet
COPY . .

# Dossier pour les fichiers statiques collectés et les médias
RUN mkdir -p /app/staticfiles /app/media

EXPOSE 8000

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
