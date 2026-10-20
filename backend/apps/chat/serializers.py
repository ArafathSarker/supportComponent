from rest_framework import serializers
from .models import TicketMessage


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for ticket chat messages and system events.
    """
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
        read_only_fields = ['id', 'created_at']


class MessageCreateSerializer(serializers.Serializer):
    """
    Validation schema for creating a chat message.
    """
    sender_name = serializers.CharField(max_length=100, required=False, default="Arafath")
    sender_role = serializers.CharField(max_length=50, required=False, default="company_admin")
    message = serializers.CharField(allow_blank=True, required=False, default="")
    attachment_url = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)
    attachment_name = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
