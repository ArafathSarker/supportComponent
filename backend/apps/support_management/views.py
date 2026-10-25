from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportEmployee, ChecklistOption
from .serializers import SupportEmployeeSerializer, ChecklistOptionSerializer


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
    GET  /api/support/checklist-options/ - List dynamic dropdown options
    POST /api/support/checklist-options/ - Add a new option (Super Admin only)
    """
    def get(self, request):
        _require_super_admin(request)
        queryset = ChecklistOption.objects.all()

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
