from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.models import GESTOR_ROLES, Role

from .models import Matricula
from .serializers import MatriculaSerializer


class MatriculaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MatriculaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Matricula.objects.select_related("aluno__user", "turma").prefetch_related("notas", "faltas")

        if user.role == Role.ALUNO:
            return queryset.filter(aluno__user=user)
        if user.role == Role.RESPONSAVEL:
            return queryset.filter(aluno__responsavel__user=user)
        if user.role in GESTOR_ROLES:
            return queryset

        return queryset.none()
