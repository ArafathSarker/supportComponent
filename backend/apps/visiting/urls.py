from django.urls import path
from .views import (
    VisitingReportListCreateView,
    VisitingReportDetailView,
    VisitingReportAcknowledgeView,
    VisitingReportCompleteView,
    VisitingReportClientConfirmView,
)

urlpatterns = [
    path('', VisitingReportListCreateView.as_view(), name='visiting-list-create'),
    path('<str:visit_id>', VisitingReportDetailView.as_view(), name='visiting-detail'),
    path('<str:visit_id>/', VisitingReportDetailView.as_view(), name='visiting-detail-slash'),
    path('<str:visit_id>/acknowledge', VisitingReportAcknowledgeView.as_view(), name='visiting-acknowledge'),
    path('<str:visit_id>/acknowledge/', VisitingReportAcknowledgeView.as_view(), name='visiting-acknowledge-slash'),
    path('<str:visit_id>/complete', VisitingReportCompleteView.as_view(), name='visiting-complete'),
    path('<str:visit_id>/complete/', VisitingReportCompleteView.as_view(), name='visiting-complete-slash'),
    path('<str:visit_id>/confirm-resolution', VisitingReportClientConfirmView.as_view(), name='visiting-client-confirm'),
    path('<str:visit_id>/confirm-resolution/', VisitingReportClientConfirmView.as_view(), name='visiting-client-confirm-slash'),
]
