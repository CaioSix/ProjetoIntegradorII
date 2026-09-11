import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Loader2, LogOut } from 'lucide-react';
import { AdminPanel } from './AdminPanel';
import { ProfessorPanel } from './ProfessorPanel';
import { AlunoPanel } from './AlunoPanel';
import type { Role } from '../types';

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setRole(data.role as Role);
        } else {
          setError("Perfil não encontrado. Você precisa cadastrar sua conta como Administrador no banco de dados.");
        }
      } catch (err: any) {
        console.error("Erro ao buscar perfil:", err);
        setError("Não foi possível carregar o seu perfil. " + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRole();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <span className="font-medium">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-100">
          <div className="text-red-600 mb-6 font-medium bg-red-50 p-4 rounded-lg">{error}</div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" /> Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  // Roteador Inteligente
  if (role === 'admin' || role === 'diretor' || role === 'vice_diretor' || role === 'secretaria') {
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }
  if (role === 'professor') {
    return <ProfessorPanel user={user} onLogout={handleLogout} />;
  }
  if (role === 'aluno' || role === 'responsavel') {
    return <AlunoPanel user={user} onLogout={handleLogout} role={role} />;
  }

  // Fallback caso a role seja desconhecida
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Perfil não reconhecido</h2>
        <button onClick={handleLogout} className="flex items-center justify-center w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </button>
      </div>
    </div>
  );
}
