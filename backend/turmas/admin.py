from django.contrib import admin

from .models import Turma


@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = ["nome", "ano_letivo", "turno"]
    list_filter = ["ano_letivo", "turno"]
