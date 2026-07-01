from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Participant, Session
from .serializers import (
    JoinSessionSerializer,
    ParticipantSerializer,
    SessionCreateSerializer,
    SessionSerializer,
)


@api_view(["POST"])
def create_session(request):
    """POST /api/sessions/
    Body: { "creator_name": "...", "creator_email": "..." } (both optional)
    Returns the new session, including its slug — this slug is what the
    frontend uses to build the shareable link and the ?join= param.
    """
    serializer = SessionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    session = serializer.save()
    return Response(SessionSerializer(session).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def get_session(request, slug):
    """GET /api/sessions/<slug>/
    Returns session details plus the full participant list (with each
    participant's availability). This is what both the join flow and
    results.html poll to get live data instead of reading localStorage.
    """
    session = get_object_or_404(Session, slug=slug)
    return Response(SessionSerializer(session).data)


@api_view(["POST"])
def join_session(request, slug):
    """POST /api/sessions/<slug>/join/
    Body: { "name": "...", "email": "...", "role": "creator"|"participant",
             "availability": { weekOffset: { dayIndex: [time labels] } } }

    Upserts by (session, name) — if this name already saved availability
    for this session before (e.g. they reopened the modal and re-saved),
    it updates rather than duplicating.
    """
    session = get_object_or_404(Session, slug=slug)
    serializer = JoinSessionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    participant, _created = Participant.objects.update_or_create(
        session=session,
        name=data["name"],
        defaults={
            "email": data.get("email", ""),
            "role": data.get("role", "participant"),
            "availability": data.get("availability", {}),
        },
    )
    return Response(ParticipantSerializer(participant).data, status=status.HTTP_200_OK)
