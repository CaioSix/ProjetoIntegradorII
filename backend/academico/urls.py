from rest_framework.routers import DefaultRouter

from .views import FaltaViewSet, MatriculaViewSet, NotaViewSet

router = DefaultRouter()
router.register("matriculas", MatriculaViewSet, basename="matricula")
router.register("notas", NotaViewSet, basename="nota")
router.register("faltas", FaltaViewSet, basename="falta")

urlpatterns = router.urls
