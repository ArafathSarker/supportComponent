import os
from pathlib import Path
import logging

logger = logging.getLogger("config")

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-support-component-enterprise-architecture-2026'
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    # ASGI Daphne server (must be before django.contrib.staticfiles)
    'daphne',

    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'corsheaders',
    'rest_framework',
    'channels',

    # Modular Domain Apps
    'apps.core.apps.CoreConfig',
    'apps.tickets.apps.TicketsConfig',
    'apps.chat.apps.ChatConfig',
    'apps.visiting.apps.VisitingConfig',
    'apps.uploads.apps.UploadsConfig',
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

ROOT_URLCONF = 'config.urls'

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

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database Configuration with Postgres -> SQLite Fallback
DATABASE_URL = os.environ.get('DATABASE_URL', '')
SQLITE_FALLBACK = os.environ.get('SQLITE_FALLBACK', 'True') == 'True'

def get_database_config():
    sqlite_config = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'support.db',
        }
    }

    if not DATABASE_URL or DATABASE_URL.startswith('sqlite'):
        return sqlite_config

    try:
        import urllib.parse
        url = urllib.parse.urlparse(DATABASE_URL)
        if url.scheme in ('postgres', 'postgresql'):
            import psycopg2
            conn = psycopg2.connect(
                dbname=url.path[1:],
                user=url.username,
                password=url.password,
                host=url.hostname or 'localhost',
                port=url.port or 5432,
                connect_timeout=2
            )
            conn.close()
            return {
                'default': {
                    'ENGINE': 'django.db.backends.postgresql',
                    'NAME': url.path[1:],
                    'USER': url.username,
                    'PASSWORD': url.password,
                    'HOST': url.hostname or 'localhost',
                    'PORT': url.port or 5432,
                }
            }
    except Exception as e:
        if SQLITE_FALLBACK:
            logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite database at {BASE_DIR / 'support.db'}")
            return sqlite_config
        raise e

    return sqlite_config

DATABASES = get_database_config()

# Channels Layer configuration (Redis for distributed / InMemory for single host)
REDIS_URL = os.environ.get('REDIS_URL')
if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = []

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media / Uploaded files
MEDIA_URL = '/uploads/'
MEDIA_ROOT = BASE_DIR / 'uploads'
os.makedirs(MEDIA_ROOT, exist_ok=True)

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Headers
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-user-role',
    'x-user-name',
    'x-user-company',
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S.%fZ',
}
