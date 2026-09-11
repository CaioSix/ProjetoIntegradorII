# Documentação do Banco de Dados - Sistema Escolar

Esta documentação descreve a arquitetura do banco de dados (Supabase/PostgreSQL) utilizada no Sistema de Gestão Escolar. O sistema utiliza uma arquitetura baseada em **Herança de Perfis (Role-Based Profile Inheritance)** para gerenciar os diferentes tipos de usuários.

## 1. Visão Geral da Arquitetura

O banco de dados centraliza a autenticação e os dados comuns na tabela `profiles`. Dependendo do cargo (`role`) do usuário (Aluno, Professor, Responsável, Gestor), o sistema cria um registro correspondente em uma **tabela especializada**, usando o mesmo `id` (Relacionamento 1:1).

Isso garante que:
- O login seja unificado.
- Apenas professores tenham o campo "Formação" e "Matéria".
- Apenas alunos tenham "RA" e "Turma".

---

## 2. Tabelas Principais e Estruturas

### 2.1. Tabela `profiles` (Tabela Central)
Armazena todos os usuários do sistema. Qualquer pessoa que faz login tem um registro aqui.
- `id` (UUID): Chave primária. Relaciona-se com `auth.users` do Supabase.
- `nome` (Texto): Nome completo do usuário.
- `email` (Texto): Email de acesso.
- `role` (Texto): Cargo do usuário (`admin`, `diretor`, `professor`, `responsavel`, `aluno`, etc).
- `ativo` (Booleano): Status do acesso (true/false).
- `created_at` (Data/Hora): Data de criação do registro.

### 2.2. Tabela `alunos` (Especializada)
Armazena os dados específicos de estudantes.
- `id` (UUID): Chave primária e Foreign Key (FK) -> `profiles.id`.
- `ra` (Texto): Registro do Aluno (matrícula).
- `turma` (Texto): Turma atual do aluno (ex: "5-A").
- `responsavel_id` (UUID): FK -> `profiles.id` (Relacionamento com a tabela de responsáveis).

### 2.3. Tabela `responsaveis` (Especializada)
Armazena os dados dos pais ou responsáveis legais.
- `id` (UUID): Chave primária e FK -> `profiles.id`.
- `telefone` (Texto): Número de contato do responsável.
- `ra_aluno` (Texto): RA do aluno vinculado (forma alternativa de vinculo).
- `cpf` (Texto): Documento do responsável (opcional).

### 2.4. Tabela `professores` (Especializada)
Armazena dados do corpo docente.
- `id` (UUID): Chave primária e FK -> `profiles.id`.
- `materia` (Texto): Disciplina principal lecionada (ex: Matemática).
- `formacao` (Texto): Formação acadêmica (ex: Licenciatura em Matemática).
- `turmas` (Array de Texto): Lista de turmas em que o professor dá aula (ex: `["5-A", "6-B"]`).

### 2.5. Tabela `gestores` (Especializada)
Armazena dados da equipe diretiva e administrativa.
- `id` (UUID): Chave primária e FK -> `profiles.id`.
- `departamento` (Texto): Setor em que atua (ex: "Secretaria").

---

## 3. Relacionamentos (Relationships)

1. **`profiles` ↔ `alunos`, `professores`, `responsaveis`, `gestores` (1:1)**
   - Um usuário na tabela `profiles` com `role = 'professor'` terá **exatamente um** registro na tabela `professores` compartilhando o mesmo `id`.
   - **Mecanismo Técnico:** Utilizamos `UPSERT` no front-end para garantir que o registro especializado exista.

2. **`responsaveis` ↔ `alunos` (1:N)**
   - Um responsável pode ter um ou mais alunos. 
   - A amarração é feita principalmente pelo campo `responsavel_id` na tabela `alunos`, que aponta para o `id` do responsável na tabela `profiles`.

---

## 4. Segurança e Permissões (RLS - Row Level Security)

Para proteger os dados, o PostgreSQL no Supabase utiliza políticas de RLS.
- **Acesso Autenticado:** Somente usuários logados (`authenticated`) podem ler, inserir e atualizar dados nas tabelas `professores`, `alunos` e `responsaveis`.
- O administrador tem permissão global, o que permite o funcionamento do painel de administração (`AdminPanel`).
