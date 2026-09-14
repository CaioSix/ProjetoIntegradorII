# Backend — Django + DRF

Substitui o Supabase da v1. Apps:

- `accounts` — `User` customizado (login por e-mail) + especializações 1:1 (`Gestor`, `Professor`, `Responsavel`, `Aluno`), equivalente à antiga tabela `profiles` + tabelas especializadas.
- `turmas` — `Turma` (antes um texto solto em `alunos.turma`) e a lista fixa de `Materia`.
- `academico` — `Matricula` (aluno+turma+ano letivo), `Nota` e `Falta` por matéria/bimestre (antes um JSON `Record<materia, Bimestres>` por aluno).
- `comunicacao` — `Aviso` (individual ou por turma), `Anotacao` (uma por registro, com resposta) e `Atividade` (ainda como JSON — schema de `dados.tarefas` nunca foi levantado com o usuário).

Ainda **não há API REST** (serializers/viewsets) nem autenticação JWT ligada nas rotas — só os models, o Django Admin e a base de configuração (JWT/CORS já instalados e configurados em `settings.py`, prontos para a próxima etapa).

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

## Decisões que já foram tomadas (não relitigar sem novo requisito)

- Framework: Django + DRF (não Flask/FastAPI).
- Sem real-time por enquanto (sem Django Channels) — usuário confirmou que não sabe se precisa ainda.
- Sem infraestrutura de produção definida — por isso `DATABASE_URL`/`CORS_ALLOWED_ORIGINS`/`ALLOWED_HOSTS` vêm de variáveis de ambiente com defaults de desenvolvimento local, nunca hardcoded.

## Próximos passos sugeridos

1. Serializers + viewsets básicos para `accounts` (endpoint `/api/me/` para resolver o `role` logado).
2. Permissions por role (aluno só vê o próprio boletim; responsável só vê aluno(s) vinculado(s)).
3. Rotas de auth com `djangorestframework-simplejwt` (login/refresh), migrando de Bearer token para cookie `httpOnly` antes de produção.
4. Script de migração de dados do Supabase para este schema.
