import React from 'react';
import { ArrowRight, FileText, ShieldCheck, Scissors } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStart }) => {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative isolate px-6 lg:px-8">

        <div className="mx-auto max-w-3xl py-12 text-center animate-fade-in-up">
          <div className="mb-8 flex justify-center">
            <div className="glass-panel rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 flex items-center gap-2 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-esprint-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-esprint-500"></span>
              </span>
              Cumplimiento Res. 202-2021
            </div>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl mb-6">
            Separación Notarial <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-esprint-600 via-esprint-500 to-purple-600">Inteligente & Local</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            Procese libros masivos en segundos sin depender de internet. Tecnología de reconocimiento OCR local optimizada para la normativa ecuatoriana.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button onClick={onStart} className="rounded-2xl bg-gradient-to-r from-esprint-600 to-esprint-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-esprint-500/30 hover:shadow-esprint-500/50 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">
              Iniciar Procesamiento <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
          <div className="glass-panel p-6 rounded-3xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-esprint-600">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Carga Ilimitada</h3>
            <p className="text-sm text-slate-500 mt-2">Soporte robusto para libros de +600 fojas con carga única en memoria.</p>
          </div>
          <div className="glass-panel p-6 rounded-3xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">100% Local</h3>
            <p className="text-sm text-slate-500 mt-2">Sus documentos nunca salen de su equipo. Privacidad absoluta garantizada.</p>
          </div>
          <div className="glass-panel p-6 rounded-3xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            <div className="w-12 h-12 bg-esprint-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-esprint-600">
              <Scissors className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Precisión OCR</h3>
            <p className="text-sm text-slate-500 mt-2">Algoritmos ajustados para corregir errores OCR y reconocer códigos notariales.</p>
          </div>
        </div>

      </div>
    </div>
  );
};