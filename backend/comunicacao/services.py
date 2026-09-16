from django.db.models import Q

from accounts.models import GESTOR_ROLES, Aluno, Role

from .models import Anotacao, Aviso


def alunos_visiveis(user):
    if not user.is_authenticated:
        return Aluno.objects.none()
    if user.role == Role.ALUNO:
        return Aluno.objects.filter(user=user)
    if user.role == Role.RESPONSAVEL:
        return Aluno.objects.filter(responsavel__user=user)
    if user.role == Role.PROFESSOR:
        return Aluno.objects.filter(turma__in=user.professor.turmas.all())
    if user.role in GESTOR_ROLES:
        return Aluno.objects.all()
    return Aluno.objects.none()


def avisos_visiveis(user):
    if not user.is_authenticated:
        return Aviso.objects.none()
    if user.role in GESTOR_ROLES:
        return Aviso.objects.all()
    if user.role == Role.PROFESSOR:
        return Aviso.objects.filter(destinatario_turma__in=user.professor.turmas.all())

    alunos = alunos_visiveis(user)
    turmas = alunos.exclude(turma__isnull=True).values_list("turma", flat=True)
    return Aviso.objects.filter(Q(destinatario_aluno__in=alunos) | Q(destinatario_turma__in=turmas))


def anotacoes_visiveis(user):
    if not user.is_authenticated:
        return Anotacao.objects.none()
    if user.role in GESTOR_ROLES:
        return Anotacao.objects.all()
    if user.role == Role.PROFESSOR:
        return Anotacao.objects.filter(aluno__turma__in=user.professor.turmas.all())
    return Anotacao.objects.filter(aluno__in=alunos_visiveis(user))
