import jwt
import datetime
from django.conf import settings

def generate_jwt(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token
