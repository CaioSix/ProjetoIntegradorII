import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { LogOut, Users, BookOpen, Plus, Loader2, Search, UserCircle, Shield, GraduationCap, CheckSquare, FileText, Bell, Edit, History, Clock } from 'lucide-react';
import { type Profile, type Role, MATERIAS_DISPONIVEIS, SERIES_DISPONIVEIS } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

interface AvisoEnviado {
  id: string;
  data: string;
  titulo: string;
  mensagem: string;
  enviarPara: string;
  alunoId?: string;
  turma?: string;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  diretor: 'Diretor',
  vice_diretor: 'Vice-Diretor',
  secretaria: 'Secretaria',
  professor: 'Professor',
  responsavel: 'Responsável',
  aluno: 'Aluno'
};

interface ExtendedProfile extends Profile {
  formacao?: string;
  ra?: string;
  ra_aluno?: string;
  telefone?: string;
  materia?: string;
  turmas?: string[];
  turma?: string;
  responsavel_id?: string;
}

export function AdminPanel({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'turmas'>('usuarios');
  const [profiles, setProfiles] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [turmasSubTab, setTurmasSubTab] = useState<'alunos' | 'professores'>('alunos');
  const [selectedTurma, setSelectedTurma] = useState<string | null>(null);
  const [expandedAlunoId, setExpandedAlunoId] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
    // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ExtendedProfile | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const openEditModal = (profile: ExtendedProfile) => {
    setEditingProfile(profile);
    setFormData({
      nome: profile.nome,
      email: profile.email,
      senha: '', // Senha read-only na edição client-side
      role: profile.role,
      ra: profile.ra || '',
      telefone: profile.telefone || '',
      ra_aluno: profile.ra_aluno || '',
      turmas_professor: profile.turmas || [],
      materia_professor: profile.materia || '',
      formacao_professor: profile.formacao || '',
      turma: profile.turma || '',
      nome_responsavel: '',
      email_responsavel: '',
      telefone_responsavel: '',
      observacao: ''
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setIsUpdatingUser(true);
    setFormError(null);
    
    try {
      // 1. Atualizar Profile
      const { error: pErr } = await supabase.from('profiles').update({ nome: formData.nome }).eq('id', editingProfile.id);
      if (pErr) throw new Error("Erro ao atualizar perfil: " + pErr.message);
      
      // 2. Atualizar tabelas específicas
      if (editingProfile.role === 'aluno') {
        const { error: aErr } = await supabase.from('alunos').upsert({ id: editingProfile.id, ra: formData.ra, turma: formData.turma });
        if (aErr) throw new Error("Erro ao atualizar aluno: " + aErr.message);
      } else if (editingProfile.role === 'responsavel') {
        const { error: rErr } = await supabase.from('responsaveis').upsert({ id: editingProfile.id, telefone: formData.telefone, ra_aluno: formData.ra_aluno });
        if (rErr) throw new Error("Erro ao atualizar responsável: " + rErr.message);
      } else if (editingProfile.role === 'professor') {
         const { error: prErr } = await supabase.from('professores').upsert({ id: editingProfile.id, materia: formData.materia_professor, turmas: formData.turmas_professor, formacao: formData.formacao_professor });
         if (prErr) throw new Error("Erro ao atualizar professor: " + prErr.message);
      }
      
      await fetchProfiles();
      setIsEditModalOpen(false);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const toggleUserActive = async (profile: ExtendedProfile) => {
    try {
      const { error } = await supabase.from('profiles').update({ ativo: !profile.ativo }).eq('id', profile.id);
      if (error) throw error;
      await fetchProfiles();
    } catch (e) {
      alert("Erro ao alterar status: " + (e as Error).message);
    }
  };

  // Boletim Modal State
  const [isBoletimModalOpen, setIsBoletimModalOpen] = useState(false);
  const [selectedAlunoBoletim, setSelectedAlunoBoletim] = useState<ExtendedProfile | null>(null);
  const [boletimData, setBoletimData] = useState<Record<string, { b1: number | null; b2: number | null; b3: number | null; b4: number | null }> | null>(null);
  const [loadingBoletim, setLoadingBoletim] = useState(false);

  // Aviso Modal State
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [avisoTarget, setAvisoTarget] = useState<{type: 'aluno', aluno: ExtendedProfile} | {type: 'turma', turma: string} | null>(null);
  const [isSendingAviso, setIsSendingAviso] = useState(false);
  const [avisoSuccess, setAvisoSuccess] = useState(false);
  const [avisoData, setAvisoData] = useState({ titulo: '', mensagem: '', enviarPara: 'ambos' });

  // Historico de Avisos State
  const [avisosHistorico, setAvisosHistorico] = useState<AvisoEnviado[]>([]);
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [historicoTarget, setHistoricoTarget] = useState<{type: 'aluno', aluno: ExtendedProfile} | {type: 'turma', turma: string} | null>(null);
  const [isHistoricoLoading, setIsHistoricoLoading] = useState(false);

  const openAviso = (target: {type: 'aluno', aluno: ExtendedProfile} | {type: 'turma', turma: string}) => {
    setAvisoTarget(target);
    setAvisoData({ titulo: '', mensagem: '', enviarPara: 'ambos' });
    setAvisoSuccess(false);
    setIsAvisoModalOpen(true);
  };

  const openHistorico = async (target: {type: 'aluno', aluno: ExtendedProfile} | {type: 'turma', turma: string}) => {
    setHistoricoTarget(target);
    setIsHistoricoModalOpen(true);
    setIsHistoricoLoading(true);
    
    try {
      // Build query to fetch annotations that are 'avisos'
      let query = supabase
        .from('anotacoes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (target.type === 'aluno') {
        query = query.eq('aluno_id', target.aluno.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter those that are actually avisos in the JSON structure
      let avisosFetched = (data || []).map(a => {
        const textoData = a.texto as any;
        if (textoData && (textoData.tipo === 'aviso' || textoData.tipo === 'aviso_turma')) {
          return {
            id: a.id,
            data: a.created_at,
            titulo: textoData.titulo || '',
            mensagem: textoData.mensagem || '',
            enviarPara: textoData.enviarPara || 'ambos',
            alunoId: a.aluno_id,
            turma: textoData.turma
          } as AvisoEnviado;
        }
        return null;
      }).filter(Boolean) as AvisoEnviado[];

      // Se for para turma, garantir que a gente pegue só avisos_turma que correspondam à turma alvo
      if (target.type === 'turma') {
        avisosFetched = avisosFetched.filter(a => a.turma === target.turma);
        // Filtrar duplicados se mandamos múltiplos registros para a mesma turma
        const uniqueAvisos = new Map<string, AvisoEnviado>();
        avisosFetched.forEach(a => {
          // Usar título e data para agrupar (ou título e mensagem)
          const key = a.titulo + a.data.substring(0, 16); 
          if (!uniqueAvisos.has(key)) {
             uniqueAvisos.set(key, a);
          }
        });
        avisosFetched = Array.from(uniqueAvisos.values());
      }
      
      setAvisosHistorico(avisosFetched);
    } catch(e) {
      console.error("Erro ao buscar histórico:", e);
    } finally {
      setIsHistoricoLoading(false);
    }
  };

  const handleSendAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingAviso(true);
    setAvisoSuccess(false);
    
    try {
      const isTurma = avisoTarget?.type === 'turma';
      const alunosAlvo = isTurma 
        ? profiles.filter(p => p.role === 'aluno' && p.turma === avisoTarget.turma)
        : (avisoTarget?.type === 'aluno' ? [avisoTarget.aluno] : []);

      if (alunosAlvo.length === 0) throw new Error("Nenhum aluno encontrado para envio.");

      const registrosAnotacoes = alunosAlvo.map(aluno => ({
        aluno_id: aluno.id,
        autor_id: user.id,
        texto: {
          tipo: isTurma ? 'aviso_turma' : 'aviso',
          titulo: avisoData.titulo,
          mensagem: avisoData.mensagem,
          enviarPara: avisoData.enviarPara,
          turma: isTurma ? avisoTarget.turma : undefined
        }
      }));

      const { error } = await supabase.from('anotacoes').insert(registrosAnotacoes);
      
      if (error) throw error;
      
      setAvisoSuccess(true);
      setTimeout(() => {
        setIsAvisoModalOpen(false);
      }, 2000);
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar aviso: " + (e as Error).message);
    } finally {
      setIsSendingAviso(false);
    }
  };

  const openBoletim = async (aluno: ExtendedProfile) => {
    setSelectedAlunoBoletim(aluno);
    setIsBoletimModalOpen(true);
    setLoadingBoletim(true);
    setBoletimData(null);
    
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('boletim')
        .eq('aluno_id', aluno.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        console.error("Erro ao buscar notas:", error);
      }
      
      if (data && data.boletim) {
        setBoletimData(data.boletim);
      } else {
        // Estado vazio
        const empty: Record<string, any> = {};
        MATERIAS_DISPONIVEIS.forEach(m => {
          empty[m] = { b1: null, b2: null, b3: null, b4: null };
        });
        setBoletimData(empty);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBoletim(false);
    }
  };
  
  const [formData, setFormData] = useState({
    role: 'aluno' as Role, // O cargo vem primeiro agora
    nome: '',
    email: '',
    senha: '',
    // Campos de Aluno
    ra: '',
    nome_responsavel: '',
    telefone_responsavel: '',
    email_responsavel: '',
    senha_responsavel: '',
    turma: SERIES_DISPONIVEIS[0],
    observacao: '',
    // Campos de Professor
    materia: MATERIAS_DISPONIVEIS[0],
    turmas_professor: [] as string[],
    formacao_professor: ''
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        const profs = data as ExtendedProfile[];
        
        // Buscar RAs dos alunos
        const { data: alunosData } = await supabase.from('alunos').select('id, ra, turma, responsavel_id');
        const alunosMap = new Map(alunosData?.map(a => [a.id, a]) || []);
        
        // Buscar dados dos responsáveis
        const { data: respData } = await supabase.from('responsaveis').select('id, ra_aluno, telefone');
        const respMap = new Map(respData?.map(r => [r.id, r]) || []);

        // Buscar dados dos professores
        const { data: profData } = await supabase.from('professores').select('id, materia, turmas, formacao');
        const profMap = new Map(profData?.map(p => [p.id, p]) || []);

        // Preencher detalhes extras
        const enriched = profs.map(p => {
          if (p.role === 'aluno') {
             const aData = alunosMap.get(p.id);
             if (aData) {
               p.ra = aData.ra;
               p.turma = aData.turma;
               p.responsavel_id = aData.responsavel_id;
             }
          } else if (p.role === 'responsavel') {
             const rData = respMap.get(p.id);
             if (rData) {
               p.ra_aluno = rData.ra_aluno;
               p.telefone = rData.telefone;
             }
          } else if (p.role === 'professor') {
             const pData = profMap.get(p.id);
             if (pData) {
               p.materia = pData.materia;
               p.turmas = pData.turmas;
               p.formacao = pData.formacao;
             }
          }
          return p;
        });

        setProfiles(enriched);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (formData.role === 'professor' && formData.turmas_professor.length === 0) {
        throw new Error("Selecione pelo menos uma turma para o professor.");
      }

      // 1. Instância secundária com chave PÚBLICA para criar usuário sem deslogar o admin
      const supabaseUrl = 'https://yddhqyhnalqugonyjxee.supabase.co';
      const supabaseAnonKey = 'sb_publishable_45YkNjdoQyTHWFvUkebh3g_5DK001n_';
      
      const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          storageKey: 'admin-temp-key'
        }
      });

      // 2. Cria o usuário no cofre (auth.users)
      const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
        email: formData.email,
        password: formData.senha,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Falha ao gerar ID do usuário");

      const newUserId = authData.user.id;

      // 3. Insere na tabela 'profiles' (O Crachá)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: newUserId,
          nome: formData.nome,
          email: formData.email,
          role: formData.role
        }]);

      if (profileError) throw new Error("Erro ao salvar perfil: " + profileError.message);

      // 4. Insere nas tabelas especializadas com base na Role
      if (['admin', 'diretor', 'vice_diretor', 'secretaria'].includes(formData.role)) {
        const { error: gErr } = await supabase.from('gestores').insert([{ id: newUserId }]);
        if (gErr) throw new Error("Erro ao salvar em gestores: " + gErr.message);
      
      } else if (formData.role === 'professor') {
        const { error: pErr } = await supabase.from('professores').insert([{ 
          id: newUserId,
          materia: formData.materia,
          turmas: formData.turmas_professor,
          formacao: formData.formacao_professor
        }]);
        if (pErr) {
          throw new Error(`Erro ao salvar professor: ${pErr.message}`);
        }
      
      } else if (formData.role === 'aluno') {
        let responsavelId = null;
        if (formData.nome_responsavel) {
          // Sempre cria o responsável, gerando e-mail falso se não fornecido
          const emailResp = formData.email_responsavel || `resp_${Date.now()}@escola.local`;
          const senhaResp = formData.senha_responsavel || `senha-${Date.now()}`;
          
          const { data: respAuth, error: respAuthErr } = await tempAuthClient.auth.signUp({
            email: emailResp,
            password: senhaResp,
          });
          if (respAuthErr) {
             throw new Error("Erro ao criar login do Responsável: " + respAuthErr.message);
          } else if (respAuth.user) {
             responsavelId = respAuth.user.id;
             const { error: profErr } = await supabase.from('profiles').insert([{
                id: responsavelId,
                nome: formData.nome_responsavel || 'Responsável',
                email: emailResp,
                role: 'responsavel'
             }]);
             if (profErr) throw new Error("Erro ao salvar perfil do Responsável: " + profErr.message);

             const { error: rErr } = await supabase.from('responsaveis').insert([{ 
                id: responsavelId,
                telefone: formData.telefone_responsavel,
                email: emailResp,
                ra_aluno: formData.ra
             }]);
             if (rErr) {
                 throw new Error(`Erro ao salvar na tabela de Responsáveis: ${rErr.message}`);
             }
          }
        }

        const { error: aErr } = await supabase.from('alunos').insert([{ 
          id: newUserId,
          ra: formData.ra,
          nome_responsavel: formData.nome_responsavel,
          responsavel_id: responsavelId,
          turma: formData.turma,
          observacao: formData.observacao
        }]);
        if (aErr) {
             throw new Error(`Erro ao salvar aluno: ${aErr.message}`);
        }

        // Criar espaço em branco nas notas e faltas para o aluno (Linha única por aluno com JSON consolidado)
        const boletimInicial: Record<string, any> = {};
        const faltasIniciais: Record<string, any> = {};

        for (const materia of MATERIAS_DISPONIVEIS) {
          boletimInicial[materia] = { b1: null, b2: null, b3: null, b4: null };
          faltasIniciais[materia] = { b1: 0, b2: 0, b3: 0, b4: 0 };
        }

        const { error: notasErr } = await supabase.from('notas').insert([{
          matricula_id: newUserId,
          boletim: boletimInicial,
          nome_aluno: formData.nome,
          ra_aluno: formData.ra
        }]);

        if (notasErr) {
          console.error("Erro ao gerar boletim em branco:", notasErr);
        }

        const { error: faltasErr } = await supabase.from('faltas').insert([{
          matricula_id: newUserId,
          registro_faltas: faltasIniciais,
          nome_aluno: formData.nome,
          ra_aluno: formData.ra
        }]);

        if (faltasErr) {
          console.error("Erro ao gerar faltas em branco:", faltasErr);
        }

        const { error: anotacoesErr } = await supabase.from('anotacoes').insert([{
          aluno_id: newUserId,
          autor_id: user.id, // Admin id
          texto: { anotacoes: {} },
          nome_aluno: formData.nome,
          ra_aluno: formData.ra
        }]);

        if (anotacoesErr) {
          console.error("Erro ao gerar anotações em branco:", anotacoesErr);
        }
      
      } else if (formData.role === 'responsavel') {
        const { error: rErr } = await supabase.from('responsaveis').insert([{ 
          id: newUserId,
          email: formData.email,
          telefone: formData.telefone_responsavel,
          ra_aluno: formData.ra
        }]);
        if (rErr) throw new Error("Erro ao salvar responsável: " + rErr.message);
      }

      // Sucesso
      setIsModalOpen(false);
      setFormData({ 
        role: 'aluno', nome: '', email: '', senha: '', ra: '', nome_responsavel: '', telefone_responsavel: '', email_responsavel: '', senha_responsavel: '',
        turma: SERIES_DISPONIVEIS[0], observacao: '', materia: MATERIAS_DISPONIVEIS[0], turmas_professor: [] 
      });
      fetchProfiles();

    } catch (error: any) {
      setFormError(error.message || "Ocorreu um erro ao criar o usuário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTurmaToggle = (turma: string) => {
    setFormData(prev => ({
      ...prev,
      turmas_professor: prev.turmas_professor.includes(turma)
        ? prev.turmas_professor.filter(t => t !== turma)
        : [...prev.turmas_professor, turma]
    }));
  };

  const filteredProfiles = profiles.filter(p => {
    // Na Gestão de Perfis, ocultamos alunos e responsáveis (eles vão para Gestão de Turmas)
    if (activeTab === 'usuarios' && (p.role === 'aluno' || p.role === 'responsavel')) {
      return false;
    }
    
    return p.nome.toLowerCase().includes(search.toLowerCase()) || 
           p.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Portal de Gestão</h1>
          </div>
          <button onClick={onLogout} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'usuarios' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900 hover:bg-gray-100'}`}>
              <Users className={`w-5 h-5 mr-3 ${activeTab === 'usuarios' ? 'text-indigo-700' : 'text-gray-400'}`} />
              Usuários e Perfis
            </button>
            <div className="space-y-1">
              <button onClick={() => setActiveTab('turmas')} className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'turmas' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900 hover:bg-gray-100'}`}>
                <BookOpen className={`w-5 h-5 mr-3 ${activeTab === 'turmas' ? 'text-indigo-700' : 'text-gray-400'}`} />
                Gestão de Turmas
              </button>
              {activeTab === 'turmas' && (
                <div className="pl-11 space-y-1 mt-1">
                  <button onClick={() => setTurmasSubTab('alunos')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${turmasSubTab === 'alunos' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                    Alunos e Responsáveis
                  </button>
                  <button onClick={() => setTurmasSubTab('professores')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${turmasSubTab === 'professores' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                    Corpo Docente
                  </button>
                </div>
              )}
            </div>
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab === 'usuarios' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
              <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input type="text" placeholder="Buscar usuários..." value={search} onChange={(e) => setSearch(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <Plus className="w-4 h-4 mr-2" /> Novo Usuário
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil (Role)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProfiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <UserCircle className="h-6 w-6 text-indigo-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{profile.nome}</div>
                                <div className="text-sm text-gray-500">{profile.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {ROLE_LABELS[profile.role]}
                              </span>
                              <span className={"px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full " + (profile.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                                {profile.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {profile.role === 'aluno' && (
                               <div className="text-sm text-gray-900">RA: <span className="font-medium">{profile.ra || 'N/A'}</span></div>
                            )}
                            {profile.role === 'responsavel' && (
                               <div className="text-sm text-gray-900">
                                 RA do Aluno: <span className="font-medium">{profile.ra_aluno || 'N/A'}</span>
                                 {profile.telefone && <div className="text-xs text-gray-500">Tel: {profile.telefone}</div>}
                               </div>
                            )}
                            {profile.role !== 'aluno' && profile.role !== 'responsavel' && <span className="text-sm text-gray-400">-</span>}
                          </td>
  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
    <button onClick={() => toggleUserActive(profile)} className="text-gray-400 hover:text-gray-600 transition-colors mr-3" title={profile.ativo ? 'Inativar Usuário' : 'Ativar Usuário'}>
      <CheckSquare className={"w-5 h-5 " + (profile.ativo ? 'text-green-500' : 'text-gray-400')} />
    </button>
    <button onClick={() => openEditModal(profile)} className="text-indigo-600 hover:text-indigo-900 transition-colors">
      <Edit className="w-5 h-5" />
    </button>
  </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === 'turmas' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
              <div className="p-6 border-b border-gray-200 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {turmasSubTab === 'alunos' ? 'Alunos e Responsáveis' : 'Corpo Docente'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {turmasSubTab === 'alunos' 
                        ? 'Gestão dos estudantes organizados por turma.' 
                        : 'Acompanhe os professores e suas disciplinas.'}
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                ) : (
                  <>
                    {turmasSubTab === 'alunos' ? (
                      selectedTurma === null ? (
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {SERIES_DISPONIVEIS.map(turma => {
                             const alunosNaTurma = profiles.filter(p => p.role === 'aluno' && p.turma === turma && (p.nome.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())));
                             if (search && alunosNaTurma.length === 0) return null; // Hide empty classes when searching
                             
                             return (
                               <div key={turma} onClick={() => setSelectedTurma(turma)} className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all text-center">
                                 <h3 className="text-2xl font-bold text-gray-900">{turma}</h3>
                                 <p className="text-sm text-gray-500 mt-2">{alunosNaTurma.length} {alunosNaTurma.length === 1 ? 'aluno' : 'alunos'}</p>
                               </div>
                             );
                          })}
                        </div>
                      ) : (
                        <div className="p-6">
                          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <button onClick={() => { setSelectedTurma(null); setExpandedAlunoId(null); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                &larr; Voltar para salas
                              </button>
                              <h3 className="text-xl font-bold text-gray-900">Turma {selectedTurma}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                               <button onClick={() => openAviso({type: 'turma', turma: selectedTurma})} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors shadow-sm">
                                 <Bell className="w-4 h-4 mr-2" />
                                 Aviso para Turma
                               </button>
                               <button onClick={() => openHistorico({type: 'turma', turma: selectedTurma})} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm">
                                 <History className="w-4 h-4 mr-2 text-gray-500" />
                                 Histórico da Turma
                               </button>
                            </div>
                          </div>
                          <div className="space-y-4">
                            {profiles
                              .filter(p => p.role === 'aluno' && p.turma === selectedTurma && (p.nome.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())))
                              .map(aluno => (
                                 <div key={aluno.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                   <div 
                                     className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                     onClick={() => setExpandedAlunoId(expandedAlunoId === aluno.id ? null : aluno.id)}
                                   >
                                     <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                         <UserCircle className="w-6 h-6 text-indigo-600" />
                                       </div>
                                       <div>
                                         <h4 className="font-semibold text-gray-900">{aluno.nome}</h4>
                                         <p className="text-sm text-gray-500">RA: {aluno.ra || 'Não informado'}</p>
                                       </div>
                                     </div>
                                     <button className="text-sm text-indigo-600 font-medium px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                       {expandedAlunoId === aluno.id ? 'Ocultar Responsável' : 'Ver Responsável'}
                                     </button>
                                   </div>
                                   
                                   {expandedAlunoId === aluno.id && (
                                     <div className="p-5 bg-gray-50 border-t border-gray-200">
                                       {(() => {
                                          const resp = profiles.find(p => p.role === 'responsavel' && p.id === aluno.responsavel_id);
                                          if (!resp) return <p className="text-sm text-gray-500 flex items-center gap-2">Nenhum responsável vinculado no momento.</p>;
                                          return (
                                            <div className="flex items-start gap-4">
                                               <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                 <UserCircle className="w-6 h-6 text-blue-600" />
                                               </div>
                                               <div>
                                                 <h5 className="font-semibold text-gray-900 text-base flex items-center">{resp.nome} <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full ml-3 uppercase tracking-wide">Responsável</span></h5>
                                                 <div className="mt-2 space-y-1">
                                                   <p className="text-sm text-gray-600"><strong>Email:</strong> {resp.email}</p>
                                                   {resp.telefone && <p className="text-sm text-gray-600"><strong>Telefone:</strong> {resp.telefone}</p>}
                                                 </div>
                                               </div>
                                            </div>
                                          );
                                       })()}
                                       
                                       <div className="mt-5 pt-5 border-t border-gray-200 flex flex-wrap gap-3">
                                         <button onClick={() => openBoletim(aluno)} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-sm">
                                           <FileText className="w-4 h-4 mr-2" />
                                           Boletim e Notas
                                         </button>
                                         <button onClick={() => openAviso({type: 'aluno', aluno})} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors shadow-sm">
                                           <Bell className="w-4 h-4 mr-2" />
                                           Enviar Aviso
                                         </button>
                                         <button onClick={() => openHistorico({type: 'aluno', aluno})} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm">
                                           <History className="w-4 h-4 mr-2" />
                                           Histórico de Avisos
                                         </button>
                                         <button onClick={() => openEditModal(aluno)} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm">
                                           <Edit className="w-4 h-4 mr-2 text-gray-500" />
                                           Editar Dados
                                         </button>
                                       </div>
                                     </div>
                                   )}
                                 </div>
                              ))}
                              
                              {profiles.filter(p => p.role === 'aluno' && p.turma === selectedTurma).length === 0 && (
                                <div className="text-center py-10">
                                  <p className="text-gray-500">Nenhum aluno encontrado nesta turma.</p>
                                </div>
                              )}
                          </div>
                        </div>
                      )
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil (Role)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {profiles.filter(p => {
                            if (p.role !== 'professor') return false;
                            return p.nome.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
                          }).map((profile) => (
                            <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <UserCircle className="h-6 w-6 text-indigo-600" />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{profile.nome}</div>
                                    <div className="text-sm text-gray-500">{profile.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {ROLE_LABELS[profile.role]}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {profile.role === 'professor' && (
                                   <div className="text-sm text-gray-900">
                                     Matéria: <span className="font-medium">{profile.materia || 'N/A'}</span>
                                     {profile.formacao && <div className="text-xs text-gray-500 mt-1">Formação: {profile.formacao}</div>}
                                     {profile.formacao && <div className="text-xs text-gray-500 mt-1">Formação: {profile.formacao}</div>}
                                     {profile.turmas && <div className="text-xs text-gray-500 mt-1">Turmas: {profile.turmas.join(', ')}</div>}
                                   </div>
                                )}
                              </td>
  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
    <button onClick={() => toggleUserActive(profile)} className="text-gray-400 hover:text-gray-600 transition-colors mr-3" title={profile.ativo ? 'Inativar Usuário' : 'Ativar Usuário'}>
      <CheckSquare className={"w-5 h-5 " + (profile.ativo ? 'text-green-500' : 'text-gray-400')} />
    </button>
    <button onClick={() => openEditModal(profile)} className="text-indigo-600 hover:text-indigo-900 transition-colors">
      <Edit className="w-5 h-5" />
    </button>
  </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AVISO MODAL */}
      {isAvisoModalOpen && avisoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSendingAviso && setIsAvisoModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Enviar Aviso Escolar</h3>
                <p className="text-sm text-gray-500">Para: {avisoTarget.type === 'aluno' ? avisoTarget.aluno.nome : `Toda a Turma ${avisoTarget.turma}`}</p>
              </div>
              <button onClick={() => setIsAvisoModalOpen(false)} disabled={isSendingAviso} className="text-gray-400 hover:text-gray-500 disabled:opacity-50">
                <span className="sr-only">Fechar</span>
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 bg-white">
              {avisoSuccess ? (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Aviso enviado com sucesso!</h3>
                  <p className="text-sm text-gray-500 mt-2">O aviso foi encaminhado para os destinatários selecionados.</p>
                </div>
              ) : (
                <form onSubmit={handleSendAviso} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destinatário(s)</label>
                    <select 
                      value={avisoData.enviarPara} 
                      onChange={e => setAvisoData({...avisoData, enviarPara: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      <option value="ambos">Aluno e Responsável</option>
                      <option value="responsavel">Apenas Responsável</option>
                      <option value="aluno">Apenas Aluno</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assunto / Título</label>
                    <input 
                      type="text" 
                      required
                      value={avisoData.titulo}
                      onChange={e => setAvisoData({...avisoData, titulo: e.target.value})}
                      placeholder="Ex: Reunião de Pais, Material Escolar..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                    <textarea 
                      required
                      rows={4}
                      value={avisoData.mensagem}
                      onChange={e => setAvisoData({...avisoData, mensagem: e.target.value})}
                      placeholder="Escreva os detalhes do aviso..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                    ></textarea>
                  </div>
                  <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsAvisoModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={isSendingAviso || !avisoData.titulo || !avisoData.mensagem} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]">
                      {isSendingAviso ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Aviso'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOLETIM MODAL */}
      {isBoletimModalOpen && selectedAlunoBoletim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsBoletimModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Boletim: {selectedAlunoBoletim.nome}</h3>
                <p className="text-sm text-gray-500">RA: {selectedAlunoBoletim.ra || 'N/A'} - Turma {selectedAlunoBoletim.turma}</p>
              </div>
              <button onClick={() => setIsBoletimModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Fechar</span>
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="overflow-y-auto p-6 bg-white">
              {loadingBoletim ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disciplina</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">1º Bim</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">2º Bim</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">3º Bim</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">4º Bim</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Média</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {MATERIAS_DISPONIVEIS.map(materia => {
                         const notas = boletimData?.[materia] || { b1: null, b2: null, b3: null, b4: null };
                         const valores = [notas.b1, notas.b2, notas.b3, notas.b4].filter(n => n !== null) as number[];
                         const media = valores.length > 0 ? (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1) : '-';
                         
                         return (
                           <tr key={materia} className="hover:bg-gray-50">
                             <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{materia}</td>
                             <td className="px-4 py-3 text-sm text-gray-500 text-center">{notas.b1 !== null ? notas.b1 : '-'}</td>
                             <td className="px-4 py-3 text-sm text-gray-500 text-center">{notas.b2 !== null ? notas.b2 : '-'}</td>
                             <td className="px-4 py-3 text-sm text-gray-500 text-center">{notas.b3 !== null ? notas.b3 : '-'}</td>
                             <td className="px-4 py-3 text-sm text-gray-500 text-center">{notas.b4 !== null ? notas.b4 : '-'}</td>
                             <td className="px-4 py-3 text-sm font-bold text-gray-900 text-center">{media}</td>
                           </tr>
                         )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setIsBoletimModalOpen(false)} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORICO AVISOS MODAL */}
      {isHistoricoModalOpen && historicoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsHistoricoModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Histórico de Avisos</h3>
                <p className="text-sm text-gray-500">
                  {historicoTarget.type === 'aluno' ? `Aluno: ${historicoTarget.aluno.nome}` : `Turma: ${historicoTarget.turma}`}
                </p>
              </div>
              <button onClick={() => setIsHistoricoModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Fechar</span>
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 bg-white overflow-y-auto">
              {isHistoricoLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (() => {
                if (avisosHistorico.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                        <History className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-base font-medium text-gray-900">Nenhum aviso encontrado</h3>
                      <p className="text-sm text-gray-500 mt-1">Não há histórico de avisos enviados para este destinatário.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {avisosHistorico.map(aviso => (
                      <div key={aviso.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{aviso.titulo}</h4>
                          <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(aviso.data).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{aviso.mensagem}</p>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">Destinatários:</span>
                          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {aviso.enviarPara === 'ambos' ? 'Alunos e Responsáveis' : aviso.enviarPara === 'responsavel' ? 'Apenas Responsáveis' : 'Apenas Alunos'}
                          </span>
                          {aviso.turma && !aviso.alunoId && (
                            <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                              Toda a Turma {aviso.turma}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      
      {/* MODAL DE EDIÇÃO */}
      {isEditModalOpen && editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">Editar Usuário</h3>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleUpdateUser} className="space-y-5">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Login (Apenas Leitura)</label>
                    <input type="email" disabled value={formData.email} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
                  </div>
                </div>

                {editingProfile.role === 'aluno' && (
                  <div className="space-y-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-900">Dados Acadêmicos do Aluno</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">RA</label>
                        <input type="text" required value={formData.ra} onChange={(e) => setFormData({...formData, ra: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Turma (ex: 5-A)</label>
                        <select required value={formData.turma} onChange={(e) => setFormData({...formData, turma: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                          <option value="">Selecione...</option>
                          {SERIES_DISPONIVEIS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {editingProfile.role === 'responsavel' && (
                  <div className="space-y-4 bg-purple-50/30 p-4 rounded-lg border border-purple-100">
                    <h4 className="text-sm font-semibold text-purple-900">Dados do Responsável</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                        <input type="text" required value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">RA do Aluno Vinculado</label>
                        <input type="text" required value={formData.ra_aluno} onChange={(e) => setFormData({...formData, ra_aluno: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {editingProfile.role === 'professor' && (
                  <div className="space-y-4 bg-teal-50/30 p-4 rounded-lg border border-teal-100">
                    <h4 className="text-sm font-semibold text-teal-900">Dados do Professor</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Formação Acadêmica</label>
                      <input type="text" value={formData.formacao_professor} onChange={(e) => setFormData({...formData, formacao_professor: e.target.value})} placeholder="Ex: Licenciatura em Matemática" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Disciplina / Matéria</label>
                      <select required value={formData.materia_professor} onChange={(e) => setFormData({...formData, materia_professor: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                        <option value="">Selecione...</option>
                        {MATERIAS_DISPONIVEIS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Turmas em que leciona (Selecione pelo menos uma)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">
                        {SERIES_DISPONIVEIS.map((turma) => (
                          <label key={turma} onClick={() => handleTurmaToggle(turma)} className={`flex items-center p-2 rounded cursor-pointer border ${formData.turmas_professor.includes(turma) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50 border-transparent'}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${formData.turmas_professor.includes(turma) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                              {formData.turmas_professor.includes(turma) && <CheckSquare className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-xs font-medium text-gray-700">{turma}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isUpdatingUser} className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 min-w-[140px]">
                    {isUpdatingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isUpdatingUser ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

{/* MODAL CAMALEÃO (Dinâmico) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">Cadastrar Novo Usuário</h3>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form id="createUserForm" onSubmit={handleCreateUser} className="space-y-5">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {formError}
                  </div>
                )}

                {/* 1. A ESCOLHA DO CARGO VEM PRIMEIRO */}
                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                  <label className="block text-sm font-bold text-indigo-900 mb-2">1. Selecione o Cargo no Sistema</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-900 shadow-sm"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <hr className="border-gray-100" />

                {/* 2. DADOS OBRIGATÓRIOS (Para todos os perfis) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Login</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha (Mín. 6 letras)</label>
                    <input type="password" required minLength={6} value={formData.senha} onChange={(e) => setFormData({...formData, senha: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                {/* 3. DADOS ESPECÍFICOS: ALUNO */}
                {formData.role === 'aluno' && (
                  <div className="space-y-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-900 flex items-center"><GraduationCap className="w-4 h-4 mr-2"/> Dados Acadêmicos do Aluno</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">RA (Registro Acadêmico)</label>
                        <input type="text" required value={formData.ra} onChange={(e) => setFormData({...formData, ra: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Turma Atual</label>
                        <select value={formData.turma} onChange={(e) => setFormData({...formData, turma: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                          {SERIES_DISPONIVEIS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <h4 className="text-sm font-semibold text-blue-900 flex items-center mt-4 border-b border-blue-200 pb-2 mb-4">Dados do Responsável</h4>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Responsável</label>
                        <input type="text" required value={formData.nome_responsavel} onChange={(e) => setFormData({...formData, nome_responsavel: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Telefone do Responsável (Opcional)</label>
                        <input type="tel" value={formData.telefone_responsavel} onChange={(e) => setFormData({...formData, telefone_responsavel: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="(11) 99999-9999" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email do Responsável (Opcional)</label>
                        <input type="email" value={formData.email_responsavel} onChange={(e) => setFormData({...formData, email_responsavel: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Para criar login" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Senha do Responsável (Opcional)</label>
                        <input type="password" value={formData.senha_responsavel} onChange={(e) => setFormData({...formData, senha_responsavel: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Mínimo 6 caracteres" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1 mt-2">Observações (Opcional)</label>
                        <textarea rows={2} value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"></textarea>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DADOS ESPECÍFICOS: PROFESSOR */}
                {formData.role === 'professor' && (
                  <div className="space-y-4 bg-purple-50/30 p-4 rounded-lg border border-purple-100">
                    <h4 className="text-sm font-semibold text-purple-900 flex items-center"><BookOpen className="w-4 h-4 mr-2"/> Disciplina e Enturmação</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Formação Acadêmica</label>
                      <input type="text" value={formData.formacao_professor} onChange={(e) => setFormData({...formData, formacao_professor: e.target.value})} placeholder="Ex: Licenciatura em Matemática" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Matéria Principal</label>
                      <select value={formData.materia} onChange={(e) => setFormData({...formData, materia: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                        {MATERIAS_DISPONIVEIS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Turmas em que leciona (Selecione pelo menos uma)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">
                        {SERIES_DISPONIVEIS.map((turma) => (
                          <label key={turma} onClick={() => handleTurmaToggle(turma)} className={`flex items-center p-2 rounded cursor-pointer border ${formData.turmas_professor.includes(turma) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50 border-transparent'}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${formData.turmas_professor.includes(turma) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                              {formData.turmas_professor.includes(turma) && <CheckSquare className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-xs font-medium text-gray-700">{turma}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" form="createUserForm" disabled={isSubmitting} className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isSubmitting ? 'Salvando...' : 'Salvar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
