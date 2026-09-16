from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.models import Role

from .models import Falta, Nota
from .permissions import PodeEditarNotasFaltas
from .serializers import FaltaSerializer, MatriculaSerializer, NotaSerializer
from .services import matriculas_visiveis


class MatriculaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MatriculaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            matriculas_visiveis(self.request.user)
            .select_related("aluno__user", "turma")
            .prefetch_related("notas", "faltas")
        )


class NotaFaltaViewSetMixin:
    permission_classes = [IsAuthenticated, PodeEditarNotasFaltas]

    def get_queryset(self):
        user = self.request.user
        matriculas = matriculas_visiveis(user)
        queryset = self.queryset.filter(matricula__in=matriculas).select_related(
            "matricula__aluno__user", "matricula__turma"
        )
        if user.role == Role.PROFESSOR:
            queryset = queryset.filter(materia=user.professor.materia)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        context["matriculas_permitidas"] = matriculas_visiveis(user)
        if user.is_authenticated and user.role == Role.PROFESSOR:
            context["professor_materia"] = user.professor.materia
        return context


class NotaViewSet(NotaFaltaViewSetMixin, viewsets.ModelViewSet):
    queryset = Nota.objects.all()
    serializer_class = NotaSerializer


class FaltaViewSet(NotaFaltaViewSetMixin, viewsets.ModelViewSet):
    queryset = Falta.objects.all()
    serializer_class = FaltaSerializer
