from rest_framework.routers import DefaultRouter

from .views import AnotacaoViewSet, AvisoViewSet

router = DefaultRouter()
router.register("avisos", AvisoViewSet, basename="aviso")
router.register("anotacoes", AnotacaoViewSet, basename="anotacao")

urlpatterns = router.urls
