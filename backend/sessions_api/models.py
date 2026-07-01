import random
import string

from django.db import models


def generate_slug():
    """6-char alphanumeric slug, matching the format the frontend
    already generates client-side with Math.random().toString(36).substring(2, 8)."""
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=6))


class Session(models.Model):
    slug = models.CharField(max_length=12, unique=True, default=generate_slug, editable=False)
    creator_name = models.CharField(max_length=120, blank=True, default="")
    creator_email = models.EmailField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.slug


class Participant(models.Model):
    ROLE_CHOICES = [("creator", "Creator"), ("participant", "Participant")]

    session = models.ForeignKey(Session, related_name="participants", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    email = models.EmailField(blank=True, default="")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="participant")

    # Matches the frontend's `labeledBusy` shape exactly:
    # { "0": { "0": ["9:00 AM", "9:30 AM"], "1": [...] }, "1": {...} }
    # i.e. { weekOffset: { dayIndex: [time-label, ...] } }
    availability = models.JSONField(default=dict, blank=True)

    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("session", "name")

    def __str__(self):
        return f"{self.name} ({self.role}) in {self.session.slug}"
