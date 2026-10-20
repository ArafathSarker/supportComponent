import os
import uuid
from django.conf import settings
from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from apps.tickets.models import Ticket, TicketAttachment


class FileUploadView(APIView):
    """
    POST /api/upload
    Handles multipart evidence and document uploads (images, PDFs, logs, videos).
    If ticket_id is provided, links the upload to the ticket as a TicketAttachment.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided in form-data."}, status=status.HTTP_400_BAD_REQUEST)

        # Sanitize and assign unique safe name
        ext = os.path.splitext(file_obj.name)[1]
        raw_name = os.path.splitext(file_obj.name)[0]
        safe_name = f"{uuid.uuid4().hex[:12]}_{raw_name[:30]}{ext}"

        media_dir = str(settings.MEDIA_ROOT)
        os.makedirs(media_dir, exist_ok=True)
        dest_path = os.path.join(media_dir, safe_name)

        with open(dest_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        file_url = f"/uploads/{safe_name}"
        file_type = file_obj.content_type or 'application/octet-stream'

        attachment_id = None
        ticket_id = request.data.get('ticket_id') or request.query_params.get('ticket_id')
        uploaded_by = (
            request.data.get('uploaded_by') or
            request.headers.get('x-user-name') or
            request.query_params.get('uploaded_by') or
            'User'
        )

        if ticket_id:
            ticket = Ticket.objects.filter(Q(id=ticket_id) | Q(ticket_code=ticket_id)).first()
            if ticket:
                attachment = TicketAttachment.objects.create(
                    ticket=ticket,
                    file_name=file_obj.name,
                    file_path=file_url,
                    file_type=file_type,
                    file_size=file_obj.size,
                    uploaded_by=uploaded_by
                )
                attachment_id = attachment.id

        return Response({
            "url": file_url,
            "filename": file_obj.name,
            "file_name": file_obj.name,
            "file_path": file_url,
            "file_type": file_type,
            "file_size": file_obj.size,
            "attachment_id": attachment_id,
            "ticket_id": ticket_id
        }, status=status.HTTP_200_OK)
