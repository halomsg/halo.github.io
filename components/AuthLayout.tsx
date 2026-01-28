import React from 'react';
import { Logo } from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footerText: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, footerText }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-dark-bg">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-halo-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6 animate-float">
            <Logo size="lg" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{title}</h1>
          <p className="text-slate-400">{subtitle}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          {children}
        </div>
        
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} {footerText}</p>
        </div>
      </div>
    </div>
  );
};