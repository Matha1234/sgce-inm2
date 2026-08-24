from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.utilisateurs.views import ChangerMotDePasseView, MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/auth/changer-mot-de-passe/', ChangerMotDePasseView.as_view(), name='changer-mot-de-passe'),
    path('api/', include('apps.commandes.urls')),
    path('api/', include('apps.catalogue.urls')),
    path('api/', include('apps.ia.urls')),
    path('api/', include('apps.facturation.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/', include('apps.utilisateurs.urls')),
    path('api/', include('apps.controle.urls')),
    path('api/', include('apps.messagerie.urls')),
]

if settings.DEBUG:
    # Sert les fichiers uploades (photos de profil) en developpement.
    # En production, c'est le serveur web (nginx) qui doit s'en charger.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)