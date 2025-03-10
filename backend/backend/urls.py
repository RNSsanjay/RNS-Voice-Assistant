from django.contrib import admin
from django.urls import path, include
from api.views import process_voice_text


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path("process/", process_voice_text),  # API endpoint for voice processing

    
]
