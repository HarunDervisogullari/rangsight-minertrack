from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .serializers import UserSerializer
from .models import User, Person, UserPerson
from .utils import generate_jwt
import bcrypt
import jwt


@api_view(['POST'])
def signup(request):
    """
    Expected JSON payload:
    {
      "username": "johndoe",
      "email": "john@example.com",
      "password": "secret",
      "role": "user",        # optional
      "name": "John",
      "surname": "Doe",
      "position": "Supervisor",
      "department": "Operations",
      "contact": "+1 555 555 5555"
    }
    """
    data = request.data.copy()
    print("Incoming data:", data)

    # Extract fields for User
    user_data = {
        "username": data.pop("username", None),
        "email": data.pop("email", None),
        "password": data.pop("password", None),
        "role": data.pop("role", "user"),
    }
    
    serializer = UserSerializer(data=user_data)
    if serializer.is_valid():
        user = serializer.save()
        # Optionally hash the password if not done by your serializer:
        # hashed = bcrypt.hashpw(user_data["password"].encode('utf-8'), bcrypt.gensalt())
        # user.password_hash = hashed.decode('utf-8')
        # user.save()

        # Extract Person fields
        name = data.get("name", "")
        surname = data.get("surname", "")
        position = data.get("position", "")
        department = data.get("department", "")
        contact = data.get("contact", "")

        person = Person.objects.create(
            name=name,
            surname=surname,
            position=position,
            department=department,
            contact=contact,
            status=None,
            location=None,
        )

        # Link User and Person using our custom save() method.
        up = UserPerson(user=user, person=person)
        up.save()

        token = generate_jwt(user)
        return Response(
            {"message": "User registered successfully", "token": token},
            status=status.HTTP_201_CREATED
        )
    else:
        print("Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def signin(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

    if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        token = generate_jwt(user)
        return Response({'token': token}, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def profile(request):
    auth_header = request.headers.get("Authorization")
    print("Authorization header:", auth_header)
    if not auth_header or not auth_header.startswith("Bearer "):
        return Response({"error": "Authorization header missing or malformed."}, status=status.HTTP_401_UNAUTHORIZED)
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        print("Decoded token payload:", payload)
    except jwt.ExpiredSignatureError:
        return Response({"error": "Token has expired."}, status=status.HTTP_401_UNAUTHORIZED)
    except jwt.InvalidTokenError as e:
        print("Invalid token error:", str(e))
        return Response({"error": "Invalid token."}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        user = User.objects.get(id=payload["user_id"])
        user_person = UserPerson.objects.get(user=user)
        person = user_person.person
        profile_data = {
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
            "name": person.name,
            "surname": person.surname,
            "position": person.position,
            "department": person.department,
            "contact": person.contact,
            "status": person.status,
            "location": person.location,
            "level": person.level,
            "supervisor": person.supervisor,
        }
        return Response(profile_data, status=status.HTTP_200_OK)
    except Exception as e:
        print("Error retrieving profile:", e)
        return Response({"error": "User or profile not found."}, status=status.HTTP_404_NOT_FOUND)
