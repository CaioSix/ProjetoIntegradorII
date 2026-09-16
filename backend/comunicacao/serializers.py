from rest_framework import serializers

from accounts.models import Role

from .models import Anotacao, Aviso


class AvisoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aviso
        fields = ["id", "autor", "titulo", "mensagem", "destinatario_aluno", "destinatario_turma", "created_at"]
        read_only_fields = ["autor", "created_at"]

    def validate(self, attrs):
        aluno = attrs.get("destinatario_aluno", getattr(self.instance, "destinatario_aluno", None))
        turma = attrs.get("destinatario_turma", getattr(self.instance, "destinatario_turma", None))

        if bool(aluno) == bool(turma):
            raise serializers.ValidationError(
                "Informe destinatario_aluno ou destinatario_turma, nunca os dois nem nenhum."
            )

        user = self.context["request"].user
        if user.role == Role.PROFESSOR:
            turmas_permitidas = user.professor.turmas.all()
            if aluno and aluno.turma_id not in turmas_permitidas.values_list("id", flat=True):
                raise serializers.ValidationError("Aluno fora das suas turmas.")
            if turma and turma not in turmas_permitidas:
                raise serializers.ValidationError("Turma fora do seu escopo.")

        return attrs


class AnotacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Anotacao
        fields = ["id", "aluno", "autor", "texto", "resposta", "created_at"]
        read_only_fields = ["autor", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == Role.RESPONSAVEL:
            self.fields["aluno"].read_only = True
            self.fields["texto"].read_only = True

    def validate_aluno(self, value):
        alunos_permitidos = self.context.get("alunos_permitidos")
        if alunos_permitidos is not None and not alunos_permitidos.filter(pk=value.pk).exists():
            raise serializers.ValidationError("Aluno fora do seu escopo de acesso.")
        return value
