from datetime import datetime

from django.db import transaction
from django.utils import timezone as dj_timezone

from academico.models import Falta, Matricula, Nota
from accounts.models import Aluno, Gestor, Professor, Responsavel, User
from comunicacao.models import Anotacao, Atividade, Aviso
from turmas.models import Materia, Turma

MATERIA_POR_LABEL = {label: value for value, label in Materia.choices}


class RelatorioMigracao:
    def __init__(self):
        self.criados = {}
        self.avisos = []

    def registrar(self, chave, quantidade=1):
        self.criados[chave] = self.criados.get(chave, 0) + quantidade

    def avisar(self, mensagem):
        self.avisos.append(mensagem)

    def __str__(self):
        linhas = [f"{chave}: {quantidade}" for chave, quantidade in sorted(self.criados.items())]
        linhas += [f"AVISO: {mensagem}" for mensagem in self.avisos]
        return "\n".join(linhas) if linhas else "Nada migrado."


def _parse_data(valor):
    if not valor:
        return None
    if isinstance(valor, datetime):
        data = valor
    else:
        try:
            data = datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
        except ValueError:
            return None

    if dj_timezone.is_naive(data):
        data = dj_timezone.make_aware(data)
    return data


def migrar_turmas(dados, ano_letivo, turno_padrao, relatorio):
    nomes = set()
    for aluno in dados.get("alunos", []):
        if aluno.get("turma"):
            nomes.add(aluno["turma"])
    for professor in dados.get("professores", []):
        for nome in professor.get("turmas") or []:
            nomes.add(nome)

    turmas_por_nome = {}
    for nome in sorted(nomes):
        turma, criado = Turma.objects.get_or_create(
            nome=nome, ano_letivo=ano_letivo, defaults={"turno": turno_padrao}
        )
        turmas_por_nome[nome] = turma
        if criado:
            relatorio.registrar("turmas")

    if nomes:
        relatorio.avisar(
            f"Turno definido como '{turno_padrao}' para as turmas criadas (o schema de origem "
            "não guardava turno por turma) — revisar manualmente."
        )

    return turmas_por_nome


def migrar_usuarios(dados, relatorio):
    usuarios_por_id_antigo = {}
    for profile in dados.get("profiles", []):
        user = User(
            email=profile["email"],
            nome=profile["nome"],
            role=profile["role"],
            is_active=profile.get("ativo", True),
        )
        user.set_unusable_password()
        user.save()

        data_criacao = _parse_data(profile.get("created_at"))
        if data_criacao:
            User.objects.filter(pk=user.pk).update(date_joined=data_criacao)

        usuarios_por_id_antigo[profile["id"]] = user
        relatorio.registrar("usuarios")

    if usuarios_por_id_antigo:
        relatorio.avisar(
            "Todos os usuários migrados ficaram sem senha utilizável — é necessário um fluxo de "
            "redefinição de senha antes do primeiro login."
        )

    return usuarios_por_id_antigo


def migrar_gestores(dados, usuarios_por_id_antigo, relatorio):
    for gestor in dados.get("gestores", []):
        user = usuarios_por_id_antigo.get(gestor["id"])
        if not user:
            relatorio.avisar(f"Gestor {gestor['id']} sem profile correspondente — ignorado.")
            continue
        Gestor.objects.create(user=user, departamento=gestor.get("departamento") or "")
        relatorio.registrar("gestores")


def migrar_professores(dados, usuarios_por_id_antigo, turmas_por_nome, relatorio):
    professores_por_id_antigo = {}
    for professor in dados.get("professores", []):
        user = usuarios_por_id_antigo.get(professor["id"])
        if not user:
            relatorio.avisar(f"Professor {professor['id']} sem profile correspondente — ignorado.")
            continue
        obj = Professor.objects.create(
            user=user,
            materia=MATERIA_POR_LABEL.get(professor.get("materia"), ""),
            formacao=professor.get("formacao") or "",
        )
        for nome_turma in professor.get("turmas") or []:
            turma = turmas_por_nome.get(nome_turma)
            if turma:
                obj.turmas.add(turma)
            else:
                relatorio.avisar(f"Turma '{nome_turma}' do professor {professor['id']} não encontrada.")
        professores_por_id_antigo[professor["id"]] = obj
        relatorio.registrar("professores")
    return professores_por_id_antigo


