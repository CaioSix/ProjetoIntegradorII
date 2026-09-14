from django.contrib import admin

from .models import Falta, Matricula, Nota


@admin.register(Matricula)
class MatriculaAdmin(admin.ModelAdmin):
    list_display = ["aluno", "turma", "ano_letivo"]
    list_filter = ["ano_letivo", "turma"]


@admin.register(Nota)
class NotaAdmin(admin.ModelAdmin):
    list_display = ["matricula", "materia", "b1", "b2", "b3", "b4"]
    list_filter = ["materia"]


@admin.register(Falta)
class FaltaAdmin(admin.ModelAdmin):
    list_display = ["matricula", "materia", "b1", "b2", "b3", "b4"]
    list_filter = ["materia"]
