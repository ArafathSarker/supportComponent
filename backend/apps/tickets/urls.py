from django.urls import path
from apps.chat.views import TicketMessagesView
from .views import (
    TicketStatsView,
    TicketListCreateView,
    TicketDetailUpdateView,
    TicketStatusUpdateView,
    TicketCloseView,
    TicketReopenView,
)

urlpatterns = [
    path('stats', TicketStatsView.as_view(), name='ticket-stats'),
    path('stats/', TicketStatsView.as_view(), name='ticket-stats-slash'),
    path('', TicketListCreateView.as_view(), name='ticket-list-create'),
    path('<str:ticket_id>', TicketDetailUpdateView.as_view(), name='ticket-detail-update'),
    path('<str:ticket_id>/', TicketDetailUpdateView.as_view(), name='ticket-detail-update-slash'),
    path('<str:ticket_id>/status', TicketStatusUpdateView.as_view(), name='ticket-status-update'),
    path('<str:ticket_id>/status/', TicketStatusUpdateView.as_view(), name='ticket-status-update-slash'),
    path('<str:ticket_id>/close', TicketCloseView.as_view(), name='ticket-close'),
    path('<str:ticket_id>/close/', TicketCloseView.as_view(), name='ticket-close-slash'),
    path('<str:ticket_id>/reopen', TicketReopenView.as_view(), name='ticket-reopen'),
    path('<str:ticket_id>/reopen/', TicketReopenView.as_view(), name='ticket-reopen-slash'),
    path('<str:ticket_id>/messages', TicketMessagesView.as_view(), name='ticket-messages'),
    path('<str:ticket_id>/messages/', TicketMessagesView.as_view(), name='ticket-messages-slash'),
]
