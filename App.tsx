import React, { useState, useEffect } from 'react';
import { ViewState, User, Language } from './types';
import { AuthLayout } from './components/AuthLayout';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ChatInterface } from './components/ChatInterface';
import { LanguageSelector } from './components/LanguageSelector';
import { authService } from './services/authService';
import { translations } from './translations';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('login');
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [language, setLanguage] = useState<Language | null>(null);

  useEffect(() => {
    // Check for saved language
    const savedLang = localStorage.getItem('halo_lang') as Language;
    if (savedLang) {
      setLanguage(savedLang);
    }

    // Check for existing session
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setView('chat');
    }
    setInitializing(false);
  }, []);

  // Heartbeat Effect
  useEffect(() => {
    if (!user) return;
    
    // Initial heartbeat
    authService.updateHeartbeat(user.id);

    const interval = setInterval(() => {
      authService.updateHeartbeat(user.id);
    }, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, [user]);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('halo_lang', lang);
  };

  const handleLoginSuccess = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setView('chat');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setView('login');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-halo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no language selected yet, show selector
  if (!language) {
    return <LanguageSelector onSelect={handleLanguageSelect} />;
  }

  const t = translations[language];

  if (view === 'chat' && user) {
    return <ChatInterface user={user} onLogout={handleLogout} t={t} />;
  }

  return (
    <AuthLayout
      title={view === 'login' ? t.welcomeBack : t.joinHalo}
      subtitle={view === 'login' ? t.enterDetails : t.createAccountDesc}
      footerText={t.securePrivate}
    >
      {view === 'login' ? (
        <LoginForm 
          onSuccess={handleLoginSuccess} 
          onRegisterClick={() => setView('register')} 
          t={t}
        />
      ) : (
        <RegisterForm 
          onSuccess={handleLoginSuccess} 
          onLoginClick={() => setView('login')} 
          t={t}
        />
      )}
    </AuthLayout>
  );
};

export default App;