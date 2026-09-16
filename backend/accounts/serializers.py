from rest_framework import serializers

from .models import Responsavel, User


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "nome", "role", "is_active"]
        read_only_fields = fields


class ResponsavelMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Responsavel
        fields = ["telefone"]
