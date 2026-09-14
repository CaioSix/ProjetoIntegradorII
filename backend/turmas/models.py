from django.db import models


class Materia(models.TextChoices):
    """Lista fixa herdada de `MATERIAS_DISPONIVEIS` (v1 frontend/types.ts)."""

    PORTUGUES = "lingua_portuguesa", "Língua Portuguesa"
    MATEMATICA = "matematica", "Matemática"
    HISTORIA = "historia", "História"
    GEOGRAFIA = "geografia", "Geografia"
    CIENCIAS = "ciencias", "Ciências"
    INGLES = "lingua_inglesa", "Língua Inglesa"
    ARTE = "arte", "Arte"
    EDUCACAO_FISICA = "educacao_fisica", "Educação Física"


class Turma(models.Model):
    class Turno(models.TextChoices):
        MANHA = "Manhã", "Manhã"
        TARDE = "Tarde", "Tarde"
        NOITE = "Noite", "Noite"

    nome = models.CharField(max_length=10, help_text='Ex: "5-A", "9-D"')
    ano_letivo = models.PositiveSmallIntegerField()
    turno = models.CharField(max_length=10, choices=Turno.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("nome", "ano_letivo")
        ordering = ["ano_letivo", "nome"]

    def __str__(self):
        return f"{self.nome} ({self.ano_letivo})"
