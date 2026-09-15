from rest_framework.routers import DefaultRouter

from .views import MatriculaViewSet

router = DefaultRouter()
router.register("matriculas", MatriculaViewSet, basename="matricula")

urlpatterns = router.urls