def migrar_responsaveis(dados, usuarios_por_id_antigo, relatorio):
    responsaveis_por_id_antigo = {}
    for responsavel in dados.get("responsaveis", []):
        user = usuarios_por_id_antigo.get(responsavel["id"])
        if not user:
            relatorio.avisar(f"Responsável {responsavel['id']} sem profile correspondente — ignorado.")
            continue
        obj = Responsavel.objects.create(
            user=user,
            telefone=responsavel.get("telefone") or "",
            cpf=responsavel.get("cpf") or "",
        )
        responsaveis_por_id_antigo[responsavel["id"]] = obj
        relatorio.registrar("responsaveis")
    return responsaveis_por_id_antigo


def migrar_alunos(dados, usuarios_por_id_antigo, turmas_por_nome, responsaveis_por_id_antigo, relatorio):
    alunos_por_id_antigo = {}
    for aluno in dados.get("alunos", []):
        user = usuarios_por_id_antigo.get(aluno["id"])
        if not user:
            relatorio.avisar(f"Aluno {aluno['id']} sem profile correspondente — ignorado.")
            continue
        obj = Aluno.objects.create(
            user=user,
            ra=aluno.get("ra") or f"SEM-RA-{aluno['id']}",
            turma=turmas_por_nome.get(aluno.get("turma")),
            responsavel=responsaveis_por_id_antigo.get(aluno.get("responsavel_id")),
        )
        alunos_por_id_antigo[aluno["id"]] = obj
        relatorio.registrar("alunos")
    return alunos_por_id_antigo


def migrar_matriculas(alunos_por_id_antigo, ano_letivo, relatorio):
    matriculas_por_aluno_antigo = {}
    for id_antigo, aluno in alunos_por_id_antigo.items():
        if not aluno.turma:
            relatorio.avisar(f"Aluno {aluno.ra} sem turma definida — matrícula não criada.")
            continue
        matricula = Matricula.objects.create(aluno=aluno, turma=aluno.turma, ano_letivo=ano_letivo)
        matriculas_por_aluno_antigo[id_antigo] = matricula
        relatorio.registrar("matriculas")
    return matriculas_por_aluno_antigo


def migrar_notas_e_faltas(dados, matriculas_por_aluno_antigo, relatorio):
    for nota in dados.get("notas", []):
        matricula = matriculas_por_aluno_antigo.get(nota["matricula_id"])
        if not matricula:
            relatorio.avisar(
                f"Notas do aluno {nota.get('ra_aluno') or nota['matricula_id']} sem matrícula — ignoradas."
            )
            continue
        for label, bimestres in (nota.get("boletim") or {}).items():
            materia = MATERIA_POR_LABEL.get(label)
            if not materia:
                relatorio.avisar(f"Matéria desconhecida '{label}' em notas — ignorada.")
                continue
            Nota.objects.update_or_create(
                matricula=matricula,
                materia=materia,
                defaults={
                    "b1": bimestres.get("b1"),
                    "b2": bimestres.get("b2"),
                    "b3": bimestres.get("b3"),
                    "b4": bimestres.get("b4"),
                },
            )
            relatorio.registrar("notas")

    for falta in dados.get("faltas", []):
        matricula = matriculas_por_aluno_antigo.get(falta["matricula_id"])
        if not matricula:
            relatorio.avisar(
                f"Faltas do aluno {falta.get('ra_aluno') or falta['matricula_id']} sem matrícula — ignoradas."
            )
            continue
        for label, bimestres in (falta.get("registro_faltas") or {}).items():
            materia = MATERIA_POR_LABEL.get(label)
            if not materia:
                relatorio.avisar(f"Matéria desconhecida '{label}' em faltas — ignorada.")
                continue
            Falta.objects.update_or_create(
                matricula=matricula,
                materia=materia,
                defaults={
                    "b1": bimestres.get("b1") or 0,
                    "b2": bimestres.get("b2") or 0,
                    "b3": bimestres.get("b3") or 0,
                    "b4": bimestres.get("b4") or 0,
                },
            )
            relatorio.registrar("faltas")


