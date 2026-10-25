from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportEmployee, ChecklistOption, ProblemCategory
from .serializers import (
    SupportEmployeeSerializer,
    ChecklistOptionSerializer,
    ProblemCategorySerializer,
)


def _resolve_role(request) -> str:
    return request.headers.get('x-user-role') or request.query_params.get('role') or 'super_admin'


def _require_super_admin(request):
    """Support management is exclusively available to the Solution Provider."""
    if _resolve_role(request) != 'super_admin':
        raise PermissionDenied(
            'Only Super Admin (Solution Provider) can manage support employees and checklist options.'
        )


def _is_truthy(value) -> bool:
    return str(value).lower() in ('1', 'true', 'yes', 'on')


class SupportEmployeeListCreateView(APIView):
    """
    GET  /api/support/employees/  - Search the support employee directory
    POST /api/support/employees/  - Add a new support employee (Super Admin only)
    """
    def get(self, request):
        _require_super_admin(request)
        queryset = SupportEmployee.objects.all()

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(designation__icontains=search) |
                Q(department__icontains=search)
            )

        if _is_truthy(request.query_params.get('active_only')):
            queryset = queryset.filter(is_active=True)

        if _is_truthy(request.query_params.get('lead_only')):
            queryset = queryset.filter(is_lead_engineer=True)

        serializer = SupportEmployeeSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        _require_super_admin(request)
        serializer = SupportEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SupportEmployeeDetailView(APIView):
    """
    GET/PATCH/DELETE /api/support/employees/<employee_id>/
    """
    def _get_employee(self, employee_id):
        employee = SupportEmployee.objects.filter(id=employee_id).first()
        if not employee:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Support employee '{employee_id}' not found.")
        return employee

    def get(self, request, employee_id):
        _require_super_admin(request)
        employee = self._get_employee(employee_id)
        return Response(SupportEmployeeSerializer(employee).data)

    def patch(self, request, employee_id):
        _require_super_admin(request)
        employee = self._get_employee(employee_id)
        serializer = SupportEmployeeSerializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, employee_id):
        _require_super_admin(request)
        employee = self._get_employee(employee_id)
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChecklistOptionListCreateView(APIView):
    """
    GET  /api/support/checklist-options/ - List managed visit reasons
    POST /api/support/checklist-options/ - Add a new reason (Super Admin only)

    Visit reasons and confidential reasons are provider-only. The company reads
    the problem categories (and their pre-ticket checks) instead, because those
    must be verified before raising a ticket.
    """
    def get(self, request):
        _require_super_admin(request)
        kind = (request.query_params.get('kind') or '').strip()

        queryset = ChecklistOption.objects.all()

        if kind:
            queryset = queryset.filter(kind=kind)

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(label__icontains=search) | Q(category__icontains=search)
            )

        if _is_truthy(request.query_params.get('active_only')):
            queryset = queryset.filter(is_active=True)

        category = (request.query_params.get('category') or '').strip()
        if category:
            queryset = queryset.filter(category=category)

        serializer = ChecklistOptionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        _require_super_admin(request)
        serializer = ChecklistOptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChecklistOptionDetailView(APIView):
    """
    GET/PATCH/DELETE /api/support/checklist-options/<option_id>/
    """
    def _get_option(self, option_id):
        option = ChecklistOption.objects.filter(id=option_id).first()
        if not option:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Checklist option '{option_id}' not found.")
        return option

    def get(self, request, option_id):
        _require_super_admin(request)
        option = self._get_option(option_id)
        return Response(ChecklistOptionSerializer(option).data)

    def patch(self, request, option_id):
        _require_super_admin(request)
        option = self._get_option(option_id)
        serializer = ChecklistOptionSerializer(option, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, option_id):
        _require_super_admin(request)
        option = self._get_option(option_id)
        option.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProblemCategoryListCreateView(APIView):
    """
    GET  /api/support/problem-categories/ - List problem categories with their checklists
    POST /api/support/problem-categories/ - Add a problem category (Super Admin only)

    Categories and their checklists are read by the company while raising a
    ticket, but only the Solution Provider can maintain them.
    """
    def get(self, request):
        queryset = ProblemCategory.objects.all()

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        if _is_truthy(request.query_params.get('active_only')):
            queryset = queryset.filter(is_active=True)

        serializer = ProblemCategorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        _require_super_admin(request)
        serializer = ProblemCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProblemCategoryDetailView(APIView):
    """
    GET/PATCH/DELETE /api/support/problem-categories/<category_id>/
    """
    def _get_category(self, category_id):
        category = ProblemCategory.objects.filter(id=category_id).first()
        if not category:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Problem category '{category_id}' not found.")
        return category

    def get(self, request, category_id):
        category = self._get_category(category_id)
        return Response(ProblemCategorySerializer(category).data)

    def patch(self, request, category_id):
        _require_super_admin(request)
        category = self._get_category(category_id)
        serializer = ProblemCategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, category_id):
        _require_super_admin(request)
        category = self._get_category(category_id)
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
