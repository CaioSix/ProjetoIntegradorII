from django.db import models

from accounts.models import Aluno
from turmas.models import Materia, Turma


class Matricula(models.Model):

    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, related_name="matriculas")
    turma = models.ForeignKey(Turma, on_delete=models.PROTECT, related_name="matriculas")
    ano_letivo = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("aluno", "ano_letivo")
        ordering = ["-ano_letivo"]

    def __str__(self):
        return f"{self.aluno} - {self.turma} ({self.ano_letivo})"


class Nota(models.Model):
    matricula = models.ForeignKey(Matricula, on_delete=models.CASCADE, related_name="notas")
    materia = models.CharField(max_length=30, choices=Materia.choices)
    b1 = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    b2 = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    b3 = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    b4 = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("matricula", "materia")

    def __str__(self):
        return f"Notas de {self.matricula.aluno} - {self.get_materia_display()}"


class Falta(models.Model):
    matricula = models.ForeignKey(Matricula, on_delete=models.CASCADE, related_name="faltas")
    materia = models.CharField(max_length=30, choices=Materia.choices)
    b1 = models.PositiveSmallIntegerField(default=0)
    b2 = models.PositiveSmallIntegerField(default=0)
    b3 = models.PositiveSmallIntegerField(default=0)
    b4 = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("matricula", "materia")

    def __str__(self):
        return f"Faltas de {self.matricula.aluno} - {self.get_materia_display()}"
