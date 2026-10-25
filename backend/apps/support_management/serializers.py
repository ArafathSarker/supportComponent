from rest_framework import serializers

from .models import SupportEmployee, ChecklistOption, ProblemCategory


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
            'kind',
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


class ProblemCategorySerializer(serializers.ModelSerializer):
    """A problem category together with its dynamic pre-ticket checklist."""

    class Meta:
        model = ProblemCategory
        fields = [
            'id',
            'name',
            'description',
            'checklist',
            'sort_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Problem category name is required.')
        return value

    def validate_checklist(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Checklist must be a list of check items.')

        cleaned = []
        for item in value:
            if isinstance(item, dict):
                item = item.get('label') or item.get('task')
            if not isinstance(item, str):
                raise serializers.ValidationError('Every check item must be text.')
            item = item.strip()
            if item and item not in cleaned:
                cleaned.append(item)
        return cleaned
