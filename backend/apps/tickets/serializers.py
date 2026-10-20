from rest_framework import serializers
from .models import Ticket, TicketAttachment
from apps.chat.serializers import MessageSerializer


class AttachmentSerializer(serializers.ModelSerializer):
    """
    Serializer for files attached to tickets.
    """
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
        read_only_fields = ['id', 'created_at']


class TicketListSerializer(serializers.ModelSerializer):
    """
    Compact ticket serializer for lists, tables, and cards with IoT fields.
    """
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
            'priority',
            'production_impact',
            'line_number',
            'floor_location',
            'machine_id',
            'iot_details',
            'troubleshooting_checklist',
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
    """
    Detailed ticket serializer including full chat messages, attachments and IoT telemetry.
    """
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
            'priority',
            'production_impact',
            'line_number',
            'floor_location',
            'machine_id',
            'iot_details',
            'troubleshooting_checklist',
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


class TicketCreateSerializer(serializers.Serializer):
    """
    Validation schema for creating a new support ticket with IoT metadata.
    """
    title = serializers.CharField(max_length=255)
    affected_system = serializers.CharField(max_length=100, default="General System", required=False)
    category = serializers.CharField(max_length=100)
    urgency = serializers.CharField(max_length=30, default="Medium", required=False)
    priority = serializers.CharField(max_length=30, default="Medium", required=False)
    production_impact = serializers.CharField(max_length=100, default="No Production Loss", required=False, allow_blank=True)
    line_number = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    floor_location = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    machine_id = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    iot_details = serializers.DictField(required=False, default=dict)
    troubleshooting_checklist = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    description = serializers.CharField()
    company_name = serializers.CharField(max_length=150, default="CSI Smart Tech Ltd", required=False)
    created_by_name = serializers.CharField(max_length=100, default="Arafath", required=False)
    created_by_role = serializers.CharField(max_length=50, default="company_admin", required=False)
    attachments = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )


class TicketUpdateSerializer(serializers.Serializer):
    """
    Validation schema for editing ticket details by Company Admin.
    """
    title = serializers.CharField(max_length=255, required=False)
    affected_system = serializers.CharField(max_length=100, required=False)
    category = serializers.CharField(max_length=100, required=False)
    urgency = serializers.CharField(max_length=30, required=False)
    priority = serializers.CharField(max_length=30, required=False)
    production_impact = serializers.CharField(max_length=100, required=False, allow_blank=True)
    line_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    floor_location = serializers.CharField(max_length=100, required=False, allow_blank=True)
    machine_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    iot_details = serializers.DictField(required=False)
    troubleshooting_checklist = serializers.ListField(child=serializers.CharField(), required=False)
    description = serializers.CharField(required=False)
