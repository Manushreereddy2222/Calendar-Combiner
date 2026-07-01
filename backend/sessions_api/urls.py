from django.urls import path

from . import views

urlpatterns = [
    path("sessions/", views.create_session, name="create-session"),
    path("sessions/<str:slug>/", views.get_session, name="get-session"),
    path("sessions/<str:slug>/join/", views.join_session, name="join-session"),
]
