# 🎓 Projeto Integrador 2

Repositório centralizado do sistema escolar, estruturado para arquitetura desacoplada (Frontend, Backend e Infraestrutura).

---

## 📁 Estrutura do Repositório

```text
ProjetoIntegrador2/
├── backend/    # API REST e regras de negócio do servidor
├── frontend/   # Aplicação web em React 19 + Vite + Tailwind CSS
├── infra/      # Configurações de Docker, Caddy, VM e CI/CD
└── backup/     # Versão anterior de referencia (Supabase)
```

---

##  Como Executar o Frontend

```bash
# Entrar no diretório do frontend
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Como Executar o Backend

Veja [backend/README.md](backend/README.md) para detalhes (apps, decisões e próximos passos). Resumo:

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

