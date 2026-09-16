import { LogOut } from 'lucide-react';
import { AdminPanel } from './AdminPanel';
import { ProfessorPanel } from './ProfessorPanel';
import { AlunoPanel } from './AlunoPanel';
import { useAuth } from '../contexts/AuthContext';
import type { AuthUser } from '../types';

interface DashboardProps {
  user: AuthUser;
}

export function Dashboard({ user }: DashboardProps) {
  const { logout } = useAuth();

  if (user.role === 'admin' || user.role === 'diretor' || user.role === 'vice_diretor' || user.role === 'secretaria') {
    return <AdminPanel user={user} onLogout={logout} />;
  }
  if (user.role === 'professor') {
    return <ProfessorPanel user={user} onLogout={logout} />;
  }
  if (user.role === 'aluno' || user.role === 'responsavel') {
    return <AlunoPanel user={user} onLogout={logout} role={user.role} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Perfil não reconhecido</h2>
        <button onClick={logout} className="flex items-center justify-center w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </button>
      </div>
    </div>
  );
}
