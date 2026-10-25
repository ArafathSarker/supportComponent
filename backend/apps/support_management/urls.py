from django.urls import path

from .views import (
    SupportEmployeeListCreateView,
    SupportEmployeeDetailView,
    ChecklistOptionListCreateView,
    ChecklistOptionDetailView,
)

urlpatterns = [
    path('employees', SupportEmployeeListCreateView.as_view(), name='support-employees'),
    path('employees/', SupportEmployeeListCreateView.as_view(), name='support-employees-slash'),
    path('employees/<str:employee_id>', SupportEmployeeDetailView.as_view(), name='support-employee-detail'),
    path('employees/<str:employee_id>/', SupportEmployeeDetailView.as_view(), name='support-employee-detail-slash'),
    path('checklist-options', ChecklistOptionListCreateView.as_view(), name='support-checklist-options'),
    path('checklist-options/', ChecklistOptionListCreateView.as_view(), name='support-checklist-options-slash'),
    path('checklist-options/<str:option_id>', ChecklistOptionDetailView.as_view(), name='support-checklist-option-detail'),
    path('checklist-options/<str:option_id>/', ChecklistOptionDetailView.as_view(), name='support-checklist-option-detail-slash'),
]
