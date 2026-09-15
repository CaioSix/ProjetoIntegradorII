from rest_framework import serializers

from .models import User


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "nome", "role", "is_active"]
        read_only_fields = fields
