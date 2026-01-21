import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard';
import { AppState } from './types';
import { Scissors } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-transparent">
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
            <div className="flex items-center">
              <span className="text-xs font-bold text-esprint-700 bg-esprint-100/80 px-3 py-1.5 rounded-full border border-esprint-200">v3.0 - Res. 202-2021</span>
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

export default App;