from django.contrib import admin
from django.urls import path
from api.views import process_voice_text

urlpatterns = [
    path("admin/", admin.site.urls),  # Admin panel
    path("process/", process_voice_text),  # API endpoint for voice processing
]
