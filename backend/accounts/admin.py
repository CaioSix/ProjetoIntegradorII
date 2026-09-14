from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Aluno, Gestor, Professor, Responsavel, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    ordering = ["email"]
    list_display = ["email", "nome", "role", "is_active", "is_staff"]
    search_fields = ["email", "nome"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Dados pessoais", {"fields": ("nome", "role")}),
        (
            "Permissões",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Datas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "nome", "role", "password1", "password2"),
            },
        ),
    )


@admin.register(Gestor)
class GestorAdmin(admin.ModelAdmin):
    list_display = ["user", "departamento"]


@admin.register(Professor)
class ProfessorAdmin(admin.ModelAdmin):
    list_display = ["user", "materia", "formacao"]
    filter_horizontal = ["turmas"]


@admin.register(Responsavel)
class ResponsavelAdmin(admin.ModelAdmin):
    list_display = ["user", "telefone", "cpf"]


@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ["user", "ra", "turma", "responsavel"]
    search_fields = ["ra", "user__nome"]