def migrar_anotacoes_e_avisos(dados, usuarios_por_id_antigo, alunos_por_id_antigo, turmas_por_nome, relatorio):
    for registro in dados.get("anotacoes", []):
        aluno = alunos_por_id_antigo.get(registro["aluno_id"])
        autor = usuarios_por_id_antigo.get(registro.get("autor_id"))
        texto = registro.get("texto") or {}

        itens_anotacao = texto.get("anotacoes")
        if itens_anotacao:
            if not aluno:
                relatorio.avisar(f"Anotações do aluno {registro['aluno_id']} sem cadastro — ignoradas.")
            else:
                for data_str, item in itens_anotacao.items():
                    anotacao = Anotacao.objects.create(
                        aluno=aluno,
                        autor=autor,
                        texto=item.get("info", ""),
                        resposta=item.get("resposta") or "",
                    )
                    data = _parse_data(data_str) or _parse_data(registro.get("created_at"))
                    if data:
                        Anotacao.objects.filter(pk=anotacao.pk).update(created_at=data)
                    relatorio.registrar("anotacoes")

        if texto.get("tipo") in ("aviso", "aviso_turma"):
            destinatario_aluno = aluno if texto["tipo"] == "aviso" else None
            destinatario_turma = turmas_por_nome.get(texto.get("turma")) if texto["tipo"] == "aviso_turma" else None

            if not destinatario_aluno and not destinatario_turma:
                relatorio.avisar(f"Aviso do registro {registro['id']} sem destinatário resolvido — ignorado.")
            else:
                aviso = Aviso.objects.create(
                    autor=autor,
                    titulo=texto.get("titulo", ""),
                    mensagem=texto.get("mensagem", ""),
                    destinatario_aluno=destinatario_aluno,
                    destinatario_turma=destinatario_turma,
                )
                data = _parse_data(registro.get("created_at"))
                if data:
                    Aviso.objects.filter(pk=aviso.pk).update(created_at=data)
                relatorio.registrar("avisos")


def migrar_atividades(dados, alunos_por_id_antigo, relatorio):
    for atividade in dados.get("atividades", []):
        aluno = alunos_por_id_antigo.get(atividade["aluno_id"])
        if not aluno:
            relatorio.avisar(f"Atividades do aluno {atividade['aluno_id']} sem cadastro — ignoradas.")
            continue
        Atividade.objects.update_or_create(aluno=aluno, defaults={"dados": atividade.get("dados") or {}})
        relatorio.registrar("atividades")


def executar_migracao(dados, ano_letivo, turno_padrao="Manhã"):
    relatorio = RelatorioMigracao()
    with transaction.atomic():
        turmas_por_nome = migrar_turmas(dados, ano_letivo, turno_padrao, relatorio)
        usuarios_por_id_antigo = migrar_usuarios(dados, relatorio)
        migrar_gestores(dados, usuarios_por_id_antigo, relatorio)
        migrar_professores(dados, usuarios_por_id_antigo, turmas_por_nome, relatorio)
        responsaveis_por_id_antigo = migrar_responsaveis(dados, usuarios_por_id_antigo, relatorio)
        alunos_por_id_antigo = migrar_alunos(
            dados, usuarios_por_id_antigo, turmas_por_nome, responsaveis_por_id_antigo, relatorio
        )
        matriculas_por_aluno_antigo = migrar_matriculas(alunos_por_id_antigo, ano_letivo, relatorio)
        migrar_notas_e_faltas(dados, matriculas_por_aluno_antigo, relatorio)
        migrar_anotacoes_e_avisos(dados, usuarios_por_id_antigo, alunos_por_id_antigo, turmas_por_nome, relatorio)
        migrar_atividades(dados, alunos_por_id_antigo, relatorio)
    return relatorio
