from django.urls import path

from .views import MeView, ResponsavelMeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/responsavel/", ResponsavelMeView.as_view(), name="me-responsavel"),
]
