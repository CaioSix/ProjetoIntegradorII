from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .permissions import PodeEditarAnotacao, PodeGerenciarComunicacao
from .serializers import AnotacaoSerializer, AvisoSerializer
from .services import alunos_visiveis, anotacoes_visiveis, avisos_visiveis


class AvisoViewSet(viewsets.ModelViewSet):
    serializer_class = AvisoSerializer
    permission_classes = [IsAuthenticated, PodeGerenciarComunicacao]

    def get_queryset(self):
        return avisos_visiveis(self.request.user).select_related(
            "autor", "destinatario_aluno__user", "destinatario_turma"
        )

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)


class AnotacaoViewSet(viewsets.ModelViewSet):
    serializer_class = AnotacaoSerializer
    permission_classes = [IsAuthenticated, PodeEditarAnotacao]

    def get_queryset(self):
        return anotacoes_visiveis(self.request.user).select_related("aluno__user", "autor")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["alunos_permitidos"] = alunos_visiveis(self.request.user)
        return context

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)
