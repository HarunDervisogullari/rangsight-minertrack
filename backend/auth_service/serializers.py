from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'created_at']

    def create(self, validated_data):
        # Hash the password using bcrypt before saving
        import bcrypt
        password = validated_data.pop('password')
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        validated_data['password_hash'] = hashed.decode('utf-8')
        return User.objects.create(**validated_data)
