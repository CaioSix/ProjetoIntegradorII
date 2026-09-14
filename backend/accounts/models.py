from django.contrib.auth.models import AbstractUser
from django.db import models

from turmas.models import Materia, Turma

from .managers import UserManager


class Role(models.TextChoices):
    ADMIN = "admin", "Admin"
    DIRETOR = "diretor", "Diretor"
    VICE_DIRETOR = "vice_diretor", "Vice-diretor"
    SECRETARIA = "secretaria", "Secretaria"
    PROFESSOR = "professor", "Professor"
    RESPONSAVEL = "responsavel", "Responsável"
    ALUNO = "aluno", "Aluno"


class User(AbstractUser):
    """Equivalente à tabela `profiles` da v1 (Supabase). Login por e-mail.

    `is_active` (herdado de AbstractUser) assume o papel do antigo campo
    `ativo` — não duplicamos o campo.
    """

    username = None
    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome", "role"]

    objects = UserManager()

    def __str__(self):
        return f"{self.nome} ({self.get_role_display()})"


class Gestor(models.Model):
    """Diretor/vice-diretor/secretaria/admin. Especialização 1:1 de User."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name="gestor")
    departamento = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.user.nome


class Professor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name="professor")
    materia = models.CharField(
        max_length=30, choices=Materia.choices, blank=True, help_text="Disciplina principal lecionada"
    )
    formacao = models.CharField(max_length=200, blank=True)
    turmas = models.ManyToManyField(Turma, blank=True, related_name="professores")

    def __str__(self):
        return self.user.nome


class Responsavel(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name="responsavel")
    telefone = models.CharField(max_length=20, blank=True)
    cpf = models.CharField(max_length=14, blank=True)

    def __str__(self):
        return self.user.nome


class Aluno(models.Model):
    """`ra_aluno` como vínculo alternativo em `responsaveis` (v1) foi
    descartado aqui: o vínculo aluno<->responsável passa a existir só
    nesta FK, eliminando a duplicidade/inconsistência da v1."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name="aluno")
    ra = models.CharField(max_length=30, unique=True)
    data_nascimento = models.DateField(null=True, blank=True)
    turma = models.ForeignKey(Turma, on_delete=models.SET_NULL, null=True, blank=True, related_name="alunos")
    responsavel = models.ForeignKey(
        Responsavel, on_delete=models.SET_NULL, null=True, blank=True, related_name="alunos"
    )

    def __str__(self):
        return f"{self.user.nome} (RA {self.ra})"
