import uuid
from django.utils import timezone


def generate_uuid() -> str:
    """Generate a clean UUID4 string."""
    return str(uuid.uuid4())


def generate_ticket_code(model_class=None) -> str:
    """
    Generate a human-readable unique ticket code: TCK-YYYY-NNNN.
    If model_class is provided, counts existing records to increment the sequence.
    """
    year = timezone.now().year
    count = model_class.objects.count() + 1 if model_class else 1
    return f"TCK-{year}-{count:04d}"


def generate_visit_code(model_class=None) -> str:
    """
    Generate a human-readable unique visit report code: VIS-YYYY-NNNN.
    If model_class is provided, counts existing records to increment the sequence.
    """
    year = timezone.now().year
    count = model_class.objects.count() + 1 if model_class else 1
    return f"VIS-{year}-{count:04d}"
