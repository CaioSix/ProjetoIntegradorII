from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated

from .models import Role
from .serializers import ResponsavelMeSerializer, UserMeSerializer


class MeView(RetrieveAPIView):
    serializer_class = UserMeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ResponsavelMeView(RetrieveUpdateAPIView):
    serializer_class = ResponsavelMeSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get_object(self):
        if self.request.user.role != Role.RESPONSAVEL:
            raise PermissionDenied("Este recurso é exclusivo para responsáveis.")
        return self.request.user.responsavel
