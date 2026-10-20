from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/notifications/?$', consumers.NotificationConsumer.as_asgi()),
    re_path(r'^ws/tickets/(?P<ticket_id>[^/]+)/?$', consumers.TicketChatConsumer.as_asgi()),
]
