from accounts.models import GESTOR_ROLES, Role

from .models import Matricula


def matriculas_visiveis(user):
    if not user.is_authenticated:
        return Matricula.objects.none()
    if user.role == Role.ALUNO:
        return Matricula.objects.filter(aluno__user=user)
    if user.role == Role.RESPONSAVEL:
        return Matricula.objects.filter(aluno__responsavel__user=user)
    if user.role == Role.PROFESSOR:
        return Matricula.objects.filter(turma__in=user.professor.turmas.all())
    if user.role in GESTOR_ROLES:
        return Matricula.objects.all()
    return Matricula.objects.none()
