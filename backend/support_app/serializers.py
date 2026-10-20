from rest_framework import serializers
from .models import Ticket, TicketMessage, TicketAttachment, VisitingReport

class AttachmentSerializer(serializers.ModelSerializer):
    ticket_id = serializers.CharField(source='ticket.id', read_only=True)

    class Meta:
        model = TicketAttachment
        fields = [
            'id',
            'ticket_id',
            'file_name',
            'file_path',
            'file_type',
            'file_size',
            'uploaded_by',
            'created_at',
        ]


class MessageSerializer(serializers.ModelSerializer):
    ticket_id = serializers.CharField(source='ticket.id', read_only=True)

    class Meta:
        model = TicketMessage
        fields = [
            'id',
            'ticket_id',
            'sender_name',
            'sender_role',
            'message',
            'attachment_url',
            'attachment_name',
            'is_system_event',
            'created_at',
        ]


class TicketListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id',
            'ticket_code',
            'title',
            'affected_system',
            'category',
            'urgency',
            'description',
            'status',
            'company_name',
            'created_by_name',
            'created_by_role',
            'closed_at',
            'closed_by',
            'created_at',
            'updated_at',
            'message_count',
            'latest_message',
        ]

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_latest_message(self, obj):
        latest = obj.messages.order_by('-created_at').first()
        return latest.message if latest else None


class TicketDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id',
            'ticket_code',
            'title',
            'affected_system',
            'category',
            'urgency',
            'description',
            'status',
            'company_name',
            'created_by_name',
            'created_by_role',
            'closed_at',
            'closed_by',
            'created_at',
            'updated_at',
            'messages',
            'attachments',
            'message_count',
            'latest_message',
        ]

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_latest_message(self, obj):
        latest = obj.messages.order_by('-created_at').first()
        return latest.message if latest else None


class VisitingReportSerializer(serializers.ModelSerializer):
    ticket_id = serializers.CharField(source='ticket.id', read_only=True, allow_null=True)

    class Meta:
        model = VisitingReport
        fields = [
            'id',
            'visit_code',
            'ticket_id',
            'company_name',
            'target_system',
            'visiting_engineers',
            'purpose',
            'scheduled_date',
            'estimated_duration',
            'entry_requirements',
            'status',
            'super_admin_notes',
            'company_acknowledgement_notes',
            'acknowledged_at',
            'acknowledged_by',
            'completed_at',
            'service_summary',
            'created_at',
            'updated_at',
        ]
