from rest_framework import serializers

from .models import Falta, Matricula, Nota


class NotaFaltaSerializer(serializers.ModelSerializer):
    def validate_matricula(self, value):
        permitidas = self.context.get("matriculas_permitidas")
        if permitidas is not None and not permitidas.filter(pk=value.pk).exists():
            raise serializers.ValidationError("Matrícula fora do seu escopo de acesso.")
        return value

    def validate_materia(self, value):
        professor_materia = self.context.get("professor_materia")
        if professor_materia is not None and value != professor_materia:
            raise serializers.ValidationError("Você só pode lançar registros da sua própria matéria.")
        return value


class NotaSerializer(NotaFaltaSerializer):
    materia_nome = serializers.CharField(source="get_materia_display", read_only=True)

    class Meta:
        model = Nota
        fields = ["id", "matricula", "materia", "materia_nome", "b1", "b2", "b3", "b4"]


class FaltaSerializer(NotaFaltaSerializer):
    materia_nome = serializers.CharField(source="get_materia_display", read_only=True)

    class Meta:
        model = Falta
        fields = ["id", "matricula", "materia", "materia_nome", "b1", "b2", "b3", "b4"]


class NotaNestedSerializer(serializers.ModelSerializer):
    materia_nome = serializers.CharField(source="get_materia_display", read_only=True)

    class Meta:
        model = Nota
        fields = ["materia", "materia_nome", "b1", "b2", "b3", "b4"]


class FaltaNestedSerializer(serializers.ModelSerializer):
    materia_nome = serializers.CharField(source="get_materia_display", read_only=True)

    class Meta:
        model = Falta
        fields = ["materia", "materia_nome", "b1", "b2", "b3", "b4"]


class MatriculaSerializer(serializers.ModelSerializer):
    aluno_nome = serializers.CharField(source="aluno.user.nome", read_only=True)
    aluno_ra = serializers.CharField(source="aluno.ra", read_only=True)
    turma_nome = serializers.CharField(source="turma.nome", read_only=True)
    notas = NotaNestedSerializer(many=True, read_only=True)
    faltas = FaltaNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Matricula
        fields = ["id", "aluno", "aluno_nome", "aluno_ra", "turma", "turma_nome", "ano_letivo", "notas", "faltas"]
