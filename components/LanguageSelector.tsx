import React from 'react';
import { Logo } from './Logo';
import { Language } from '../types';

interface LanguageSelectorProps {
  onSelect: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-dark-bg">
       {/* Background Decor */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-halo-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-float">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl text-center">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Welcome / Добро пожаловать</h1>
          <p className="text-slate-400 mb-8">Select your language / Выберите язык</p>

          <div className="space-y-4">
            <button
              onClick={() => onSelect('en')}
              className="w-full py-4 px-6 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-halo-500 transition-all duration-300 group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">🇺🇸</span>
                <span className="font-medium text-lg text-white group-hover:text-halo-400 transition-colors">English</span>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-slate-600 group-hover:border-halo-400" />
            </button>

            <button
              onClick={() => onSelect('ru')}
              className="w-full py-4 px-6 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-halo-500 transition-all duration-300 group flex items-center justify-between"
            >
               <div className="flex items-center gap-4">
                <span className="text-2xl">🇷🇺</span>
                <span className="font-medium text-lg text-white group-hover:text-halo-400 transition-colors">Русский</span>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-slate-600 group-hover:border-halo-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};