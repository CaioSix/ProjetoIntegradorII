from django.test import TestCase

from academico.models import Falta, Matricula, Nota
from accounts.models import Aluno, Gestor, Professor, Responsavel, User
from comunicacao.models import Anotacao, Atividade, Aviso
from turmas.models import Turma

from .importador import executar_migracao

DADOS_ORIGEM = {
    "profiles": [
        {"id": "p1", "nome": "Gestora", "email": "gestora@example.com", "role": "admin", "ativo": True, "created_at": "2025-01-10T08:00:00Z"},
        {"id": "p2", "nome": "Professor Mat", "email": "prof@example.com", "role": "professor", "ativo": True, "created_at": "2025-01-10T08:00:00Z"},
        {"id": "p3", "nome": "Responsavel Um", "email": "resp@example.com", "role": "responsavel", "ativo": True, "created_at": "2025-01-10T08:00:00Z"},
        {"id": "p4", "nome": "Aluno Um", "email": "aluno1@example.com", "role": "aluno", "ativo": True, "created_at": "2025-01-10T08:00:00Z"},
        {"id": "p5", "nome": "Aluno Dois", "email": "aluno2@example.com", "role": "aluno", "ativo": True, "created_at": "2025-01-10T08:00:00Z"},
    ],
    "gestores": [{"id": "p1", "departamento": "Secretaria"}],
    "professores": [{"id": "p2", "materia": "Matemática", "formacao": "Lic. Matemática", "turmas": ["5-A"]}],
    "responsaveis": [{"id": "p3", "telefone": "11999999999", "cpf": "11111111111", "ra_aluno": "RA0001"}],
    "alunos": [
        {"id": "p4", "ra": "RA0001", "turma": "5-A", "responsavel_id": "p3"},
        {"id": "p5", "ra": "RA0002", "turma": "", "responsavel_id": None},
    ],
    "notas": [
        {
            "id": "n1",
            "matricula_id": "p4",
            "ra_aluno": "RA0001",
            "boletim": {
                "Matemática": {"b1": 8.5, "b2": None, "b3": None, "b4": None},
                "História": {"b1": 7, "b2": None, "b3": None, "b4": None},
            },
        }
    ],
    "faltas": [
        {
            "id": "f1",
            "matricula_id": "p4",
            "ra_aluno": "RA0001",
            "registro_faltas": {"Matemática": {"b1": 1, "b2": 0, "b3": 0, "b4": 0}},
        }
    ],
    "anotacoes": [
        {
            "id": "a1",
            "aluno_id": "p4",
            "autor_id": "p2",
            "created_at": "2025-03-10T12:00:00Z",
            "texto": {"anotacoes": {"2025-03-10": {"info": "Foco baixo em sala", "resposta": ""}}},
        },
        {
            "id": "a2",
            "aluno_id": "p4",
            "autor_id": "p1",
            "created_at": "2025-04-01T09:00:00Z",
            "texto": {"tipo": "aviso", "titulo": "Reuniao", "mensagem": "Comparecer amanha", "enviarPara": "individual"},
        },
        {
            "id": "a3",
            "aluno_id": "p4",
            "autor_id": "p1",
            "created_at": "2025-04-02T09:00:00Z",
            "texto": {"tipo": "aviso_turma", "titulo": "Reuniao geral", "mensagem": "Todos", "turma": "5-A"},
        },
    ],
    "atividades": [{"id": "at1", "aluno_id": "p4", "dados": {"tarefas": {"lista de exercicios": True}}}],
}


class ExecutarMigracaoTests(TestCase):
    def setUp(self):
        self.relatorio = executar_migracao(DADOS_ORIGEM, ano_letivo=2026, turno_padrao="Manhã")

    def test_turma_criada_com_turno_padrao(self):
        turma = Turma.objects.get(nome="5-A", ano_letivo=2026)
        self.assertEqual(turma.turno, "Manhã")
        self.assertTrue(any("Turno definido como" in a for a in self.relatorio.avisos))

    def test_usuarios_migrados_sem_senha_utilizavel(self):
        self.assertEqual(User.objects.count(), 5)
        for user in User.objects.all():
            self.assertFalse(user.has_usable_password())

    def test_especializacoes_criadas(self):
        self.assertEqual(Gestor.objects.count(), 1)
        self.assertEqual(Responsavel.objects.count(), 1)
        self.assertEqual(Aluno.objects.count(), 2)

        professor = Professor.objects.get(user__email="prof@example.com")
        self.assertEqual(professor.materia, "matematica")
        self.assertEqual(list(professor.turmas.values_list("nome", flat=True)), ["5-A"])

    def test_aluno_vinculado_a_turma_e_responsavel(self):
        aluno = Aluno.objects.get(ra="RA0001")
        self.assertEqual(aluno.turma.nome, "5-A")
        self.assertEqual(aluno.responsavel.user.email, "resp@example.com")

    def test_aluno_sem_turma_nao_gera_matricula(self):
        self.assertEqual(Matricula.objects.count(), 1)
        self.assertTrue(any("sem turma definida" in a for a in self.relatorio.avisos))

    def test_notas_e_faltas_flatten_por_materia(self):
        matricula = Matricula.objects.get(aluno__ra="RA0001")
        self.assertEqual(Nota.objects.filter(matricula=matricula).count(), 2)
        nota_mat = Nota.objects.get(matricula=matricula, materia="matematica")
        self.assertEqual(float(nota_mat.b1), 8.5)

        falta_mat = Falta.objects.get(matricula=matricula, materia="matematica")
        self.assertEqual(falta_mat.b1, 1)

    def test_anotacao_extraida_do_json_misto(self):
        anotacao = Anotacao.objects.get(texto="Foco baixo em sala")
        self.assertEqual(anotacao.aluno.ra, "RA0001")
        self.assertEqual(anotacao.created_at.isoformat()[:10], "2025-03-10")

    def test_aviso_individual_e_por_turma_extraidos_do_json_misto(self):
        aviso_individual = Aviso.objects.get(titulo="Reuniao")
        self.assertEqual(aviso_individual.destinatario_aluno.ra, "RA0001")
        self.assertIsNone(aviso_individual.destinatario_turma)

        aviso_turma = Aviso.objects.get(titulo="Reuniao geral")
        self.assertIsNone(aviso_turma.destinatario_aluno)
        self.assertEqual(aviso_turma.destinatario_turma.nome, "5-A")

    def test_atividade_migrada(self):
        atividade = Atividade.objects.get(aluno__ra="RA0001")
        self.assertEqual(atividade.dados["tarefas"]["lista de exercicios"], True)
