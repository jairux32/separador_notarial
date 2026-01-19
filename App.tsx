import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard';
import { AppState } from './types';
import { Scissors } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center cursor-pointer" onClick={() => setAppState(AppState.LANDING)}>
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="bg-esprint-600 p-1.5 rounded-lg">
                    <Scissors className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">Esprint<span className="text-esprint-600">Notarial</span></span>
              </div>
            </div>
            <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">v2.4 - Res. 202-2021</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {appState === AppState.LANDING ? (
          <Hero onStart={() => setAppState(AppState.DASHBOARD)} />
        ) : (
          <Dashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; 2024 Esprint Soluciones Tecnológicas. Todos los derechos reservados.
              <br/>
              Cumpliendo con las normativas del Consejo de la Judicatura del Ecuador.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;