import React, { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { authService } from '../services/authService';

interface LoginFormProps {
  onSuccess: () => void;
  onRegisterClick: () => void;
  t: any;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onRegisterClick, t }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identifier || !password) {
      setError(t.fillAll);
      return;
    }

    setLoading(true);
    try {
      await authService.login(identifier, password);
      onSuccess();
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') {
        setError(t.invalidCredentials);
      } else {
        setError(t.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <Input
        label={t.username} 
        placeholder={t.emailPlaceholder} 
        icon={Mail}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <Input
        label={t.password}
        type="password"
        placeholder={t.passwordPlaceholder}
        icon={Lock}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex justify-end">
        <button type="button" className="text-sm text-halo-400 hover:text-halo-300 transition-colors">
          {t.forgotPassword}
        </button>
      </div>

      <Button type="submit" isLoading={loading}>
        {t.signIn} <LogIn size={18} />
      </Button>

      <div className="text-center mt-6">
        <p className="text-slate-400 text-sm">
          {t.dontHaveAccount}{' '}
          <button 
            type="button" 
            onClick={onRegisterClick}
            className="text-halo-400 hover:text-halo-300 font-medium transition-colors"
          >
            {t.createOne}
          </button>
        </p>
      </div>
    </form>
  );
};