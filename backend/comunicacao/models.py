from django.db import models

from accounts.models import Aluno, User
from turmas.models import Turma


class Aviso(models.Model):
    """Substitui o JSON misto de `Anotacao.texto` da v1 (que guardava aviso
    e anotação no mesmo campo). Um aviso é individual (destinatario_aluno)
    ou por turma (destinatario_turma) — nunca os dois."""

    autor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="avisos_enviados")
    titulo = models.CharField(max_length=200)
    mensagem = models.TextField()
    destinatario_aluno = models.ForeignKey(
        Aluno, on_delete=models.CASCADE, null=True, blank=True, related_name="avisos_recebidos"
    )
    destinatario_turma = models.ForeignKey(
        Turma, on_delete=models.CASCADE, null=True, blank=True, related_name="avisos"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(destinatario_aluno__isnull=False, destinatario_turma__isnull=True)
                    | models.Q(destinatario_aluno__isnull=True, destinatario_turma__isnull=False)
                ),
                name="aviso_destinatario_unico",
            )
        ]

    def __str__(self):
        return self.titulo


class Anotacao(models.Model):
    """Uma anotação por linha (a v1 acumulava várias num único JSON por
    aluno, indexado por data — aqui cada uma já tem seu `created_at`)."""

    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, related_name="anotacoes")
    autor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="anotacoes_feitas")
    texto = models.TextField()
    resposta = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Anotação de {self.aluno} em {self.created_at:%d/%m/%Y}"


class Atividade(models.Model):
    """Mantido como JSON por ora: a estrutura de `dados.tarefas` da v1
    nunca teve um schema documentado. Revisar/normalizar quando os
    requisitos reais do módulo de atividades forem levantados com o
    usuário — não travar a migração nisso agora."""

    aluno = models.OneToOneField(Aluno, on_delete=models.CASCADE, related_name="atividades")
    dados = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Atividades de {self.aluno}"
