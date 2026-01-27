import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard';
import { AppState } from './types';
import { Scissors, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LoginScreen } from './components/LoginScreen';

import { UserManagement } from './components/UserManagement';
import { User, X } from 'lucide-react';

const MainApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-8 h-8 border-4 border-esprint-600 rounded-full border-t-transparent"></div></div>;

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-transparent relative">
      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-white/50 shadow-sm transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center cursor-pointer group" onClick={() => setAppState(AppState.LANDING)}>
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="bg-gradient-to-br from-esprint-500 to-esprint-700 p-2 rounded-xl shadow-lg shadow-esprint-500/20 group-hover:scale-105 transition-transform duration-300">
                  <Scissors className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-800">
                  Esprint<span className="text-transparent bg-clip-text bg-gradient-to-r from-esprint-600 to-esprint-400">Notarial</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user.role === 'admin' && (
                <button
                  onClick={() => setIsUserMgmtOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-esprint-50 text-esprint-700 border border-esprint-200 rounded-lg hover:bg-esprint-100 transition-colors text-xs font-bold"
                >
                  <User className="w-4 h-4" /> Usuarios
                </button>
              )}
              <span className="hidden md:block text-xs font-bold text-slate-500 border-l border-slate-200 pl-4 h-4 flex items-center">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        {appState === AppState.LANDING ? (
          <Hero onStart={() => setAppState(AppState.DASHBOARD)} />
        ) : (
          <Dashboard />
        )}
      </main>

      {/* User Management Modal Overlay */}
      {isUserMgmtOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl relative">
            <button
              onClick={() => setIsUserMgmtOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <UserManagement />
          </div>
        </div>
      )}

      {/* Glass Footer */}
      <footer className="mt-auto backdrop-blur-sm bg-white/40 border-t border-white/20">
        <div className="mx-auto max-w-7xl px-6 py-8 md:flex md:items-center md:justify-center lg:px-8">
          <p className="text-center text-xs font-medium text-slate-500">
            &copy; 2026 JG Soluciones Tecnológicas. <span className="text-esprint-600">Innovación Legal.</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;