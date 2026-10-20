from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .services import TicketService
from .serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    TicketCreateSerializer,
    TicketUpdateSerializer,
)


class TicketStatsView(APIView):
    """
    GET /api/tickets/stats
    Returns aggregate counts for tickets based on user role and company.
    """
    def get(self, request):
        company_name = request.query_params.get('company_name')
        role = request.query_params.get('role')
        stats = TicketService.get_stats(role=role, company_name=company_name)
        return Response(stats, status=status.HTTP_200_OK)


class TicketListCreateView(APIView):
    """
    GET /api/tickets/ - Filter and list tickets
    POST /api/tickets/ - Create a new support ticket (Client only)
    """
    def get(self, request):
        filters = {
            'role': request.query_params.get('role'),
            'company_name': request.query_params.get('company_name'),
            'status': request.query_params.get('status'),
            'urgency': request.query_params.get('urgency'),
            'category': request.query_params.get('category'),
            'search': request.query_params.get('search'),
        }
        queryset = TicketService.list_tickets(filters)
        serializer = TicketListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = (
            request.headers.get('x-user-role') or
            request.data.get('created_by_role') or
            request.query_params.get('role') or
            serializer.validated_data.get('created_by_role') or
            'company_admin'
        )
        user_name = (
            request.headers.get('x-user-name') or
            request.data.get('created_by_name') or
            request.query_params.get('user_name') or
            serializer.validated_data.get('created_by_name') or
            'Arafath'
        )
        user_company = (
            request.headers.get('x-user-company') or
            request.query_params.get('company_name') or
            serializer.validated_data.get('company_name')
        )

        ticket = TicketService.create_ticket(
            data=serializer.validated_data,
            user_name=user_name,
            user_role=user_role,
            user_company=user_company
        )
        return Response(TicketDetailSerializer(ticket).data, status=status.HTTP_201_CREATED)


class TicketDetailUpdateView(APIView):
    """
    GET /api/tickets/<id>/ - Retrieve ticket detail
    PATCH /api/tickets/<id>/ - Edit ticket details (Company Admin only)
    """
    def get(self, request, ticket_id):
        ticket = TicketService.get_ticket(ticket_id)
        return Response(TicketDetailSerializer(ticket).data, status=status.HTTP_200_OK)

    def patch(self, request, ticket_id):
        ticket = TicketService.get_ticket(ticket_id)
        serializer = TicketUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = (
            request.headers.get('x-user-role') or
            request.data.get('updated_by_role') or
            request.data.get('user_role') or
            request.query_params.get('role') or
            'company_admin'
        )
        user_name = (
            request.headers.get('x-user-name') or
            request.data.get('updated_by_name') or
            request.data.get('user_name') or
            request.query_params.get('user_name') or
            'Arafath'
        )
        user_company = (
            request.headers.get('x-user-company') or
            request.data.get('company_name') or
            request.query_params.get('company_name')
        )

        updated_ticket = TicketService.update_ticket(
            ticket=ticket,
            data=serializer.validated_data,
            user_name=user_name,
            user_role=user_role,
            user_company=user_company
        )
        return Response(TicketDetailSerializer(updated_ticket).data, status=status.HTTP_200_OK)


class TicketStatusUpdateView(APIView):
    """
    PATCH /api/tickets/<id>/status
    Update the ticket lifecycle status.
    """
    def patch(self, request, ticket_id):
        ticket = TicketService.get_ticket(ticket_id)
        new_status = request.data.get('status')
        if not new_status:
            return Response({"error": "status field is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_role = (
            request.headers.get('x-user-role') or
            request.data.get('updated_by_role') or
            request.data.get('role') or
            'super_admin'
        )
        user_name = (
            request.headers.get('x-user-name') or
            request.data.get('updated_by_name') or
            request.data.get('user_name') or
            'Support Agent'
        )
        notes = request.data.get('notes') or request.data.get('comment')

        updated_ticket = TicketService.update_status(
            ticket=ticket,
            new_status=new_status,
            user_name=user_name,
            user_role=user_role,
            notes=notes
        )
        return Response(TicketDetailSerializer(updated_ticket).data, status=status.HTTP_200_OK)


class TicketCloseView(APIView):
    """
    POST /api/tickets/<id>/close
    """
    def post(self, request, ticket_id):
        ticket = TicketService.get_ticket(ticket_id)
        user_role = (
            request.headers.get('x-user-role') or
            request.data.get('closed_by_role') or
            request.data.get('role') or
            'company_admin'
        )
        user_name = (
            request.headers.get('x-user-name') or
            request.data.get('closed_by_name') or
            request.data.get('user_name') or
            'Client'
        )
        notes = (
            request.data.get('resolution_notes') or
            request.data.get('close_notes') or
            request.data.get('notes')
        )

        closed_ticket = TicketService.close_ticket(
            ticket=ticket,
            user_name=user_name,
            user_role=user_role,
            notes=notes
        )
        return Response(TicketDetailSerializer(closed_ticket).data, status=status.HTTP_200_OK)


class TicketReopenView(APIView):
    """
    POST /api/tickets/<id>/reopen
    """
    def post(self, request, ticket_id):
        ticket = TicketService.get_ticket(ticket_id)
        user_role = (
            request.headers.get('x-user-role') or
            request.data.get('user_role') or
            request.data.get('role') or
            'company_admin'
        )
        user_name = (
            request.headers.get('x-user-name') or
            request.data.get('user_name') or
            'Client'
        )
        reason = request.data.get('reason')

        reopened_ticket = TicketService.reopen_ticket(
            ticket=ticket,
            user_name=user_name,
            user_role=user_role,
            reason=reason
        )
        return Response(TicketDetailSerializer(reopened_ticket).data, status=status.HTTP_200_OK)
