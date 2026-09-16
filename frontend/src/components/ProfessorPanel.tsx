import React from 'react';
import type { AuthUser } from '../types';
import { LogOut } from 'lucide-react';

interface Props {
  user: AuthUser;
  onLogout: () => void;
}

export function ProfessorPanel({ user, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Portal do Professor</h1>
          <button onClick={onLogout} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Minhas Salas</h2>
          <p className="mt-2 text-sm text-gray-600">O módulo de lançamento de notas e faltas será construído aqui.</p>
        </div>
      </main>
    </div>
  );
}
