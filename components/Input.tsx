import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  icon: Icon, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="w-full mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-halo-400 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          className={`
            w-full bg-slate-800/50 text-white placeholder-slate-500
            border border-slate-700 rounded-xl py-3 
            ${Icon ? 'pl-10' : 'pl-4'} pr-4
            focus:outline-none focus:ring-2 focus:ring-halo-500/50 focus:border-halo-500
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-400 ml-1 animate-pulse">
          {error}
        </p>
      )}
    </div>
  );
};