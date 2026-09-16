from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import GESTOR_ROLES, Role


class PodeEditarNotasFaltas(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return user.is_authenticated and (user.role == Role.PROFESSOR or user.role in GESTOR_ROLES)
