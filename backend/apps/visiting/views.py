from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .services import VisitingReportService
from .serializers import (
    VisitingReportSerializer,
    VisitingReportCreateSerializer,
    VisitingReportAcknowledgeSerializer,
    VisitingReportCompleteSerializer,
)


class VisitingReportListCreateView(APIView):
    """
    GET /api/visiting - List scheduled and completed visit reports
    POST /api/visiting - Schedule a field visit (Solution Provider only)
    """
    def get(self, request):
        role = request.query_params.get('role')
        company_name = request.query_params.get('company_name')
        queryset = VisitingReportService.list_reports(role=role, company_name=company_name)
        serializer = VisitingReportSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = VisitingReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = request.headers.get('x-user-role') or request.query_params.get('role') or 'super_admin'
        user_name = request.headers.get('x-user-name') or request.query_params.get('user_name') or 'Lead Field Engineer'

        report = VisitingReportService.create_report(
            data=serializer.validated_data,
            user_name=user_name,
            user_role=user_role
        )
        return Response(VisitingReportSerializer(report).data, status=status.HTTP_201_CREATED)


class VisitingReportAcknowledgeView(APIView):
    """
    POST /api/visiting/<visit_id>/acknowledge
    Company Admin acknowledges scheduled visit and supplies site requirements.
    """
    def post(self, request, visit_id):
        report = VisitingReportService.get_report(visit_id)
        serializer = VisitingReportAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = request.headers.get('x-user-role') or request.query_params.get('role') or 'company_admin'
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
            user_role=user_role
        )
        return Response(VisitingReportSerializer(updated_report).data, status=status.HTTP_200_OK)


class VisitingReportCompleteView(APIView):
    """
    POST /api/visiting/<visit_id>/complete
    Field Engineer (super_admin) marks report complete with summary.
    """
    def post(self, request, visit_id):
        report = VisitingReportService.get_report(visit_id)
        serializer = VisitingReportCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = request.headers.get('x-user-role') or request.query_params.get('role') or 'super_admin'
        user_name = request.headers.get('x-user-name') or 'Field Engineer'
        summary = serializer.validated_data['service_summary']

        completed_report = VisitingReportService.complete_report(
            report=report,
            service_summary=summary,
            user_name=user_name,
            user_role=user_role
        )
        return Response(VisitingReportSerializer(completed_report).data, status=status.HTTP_200_OK)
