export type Role = 'admin' | 'diretor' | 'vice_diretor' | 'secretaria' | 'professor' | 'responsavel' | 'aluno';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  role: Role;
  is_active: boolean;
}

export interface Gestor extends Profile {
  departamento?: string;
}

export interface Professor extends Profile {
  formacao?: string;
}

export interface Responsavel extends Profile {
  telefone?: string;
  cpf?: string;
  ra_aluno?: string;
}

export interface Aluno extends Profile {
  ra?: string;
  data_nascimento?: string;
  responsavel_id?: string;
}

export interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  turno: 'Manhã' | 'Tarde' | 'Noite';
  created_at: string;
}

export interface TurmaProfessor {
  turma_id: string;
  professor_id: string;
  materia: string;
}

export interface Matricula {
  id: string;
  aluno_id: string;
  turma_id: string;
  ano_letivo: number;
}

export type Bimestres = { b1: number | null; b2: number | null; b3: number | null; b4: number | null };

export interface Nota {
  id: string;
  matricula_id: string;
  boletim?: Record<string, Bimestres>;
  created_at: string;
  nome_aluno?: string;
  ra_aluno?: string;
}

export interface Falta {
  id: string;
  matricula_id: string;
  registro_faltas?: Record<string, Bimestres>;
  created_at: string;
  nome_aluno?: string;
  ra_aluno?: string;
}

export interface AvisoData {
  tipo: 'aviso' | 'aviso_turma';
  titulo: string;
  mensagem: string;
  enviarPara: string;
  turma?: string;
}

export interface AnotacaoItem {
  info: string;
  resposta?: string;
}

export interface Anotacao {
  id: string;
  aluno_id: string;
  autor_id: string;
  texto: {
    anotacoes?: Record<string, AnotacaoItem>;
  } & Partial<AvisoData>;
  created_at: string;
  nome_aluno?: string;
  ra_aluno?: string;
}

export const MATERIAS_DISPONIVEIS = [
  'Língua Portuguesa',
  'Matemática',
  'História',
  'Geografia',
  'Ciências',
  'Língua Inglesa',
  'Arte',
  'Educação Física'
];

export const SERIES_DISPONIVEIS = [
  '5-A', '5-B', '5-C', '5-D',
  '6-A', '6-B', '6-C', '6-D',
  '7-A', '7-B', '7-C', '7-D',
  '8-A', '8-B', '8-C', '8-D',
  '9-A', '9-B', '9-C', '9-D'
];
