from rest_framework import serializers

from .models import Falta, Matricula, Nota


class NotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nota
        fields = ["materia", "b1", "b2", "b3", "b4"]


class FaltaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Falta
        fields = ["materia", "b1", "b2", "b3", "b4"]


class MatriculaSerializer(serializers.ModelSerializer):
    aluno_nome = serializers.CharField(source="aluno.user.nome", read_only=True)
    turma_nome = serializers.CharField(source="turma.nome", read_only=True)
    notas = NotaSerializer(many=True, read_only=True)
    faltas = FaltaSerializer(many=True, read_only=True)

    class Meta:
        model = Matricula
        fields = ["id", "aluno", "aluno_nome", "turma", "turma_nome", "ano_letivo", "notas", "faltas"]
