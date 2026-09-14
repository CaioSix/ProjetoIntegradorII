from django.contrib import admin

from .models import Anotacao, Atividade, Aviso


@admin.register(Aviso)
class AvisoAdmin(admin.ModelAdmin):
    list_display = ["titulo", "autor", "destinatario_aluno", "destinatario_turma", "created_at"]
    list_filter = ["created_at"]


@admin.register(Anotacao)
class AnotacaoAdmin(admin.ModelAdmin):
    list_display = ["aluno", "autor", "created_at"]
    list_filter = ["created_at"]


@admin.register(Atividade)
class AtividadeAdmin(admin.ModelAdmin):
    list_display = ["aluno", "updated_at"]
