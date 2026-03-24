from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('auth_service.urls')),
    # other service endpoints can be included similarly
]
