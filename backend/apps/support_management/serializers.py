from rest_framework import serializers

from .models import SupportEmployee, ChecklistOption


class SupportEmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportEmployee
        fields = [
            'id',
            'name',
            'phone',
            'designation',
            'department',
            'is_lead_engineer',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_phone(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Phone number is required.')
        return value

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Employee name is required.')
        return value


class ChecklistOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistOption
        fields = [
            'id',
            'label',
            'category',
            'sort_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_label(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Option label is required.')
        return value
