import os
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from migracao.importador import executar_migracao

TABELAS = [
    "profiles",
    "alunos",
    "responsaveis",
    "professores",
    "gestores",
    "notas",
    "faltas",
    "anotacoes",
    "atividades",
]


class AbortDryRun(Exception):
    pass


class Command(BaseCommand):
    help = "Migra os dados do banco Postgres do Supabase para o schema atual."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source-url",
            default=os.environ.get("SUPABASE_DATABASE_URL"),
            help=(
                "Connection string do Postgres de origem (a conexão direta do Supabase, "
                "não a anon/publishable key da API). Pode vir de SUPABASE_DATABASE_URL."
            ),
        )
        parser.add_argument("--ano-letivo", type=int, default=datetime.now().year)
        parser.add_argument("--turno-padrao", default="Manhã")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Executa e mostra o relatório, mas desfaz todas as alterações no final.",
        )

    def handle(self, *args, **options):
        try:
            import psycopg2
            import psycopg2.extras
        except ImportError as exc:
            raise CommandError("psycopg2 não está instalado no ambiente.") from exc

        source_url = options["source_url"]
        if not source_url:
            raise CommandError(
                "Informe --source-url ou defina SUPABASE_DATABASE_URL com a connection string "
                "direta do Postgres do Supabase."
            )

        self.stdout.write("Lendo dados de origem...")
        conexao = psycopg2.connect(source_url)
        try:
            dados = {}
            with conexao.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                for tabela in TABELAS:
                    cursor.execute(f"SELECT * FROM {tabela}")
                    dados[tabela] = [dict(linha) for linha in cursor.fetchall()]
        finally:
            conexao.close()

        for tabela, linhas in dados.items():
            self.stdout.write(f"  {tabela}: {len(linhas)} linha(s)")

        self.stdout.write("Migrando...")
        try:
            with transaction.atomic():
                relatorio = executar_migracao(dados, options["ano_letivo"], options["turno_padrao"])
                if options["dry_run"]:
                    self.stdout.write(self.style.WARNING("--dry-run: desfazendo as alterações."))
                    raise AbortDryRun
        except AbortDryRun:
            pass

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Relatório:"))
        self.stdout.write(str(relatorio))
