from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .services import VisitingReportService
from .serializers import (
    VisitingReportSerializer,
    VisitingReportCreateSerializer,
    VisitingReportAcknowledgeSerializer,
    VisitingReportCompleteSerializer,
    VisitingReportUpdateSerializer,
)


def _request_role(request, default='super_admin') -> str:
    return request.headers.get('x-user-role') or request.query_params.get('role') or default


class VisitingReportListCreateView(APIView):
    """
    GET /api/visiting - List scheduled and completed visit reports
    POST /api/visiting - Schedule a field visit (Solution Provider only)
    """
    def get(self, request):
        filters = {
            'role': request.query_params.get('role'),
            'company_name': request.query_params.get('company_name'),
            'status': request.query_params.get('status'),
            'priority': request.query_params.get('priority'),
            'search': request.query_params.get('search'),
        }
        queryset = VisitingReportService.list_reports(filters=filters)
        role = _request_role(request)
        serializer = VisitingReportSerializer(queryset, many=True, context={'role': role})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = VisitingReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = _request_role(request)
        user_name = request.headers.get('x-user-name') or request.query_params.get('user_name') or 'Lead Field Engineer'

        report = VisitingReportService.create_report(
            data=serializer.validated_data,
            user_name=user_name,
            user_role=user_role
        )
        return Response(
            VisitingReportSerializer(report, context={'role': user_role}).data,
            status=status.HTTP_201_CREATED
        )


class VisitingReportDetailView(APIView):
    """
    PATCH /api/visiting/<visit_id>/
    Super Admin updates headcount visibility and the confidential visit reason.
    """
    def patch(self, request, visit_id):
        report = VisitingReportService.get_report(visit_id)
        serializer = VisitingReportUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = _request_role(request)
        updated_report = VisitingReportService.update_report(
            report=report,
            data=serializer.validated_data,
            user_role=user_role
        )
        return Response(
            VisitingReportSerializer(updated_report, context={'role': user_role}).data,
            status=status.HTTP_200_OK
        )


class VisitingReportAcknowledgeView(APIView):
    """
    POST /api/visiting/<visit_id>/acknowledge
    Company Admin acknowledges scheduled visit and supplies site requirements.
    """
    def post(self, request, visit_id):
        report = VisitingReportService.get_report(visit_id)
        serializer = VisitingReportAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = _request_role(request, default='company_admin')
        user_name = (
            request.headers.get('x-user-name') or
            serializer.validated_data.get('acknowledged_by') or
            'Arafath'
        )
        notes = serializer.validated_data.get('company_acknowledgement_notes', '')

        updated_report = VisitingReportService.acknowledge_report(
            report=report,
            notes=notes,
            user_name=user_name,
            user_role=user_role,
        )
        return Response(
            VisitingReportSerializer(updated_report, context={'role': user_role}).data,
            status=status.HTTP_200_OK
        )


class VisitingReportCompleteView(APIView):
    """
    POST /api/visiting/<visit_id>/complete
    Field Engineer (super_admin) marks the report complete with a summary and the
    audit of the company's pre-ticket checks (acknowledged or flagged).
    """
    def post(self, request, visit_id):
        report = VisitingReportService.get_report(visit_id)
        serializer = VisitingReportCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = _request_role(request)
        user_name = request.headers.get('x-user-name') or 'Field Engineer'
        summary = serializer.validated_data.get('service_summary', '')

        completed_report = VisitingReportService.complete_report(
            report=report,
            service_summary=summary,
            user_name=user_name,
            user_role=user_role,
            prechecklist_audit=serializer.validated_data.get('prechecklist_audit', []),
            is_flagged=serializer.validated_data.get('is_flagged', False),
            flag_reason=serializer.validated_data.get('flag_reason', ''),
        )
        return Response(
            VisitingReportSerializer(completed_report, context={'role': user_role}).data,
            status=status.HTTP_200_OK
        )
