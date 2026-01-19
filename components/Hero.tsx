import React from 'react';
import { ArrowRight, FileText, ShieldCheck, Scissors } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStart }) => {
  return (
    <div className="bg-white">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#0ea5e9] to-[#0c4a6e] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}></div>
        </div>
        
        <div className="mx-auto max-w-3xl py-12 sm:py-24 lg:py-32">
          <div className="text-center">
             <div className="mb-8 flex justify-center">
                <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                  Cumplimiento Resolución 202-2021 <span className="font-semibold text-esprint-600">Consejo de la Judicatura</span>
                </div>
              </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Sistema de Separación <span className="text-esprint-600">Notarial</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Automatice la digitalización de sus libros notariales. Esprint le permite separar actos, protocolos y diligencias de archivos PDF masivos en segundos, renombrándolos automáticamente según la normativa vigente.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button onClick={onStart} className="rounded-md bg-esprint-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-esprint-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-esprint-600 flex items-center gap-2 transition-all">
                Iniciar Procesamiento <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#" className="text-sm font-semibold leading-6 text-gray-900">
                Ver documentación <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12 text-center text-gray-700">
             <div className="flex flex-col items-center">
                <div className="p-3 bg-blue-50 rounded-lg mb-3">
                   <FileText className="w-6 h-6 text-esprint-600"/>
                </div>
                <h3 className="font-semibold">Carga Masiva</h3>
                <p className="text-sm text-gray-500 mt-1">Soporte para libros de +500 fojas</p>
             </div>
             <div className="flex flex-col items-center">
                <div className="p-3 bg-blue-50 rounded-lg mb-3">
                   <ShieldCheck className="w-6 h-6 text-esprint-600"/>
                </div>
                <h3 className="font-semibold">Gemini AI</h3>
                <p className="text-sm text-gray-500 mt-1">Detección inteligente de códigos</p>
             </div>
             <div className="flex flex-col items-center">
                <div className="p-3 bg-blue-50 rounded-lg mb-3">
                   <Scissors className="w-6 h-6 text-esprint-600"/>
                </div>
                <h3 className="font-semibold">Separación Exacta</h3>
                <p className="text-sm text-gray-500 mt-1">División precisa por acto</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};