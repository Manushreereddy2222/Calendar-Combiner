from rest_framework import serializers

from .models import Participant, Session


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ["id", "name", "email", "role", "availability", "joined_at", "updated_at"]
        read_only_fields = ["id", "joined_at", "updated_at"]


class SessionSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ["slug", "creator_name", "creator_email", "created_at", "participants"]
        read_only_fields = ["slug", "created_at", "participants"]


class SessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ["creator_name", "creator_email"]


class JoinSessionSerializer(serializers.Serializer):
    """Used for POST /sessions/<slug>/join/ — creates the participant if
    they're new, or updates their availability if they already exist
    (e.g. re-saving availability after editing it)."""
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(choices=["creator", "participant"], default="participant")
    availability = serializers.JSONField(required=False, default=dict)
