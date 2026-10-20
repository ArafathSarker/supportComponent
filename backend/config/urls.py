from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def health_check(request):
    db_engine = settings.DATABASES['default']['ENGINE'].split('.')[-1]
    return Response({
        "status": "online",
        "service": "Plug-and-Play Support Component API (Django DRF + Channels)",
        "architecture": "Domain-Driven Modular",
        "version": "2.0.0",
        "database": db_engine
    })


urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # Health check
    path('api/health', health_check, name='api-health'),
    path('api/health/', health_check, name='api-health-slash'),

    # Domain API routes
    path('api/tickets/', include('apps.tickets.urls')),
    path('api/visiting/', include('apps.visiting.urls')),
    path('api/upload', include('apps.uploads.urls')),
    path('api/upload/', include('apps.uploads.urls')),

    # Static media serving for attachments & evidence
    re_path(r'^uploads/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
