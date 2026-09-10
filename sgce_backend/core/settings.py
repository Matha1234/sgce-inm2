from pathlib import Path
from decouple import config
from datetime import timedelta
# ────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = [h.strip() for h in config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Packages installés
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    # Apps du projet
    'apps.catalogue',
    'apps.commandes',
    'apps.utilisateurs',
    'apps.facturation',
    'apps.ia',
    'apps.notifications.apps.NotificationsConfig',
    'apps.controle',
    'apps.messagerie',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ── Base de données Oracle ───────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.oracle',
        'NAME': (
            f"(DESCRIPTION="
            f"(ADDRESS=(PROTOCOL=TCP)(HOST={config('ORACLE_HOST')})(PORT={config('ORACLE_PORT')}))"
            f"(CONNECT_DATA=(SERVICE_NAME={config('ORACLE_SERVICE')})))"
        ),
        'USER': config('ORACLE_USER'),
        'PASSWORD': config('ORACLE_PASSWORD'),
    }
}
# ────────────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = 'utilisateurs.Utilisateur'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Indian/Antananarivo'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── CORS ─────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in config('CORS_ALLOWED_ORIGINS', default=config('FRONTEND_URL', default='http://localhost:5173')).split(',')
    if origin.strip()
]


# ── Email (réinitialisation de mot de passe) ──────────────────────────────
# SMTP Gmail par défaut : renseigner EMAIL_HOST_USER / EMAIL_HOST_PASSWORD
# (mot de passe d'application) dans le fichier .env pour un envoi réel.
# En développement sans SMTP, basculer sur le backend console pour afficher
# les emails dans le terminal : EMAIL_BACKEND=...console.EmailBackend
EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='')

# URL publique du frontend, utilisée pour construire le lien de
# réinitialisation envoyé par email.
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# Validité du jeton de réinitialisation (30 minutes).
PASSWORD_RESET_TIMEOUT = 1800

# ── REST Framework ───────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ── API Documentation ─────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'SGCFC-INM API',
    'DESCRIPTION': 'Système de Gestion des Coûts, de la Fabrication et du Contrôle du Prix de Revient — Imprimerie Nationale de Madagascar',
    'VERSION': '1.0.0',
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": False,
}