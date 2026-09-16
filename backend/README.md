# Backend — Django + DRF

Apps:

- `accounts` — `User` customizado (login por e-mail) + especializações 1:1 (`Gestor`, `Professor`, `Responsavel`, `Aluno`).
- `turmas` — `Turma` e a lista fixa de `Materia`.
- `academico` — `Matricula` (aluno+turma+ano letivo), `Nota` e `Falta` por matéria/bimestre.
- `comunicacao` — `Aviso` (individual ou por turma) e `Anotacao` (com resposta do responsável).
- `migracao` — comando único de importação de dados do Supabase (v1), sem models próprios.

## Rodando localmente

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # SQLite local por padrão; sem Postgres/produção definidos ainda

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Acesse `http://127.0.0.1:8000/admin/`.

## API

Autenticação (JWT, Bearer token por ora):
- `POST /api/auth/token/` — `{"email", "password"}` → `access`/`refresh`.
- `POST /api/auth/token/refresh/`
- `GET /api/me/` — dados do usuário autenticado.

Recursos (todos respeitando as regras de acesso por role, ver `get_queryset`/`permissions.py` de cada app):
- `/api/matriculas/`, `/api/notas/`, `/api/faltas/` (`academico`)
- `/api/avisos/`, `/api/anotacoes/` (`comunicacao`)

## Migração de dados do Supabase

```bash
python manage.py migrar_supabase --source-url "postgres://usuario:senha@host:5432/postgres" --ano-letivo 2026 --dry-run
```

- `--source-url` (ou a env var `SUPABASE_DATABASE_URL`) precisa ser a **connection string direta do Postgres** do projeto Supabase (Project Settings → Database), **não** a anon/publishable key da API — essa key não dá acesso de leitura a todas as tabelas por causa do RLS.
- `--dry-run` roda tudo e mostra o relatório, mas desfaz as alterações no final — usar antes de rodar de verdade.
- Sem `--ano-letivo`, assume o ano corrente.
- `--turno-padrao` (default `"Manhã"`): o schema de origem não guardava turno por turma, então todas as turmas criadas na migração saem com esse valor — revisar manualmente depois pelo Django Admin.
- **Todo usuário migrado fica sem senha utilizável** (os hashes de senha do Supabase Auth não são acessíveis nem compatíveis) — é necessário um fluxo de redefinição de senha antes do primeiro login desses usuários.
- A lógica de transformação (`migracao/importador.py`) é testada com dados fabricados em `migracao/tests.py` (`python manage.py test migracao`); o comando em si (`management/commands/migrar_supabase.py`) nunca foi executado contra um Supabase real nesta sessão — não há credenciais de produção disponíveis aqui.

## Decisões que já foram tomadas (não relitigar sem novo requisito)

- Framework: Django + DRF (não Flask/FastAPI).
- Sem real-time por enquanto (sem Django Channels).
- Sem infraestrutura de produção definida — por isso `DATABASE_URL`/`CORS_ALLOWED_ORIGINS`/`ALLOWED_HOSTS` vêm de variáveis de ambiente com defaults de desenvolvimento local, nunca hardcoded.

## Próximos passos sugeridos

1. Trocar autenticação de Bearer token para cookie `httpOnly` antes de produção.
2. Endpoints de gestão (`turmas`, cadastro de usuários) para o painel administrativo.
3. Rodar a migração de dados real (com credenciais do Supabase) e o fluxo de redefinição de senha para os usuários migrados.
4. Frontend: substituir as chamadas diretas ao Supabase por esta API.
