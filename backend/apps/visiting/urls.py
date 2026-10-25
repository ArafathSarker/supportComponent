from django.urls import path
from .views import (
    VisitingReportListCreateView,
    VisitingReportDetailView,
    VisitingReportAcknowledgeView,
    VisitingReportCompleteView,
)

urlpatterns = [
    path('', VisitingReportListCreateView.as_view(), name='visiting-list-create'),
    path('<str:visit_id>', VisitingReportDetailView.as_view(), name='visiting-detail'),
    path('<str:visit_id>/', VisitingReportDetailView.as_view(), name='visiting-detail-slash'),
    path('<str:visit_id>/acknowledge', VisitingReportAcknowledgeView.as_view(), name='visiting-acknowledge'),
    path('<str:visit_id>/acknowledge/', VisitingReportAcknowledgeView.as_view(), name='visiting-acknowledge-slash'),
    path('<str:visit_id>/complete', VisitingReportCompleteView.as_view(), name='visiting-complete'),
    path('<str:visit_id>/complete/', VisitingReportCompleteView.as_view(), name='visiting-complete-slash'),
]
