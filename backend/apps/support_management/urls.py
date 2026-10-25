from django.urls import path

from .views import (
    SupportEmployeeListCreateView,
    SupportEmployeeDetailView,
    ChecklistOptionListCreateView,
    ChecklistOptionDetailView,
    ProblemCategoryListCreateView,
    ProblemCategoryDetailView,
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
    path('problem-categories', ProblemCategoryListCreateView.as_view(), name='support-problem-categories'),
    path('problem-categories/', ProblemCategoryListCreateView.as_view(), name='support-problem-categories-slash'),
    path('problem-categories/<str:category_id>', ProblemCategoryDetailView.as_view(), name='support-problem-category-detail'),
    path('problem-categories/<str:category_id>/', ProblemCategoryDetailView.as_view(), name='support-problem-category-detail-slash'),
]
