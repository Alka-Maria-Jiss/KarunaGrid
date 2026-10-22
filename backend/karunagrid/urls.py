"""
URL configuration for karunagrid project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def root_view(request):
    brevo_configured = bool(getattr(settings, 'BREVO_API_KEY', ''))
    return JsonResponse({
        "project": "KarunaGrid Care Network API",
        "status": "online",
        "brevo_configured": brevo_configured,
        "email_sender": getattr(settings, 'DEFAULT_FROM_EMAIL', ''),
        "version": "brevo-v2",
        "frontend_url": "http://localhost:5173/",
        "admin_panel": "http://localhost:8000/admin/",
        "api_root": "http://localhost:8000/api/"
    })

def test_email_view(request):
    import requests
    to_email = request.GET.get('to', 'karunagrid@gmail.com')
    api_key = (getattr(settings, 'BREVO_API_KEY', '') or '').strip().strip('"').strip("'")
    sender_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'karunagrid@gmail.com')
    
    payload = {
        'sender': {'name': 'KarunaGrid Support', 'email': sender_email},
        'to': [{'email': to_email}],
        'subject': 'KarunaGrid Diagnostics Test',
        'htmlContent': '<p>Diagnostics test from Render.</p>',
    }
    headers = {
        'accept': 'application/json',
        'api-key': api_key,
        'content-type': 'application/json',
    }
    try:
        r = requests.post('https://api.brevo.com/v3/smtp/email', json=payload, headers=headers, timeout=10)
        return JsonResponse({
            'status_code': r.status_code,
            'response': r.text,
            'api_key_len': len(api_key),
            'api_key_prefix': api_key[:10] if api_key else None,
            'sender': sender_email,
            'to': to_email,
        })
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'api_key_len': len(api_key),
        }, status=500)

urlpatterns = [
    path('', root_view, name='root'),
    path('api/test-email/', test_email_view, name='test_email'),
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/telemedicine/', include('care_coordination.urls')),
    path('api/doctor/telemedicine/', include('care_coordination.doctor_urls')),
    path('api/care-coordination/', include('care_coordination.urls')),
    path('api/medical-records/', include('medical_records.urls')),
    path('api/resources/', include('resources.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


