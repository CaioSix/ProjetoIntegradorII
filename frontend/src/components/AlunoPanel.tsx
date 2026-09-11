import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LogOut, Loader2, BookOpen, Clock, MessageSquare, Send, ChevronDown, ChevronUp, UserCog, Edit2, Save, X, ClipboardList, CheckCircle, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MATERIAS_DISPONIVEIS } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
  role: string;
}

export function AlunoPanel({ user, onLogout, role }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alunoData, setAlunoData] = useState<{ nome: string; ra: string; id: string } | null>(null);
  
  const [responsavelData, setResponsavelData] = useState<{ nome: string; email: string; telefone: string; ra_aluno: string } | null>(null);
  const [editModo, setEditModo] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [savingDados, setSavingDados] = useState(false);

  const [notasData, setNotasData] = useState<Record<string, any> | null>(null);
  const [faltasData, setFaltasData] = useState<Record<string, any> | null>(null);
  const [anotacoesData, setAnotacoesData] = useState<Record<string, any>>({});
  const [avisosList, setAvisosList] = useState<any[]>([]);
  const [atividadesData, setAtividadesData] = useState<Record<string, any>>({});
  const [respostasEdit, setRespostasEdit] = useState<Record<string, string>>({});
  const [savingResposta, setSavingResposta] = useState<string | null>(null);
  const [anotacoesRowId, setAnotacoesRowId] = useState<string | null>(null);
  const [isBoletimOpen, setIsBoletimOpen] = useState(false);
  const [isMeusDadosOpen, setIsMeusDadosOpen] = useState(false);
  const [isAtividadesOpen, setIsAtividadesOpen] = useState(true);
  const [isAvisosOpen, setIsAvisosOpen] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let alunoId = user.id;
        let raToSearch = null;

        if (role === 'responsavel') {
          const { data: respData, error: respErr } = await supabase
            .from('responsaveis')
            .select('ra_aluno')
            .eq('id', user.id)
            .maybeSingle();

          if (respErr) throw new Error("Erro ao carregar dados do responsável: " + respErr.message);
          
          if (!respData) {
             throw new Error("Perfil de responsável não encontrado no banco de dados. Isso geralmente acontece se você esqueceu de rodar os comandos de permissão (RLS) no SQL Editor.");
          }

          raToSearch = respData.ra_aluno;
          
          if (!raToSearch) {
             throw new Error("O seu cadastro de Responsável não possui nenhum RA de aluno vinculado. Peça ao Administrador para atualizar o seu cadastro.");
          }

          const { data: alData, error: alErr } = await supabase
            .from('alunos')
            .select('id, ra')
            .eq('ra', raToSearch)
            .maybeSingle();
            
          if (alErr) throw new Error("Erro ao buscar dados do aluno: " + alErr.message);
          
          alunoId = alData.id;
          
          const { data: pData, error: pErr } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', alunoId)
            .maybeSingle();
            
          setAlunoData({ 
             nome: pData?.nome || 'Aluno não encontrado', 
             ra: alData.ra,
             id: alunoId
          });

          // Busca os dados do próprio responsável para exibição/edição
          const { data: pRespData } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', user.id)
            .maybeSingle();

          const { data: rRespData } = await supabase
            .from('responsaveis')
            .select('email, telefone')
            .eq('id', user.id)
            .maybeSingle();

          setResponsavelData({
            nome: pRespData?.nome || 'Responsável',
            email: rRespData?.email || '',
            telefone: rRespData?.telefone || '',
            ra_aluno: raToSearch
          });

        } else {
           const { data: alData, error: alErr } = await supabase
            .from('alunos')
            .select('ra')
            .eq('id', user.id)
            .maybeSingle();
            
           const { data: pData, error: pErr } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', user.id)
            .maybeSingle();

           setAlunoData({
              nome: pData?.nome || 'Não definido',
              ra: alData?.ra || 'Não definido',
              id: user.id
           });
        }

        if (alunoId) {
            const { data: nData, error: nErr } = await supabase
              .from('notas')
              .select('boletim')
              .eq('matricula_id', alunoId)
              .maybeSingle();
              
            if (!nErr && nData) {
               setNotasData(nData.boletim);
            }

            const { data: fData, error: fErr } = await supabase
              .from('faltas')
              .select('registro_faltas')
              .eq('matricula_id', alunoId)
              .maybeSingle();
              
            if (!fErr && fData) {
               setFaltasData(fData.registro_faltas);
            }

            // Fetch Anotacoes e Avisos
            const { data: aDataList, error: aErr } = await supabase
              .from('anotacoes')
              .select('id, texto, created_at')
              .eq('aluno_id', alunoId)
              .order('created_at', { ascending: false });

            if (!aErr && aDataList) {
               let foundAnotacoes = false;
               const avisos: any[] = [];
               
               aDataList.forEach(row => {
                 const texto = row.texto as any;
                 if (texto && (texto.tipo === 'aviso' || texto.tipo === 'aviso_turma')) {
                   avisos.push({
                     id: row.id,
                     created_at: row.created_at,
                     ...texto
                   });
                 } else if (texto && texto.anotacoes && !foundAnotacoes) {
                   setAnotacoesRowId(row.id);
                   setAnotacoesData(texto.anotacoes);
                   const edits: Record<string, string> = {};
                   Object.keys(texto.anotacoes).forEach(key => {
                     edits[key] = texto.anotacoes[key].resposta || '';
                   });
                   setRespostasEdit(edits);
                   foundAnotacoes = true;
                 }
               });
               
               setAvisosList(avisos);
            }

            // Fetch Atividades
            const { data: ativData, error: ativErr } = await supabase
              .from('atividades')
              .select('id, dados')
              .eq('aluno_id', alunoId)
              .maybeSingle();

            if (!ativErr && ativData) {
               setAtividadesData(ativData.dados?.tarefas || {});
            }
        }

      } catch (err: any) {
        console.error("Erro no painel:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user.id, role]);

  const handleSaveResposta = async (anotacaoKey: string) => {
     if (!anotacoesRowId) return;

     setSavingResposta(anotacaoKey);
     try {
       const updatedAnotacoes = { ...anotacoesData };
       if (updatedAnotacoes[anotacaoKey]) {
          updatedAnotacoes[anotacaoKey].resposta = respostasEdit[anotacaoKey] || '';
       }

       const payload = { anotacoes: updatedAnotacoes };

       const { error } = await supabase
          .from('anotacoes')
          .update({ texto: payload })
          .eq('id', anotacoesRowId);

       if (error) throw error;
       
       setAnotacoesData(updatedAnotacoes);
       alert("Resposta enviada com sucesso!");
     } catch (err: any) {
       console.error(err);
       alert("Erro ao enviar resposta: " + err.message);
     } finally {
       setSavingResposta(null);
     }
  };

  const handleSaveDados = async () => {
    setSavingDados(true);
    try {
      const { error: rErr } = await supabase.from('responsaveis').update({
        email: editEmail,
        telefone: editTelefone
      }).eq('id', user.id);
      if (rErr) throw rErr;

      const { error: pErr } = await supabase.from('profiles').update({
        email: editEmail
      }).eq('id', user.id);
      if (pErr) throw pErr;

      setResponsavelData(prev => prev ? { ...prev, email: editEmail, telefone: editTelefone } : null);
      setEditModo(false);
      alert("Seus dados foram atualizados com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar dados: " + err.message);
    } finally {
      setSavingDados(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {role === 'responsavel' ? 'Portal do Responsável' : 'Meu Desempenho'}
            </h1>
            {alunoData && (
              <p className="text-sm text-gray-500 mt-1">
                Visualizando aluno(a): <span className="font-medium text-gray-900">{alunoData.nome}</span> (RA: {alunoData.ra})
              </p>
            )}
          </div>
          <button onClick={onLogout} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
            <p>Carregando painel...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold text-lg mb-2">Ops! Ocorreu um problema.</h3>
            <p>{error}</p>
          </div>
        ) : (
          <>
          {/* DADOS DO RESPONSÁVEL */}
          {role === 'responsavel' && responsavelData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsMeusDadosOpen(!isMeusDadosOpen)}
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-indigo-600" /> Meus Dados
                  </h2>
                  <p className="text-sm text-gray-500">Mantenha suas informações de contato atualizadas.</p>
                </div>
                <div className="flex items-center gap-4">
                  {isMeusDadosOpen && (
                    !editModo ? (
                      <button onClick={(e) => { e.stopPropagation(); setEditEmail(responsavelData.email); setEditTelefone(responsavelData.telefone); setEditModo(true); }} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors px-4 py-2 hover:bg-indigo-50 rounded-lg">
                        <Edit2 className="w-4 h-4 mr-2" /> Editar Contato
                      </button>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setEditModo(false); }} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-4 h-4 mr-2" /> Cancelar
                      </button>
                    )
                  )}
                  <button className="text-gray-500 p-2 hover:bg-gray-200 rounded-full transition-colors">
                    {isMeusDadosOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {isMeusDadosOpen && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Nome Completo</label>
                      <p className="text-gray-900 font-medium bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{responsavelData.nome}</p>
                      <p className="text-xs text-gray-400 mt-1">O nome não pode ser alterado por aqui.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">RA do Aluno Vinculado</label>
                      <p className="text-gray-900 font-medium bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">{responsavelData.ra_aluno}</p>
                      <p className="text-xs text-gray-400 mt-1">O RA é fixo e vinculado pela escola.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">E-mail de Contato</label>
                      {editModo ? (
                        <input 
                          type="email" 
                          value={editEmail} 
                          onChange={e => setEditEmail(e.target.value)} 
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 font-medium bg-white shadow-sm"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium px-4 py-2 border border-transparent">{responsavelData.email || 'Não informado'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Telefone</label>
                      {editModo ? (
                        <input 
                          type="text" 
                          value={editTelefone} 
                          onChange={e => setEditTelefone(e.target.value)} 
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 font-medium bg-white shadow-sm"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium px-4 py-2 border border-transparent">{responsavelData.telefone || 'Não informado'}</p>
                      )}
                    </div>
                  </div>
                  {editModo && (
                    <div className="mt-6 flex justify-end">
                      <button onClick={handleSaveDados} disabled={savingDados} className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
                        {savingDados ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {savingDados ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AVISOS RECENTES */}
          {avisosList.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
               <div 
                  className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/50 cursor-pointer hover:bg-amber-50 transition-colors"
                  onClick={() => setIsAvisosOpen(!isAvisosOpen)}
               >
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Avisos e Comunicados</h2>
                      <p className="text-sm text-gray-500">Mensagens importantes da coordenação e professores.</p>
                    </div>
                 </div>
                 <button className="text-gray-500 p-2 hover:bg-amber-100 rounded-full transition-colors">
                    {isAvisosOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                 </button>
               </div>
               
               {isAvisosOpen && (
                 <div className="p-6 bg-white space-y-4">
                    {avisosList.filter(a => {
                       // Ocultar avisos que são apenas para responsáveis se o usuário logado for aluno
                       if (role === 'aluno' && a.enviarPara === 'responsavel') return false;
                       return true;
                    }).map(aviso => (
                       <div key={aviso.id} className="border border-amber-100 bg-amber-50/30 rounded-lg p-5">
                          <div className="flex justify-between items-start mb-2">
                             <h4 className="font-semibold text-gray-900">{aviso.titulo}</h4>
                             <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 flex items-center gap-1 shadow-sm">
                               <Clock className="w-3 h-3" />
                               {new Date(aviso.created_at).toLocaleDateString('pt-BR')}
                             </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{aviso.mensagem}</p>
                       </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {/* BOLETIM */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div 
                className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsBoletimOpen(!isBoletimOpen)}
             >
               <div>
                  <h2 className="text-lg font-semibold text-gray-900">Boletim Consolidado</h2>
                  <p className="text-sm text-gray-500">Notas e Faltas referentes aos 4 bimestres.</p>
               </div>
               <button className="text-gray-500 p-2 hover:bg-gray-200 rounded-full transition-colors">
                  {isBoletimOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
               </button>
             </div>
             
             {isBoletimOpen && (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-gray-700">Disciplina</th>
                        <th className="px-4 py-4 text-center font-semibold text-gray-700 border-l border-gray-100">1º Bimestre</th>
                        <th className="px-4 py-4 text-center font-semibold text-gray-700 border-l border-gray-100">2º Bimestre</th>
                        <th className="px-4 py-4 text-center font-semibold text-gray-700 border-l border-gray-100">3º Bimestre</th>
                        <th className="px-4 py-4 text-center font-semibold text-gray-700 border-l border-gray-100">4º Bimestre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {MATERIAS_DISPONIVEIS.map((materia) => (
                        <tr key={materia} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-6 py-4 font-medium text-gray-900">{materia}</td>
                           {[1, 2, 3, 4].map((bim) => {
                              const nota = notasData?.[materia]?.[`b${bim}`];
                              const falta = faltasData?.[materia]?.[`b${bim}`];
                              return (
                                 <td key={bim} className="px-4 py-4 border-l border-gray-100">
                                    <div className="flex flex-col gap-2 items-center">
                                       <div className="flex items-center gap-1.5 text-gray-700 bg-gray-100 px-3 py-1.5 rounded-md min-w-[70px] justify-center">
                                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                          <span className="font-semibold">{nota !== undefined && nota !== null ? nota : '-'}</span>
                                       </div>
                                       <div className="flex items-center gap-1.5 text-gray-500 text-xs bg-gray-50 px-2 py-1 rounded">
                                          <Clock className="w-3 h-3 text-amber-500" />
                                          <span>{falta !== undefined && falta !== null ? falta : 0} Faltas</span>
                                       </div>
                                    </div>
                                 </td>
                              );
                           })}
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             )}
          </div>

          {/* ANOTAÇÕES */}
          {role === 'responsavel' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-600" /> Anotações da Escola
                    </h2>
                    <p className="text-sm text-gray-500">Acompanhe comunicados e responda aos professores.</p>
                 </div>
               </div>
               
               <div className="p-6 divide-y divide-gray-100">
                  {Object.keys(anotacoesData).length === 0 ? (
                     <p className="text-gray-500 text-center py-4">Nenhuma anotação registrada para este aluno.</p>
                  ) : (
                     Object.keys(anotacoesData).map((key) => {
                       const item = anotacoesData[key];
                       return (
                          <div key={key} className="py-6 first:pt-0 last:pb-0 space-y-4">
                             <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                                <h4 className="font-medium text-indigo-900 mb-1 capitalize text-sm">{key.replace('_', ' ')}</h4>
                                <p className="text-gray-800">{item.info}</p>
                             </div>
                             
                             <div className="flex gap-3">
                               <input
                                  type="text"
                                  placeholder="Digite sua resposta..."
                                  value={respostasEdit[key] || ''}
                                  onChange={(e) => setRespostasEdit({ ...respostasEdit, [key]: e.target.value })}
                                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                               />
                               <button 
                                  onClick={() => handleSaveResposta(key)}
                                  disabled={savingResposta === key}
                                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
                               >
                                  {savingResposta === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                  {savingResposta === key ? 'Enviando...' : 'Responder'}
                               </button>
                             </div>

                             {item.resposta && (
                               <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <span className="text-xs font-semibold text-gray-500 uppercase">Resposta:</span>
                                  <p className="text-gray-700 text-sm mt-1">{item.resposta}</p>
                               </div>
                             )}
                          </div>
                       )
                     })
                  )}
               </div>
            </div>
          )}

          {/* ATIVIDADES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div 
                className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsAtividadesOpen(!isAtividadesOpen)}
             >
               <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" /> Minhas Atividades
                  </h2>
                  <p className="text-sm text-gray-500">Acompanhe as tarefas e prazos de entrega.</p>
               </div>
               <button className="text-gray-500 p-2 hover:bg-gray-200 rounded-full transition-colors">
                  {isAtividadesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
               </button>
             </div>
             
             {isAtividadesOpen && (
               <div className="p-6 divide-y divide-gray-100">
                  {Object.keys(atividadesData).length === 0 ? (
                     <p className="text-gray-500 text-center py-4">Nenhuma atividade registrada no momento.</p>
                  ) : (
                     Object.keys(atividadesData).map((key) => {
                        const atividade = atividadesData[key];
                        return (
                        <div key={key} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded uppercase">{atividade.materia}</span>
                                <h4 className="font-semibold text-gray-900">{atividade.titulo}</h4>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{atividade.descricao}</p>
                              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                 <Clock className="w-4 h-4 text-amber-500" /> 
                                 Entrega: <span className="font-medium text-gray-700">{atividade.data_entrega ? new Date(atividade.data_entrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem prazo'}</span>
                              </div>
                           </div>
                           <div>
                              {atividade.status === 'entregue' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-200"><CheckCircle className="w-4 h-4" /> Entregue</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200"><Clock className="w-4 h-4" /> Pendente</span>
                              )}
                           </div>
                        </div>
                     )})
                  )}
               </div>
             )}
          </div>
          </>
        )}
      </main>
    </div>
  );
}
