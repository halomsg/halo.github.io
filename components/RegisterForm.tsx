import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Key, ArrowRight, AlertCircle, Smile, ArrowLeft, ShieldCheck, Timer } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { AvatarSelector } from './AvatarSelector';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';

interface RegisterFormProps {
  onSuccess: () => void;
  onLoginClick: () => void;
  t: any;
}

type Step = 'credentials' | 'verification' | 'profile';

const COOLDOWN_SECONDS = 300; // 5 minutes
const STORAGE_KEY_COOLDOWN = 'halo_email_cooldown';

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onLoginClick, t }) => {
  const [step, setStep] = useState<Step>('credentials');
  
  // Form Data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    avatar: '👽'
  });
  
  // Verification State
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Init EmailJS and Check Cooldown on Mount
  useEffect(() => {
    emailService.init();
    
    const checkCooldown = () => {
      const lastSentStr = localStorage.getItem(STORAGE_KEY_COOLDOWN);
      if (lastSentStr) {
        const lastSent = parseInt(lastSentStr, 10);
        const now = Date.now();
        const diffSeconds = Math.floor((now - lastSent) / 1000);
        
        if (diffSeconds < COOLDOWN_SECONDS) {
          setCooldown(COOLDOWN_SECONDS - diffSeconds);
        } else {
          localStorage.removeItem(STORAGE_KEY_COOLDOWN);
        }
      }
    };
    
    checkCooldown();
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            localStorage.removeItem(STORAGE_KEY_COOLDOWN);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleSendCode = async (isResend = false) => {
    if (cooldown > 0 && isResend) return;
    
    setLoading(true);
    setGeneralError('');
    
    try {
      // If first time sending (not resend), check availability first
      if (!isResend) {
        await authService.checkAvailability(formData.username, formData.email);
      }

      const code = generateCode();
      
      // In a real production app, this verification logic MUST happen on the server
      setVerificationCode(code);
      
      await emailService.sendVerificationCode(formData.email, code, formData.username);
      
      // Set Cooldown
      localStorage.setItem(STORAGE_KEY_COOLDOWN, Date.now().toString());
      setCooldown(COOLDOWN_SECONDS);
      
      if (!isResend) {
        setStep('verification');
      }
    } catch (err: any) {
      if (err.message === 'USERNAME_TAKEN') setGeneralError(t.usernameTaken);
      else if (err.message === 'EMAIL_TAKEN') setGeneralError(t.emailTaken);
      else if (err.message === 'EMAIL_SEND_FAILED') setGeneralError(t.emailSendFailed);
      else setGeneralError(t.regFailed);
    } finally {
      setLoading(false);
    }
  };

  const validateCredentials = () => {
    const newErrors: Record<string, string> = {};
    setGeneralError('');
    const username = formData.username.trim();
    
    // --- USERNAME VALIDATION RULES ---
    if (!username) {
      newErrors.username = t.usernameRequired;
    } else if (username.length < 3) {
      newErrors.username = t.usernameLength;
    } else if (username.length > 11) {
      newErrors.username = t.usernameTooLong; // Max 11 chars
    } else if (!/^[a-zA-Z0-9]+$/.test(username)) {
      newErrors.username = t.usernameAlphanumeric; // No special chars
    } else if (!/[a-zA-Z]/.test(username)) {
      newErrors.username = t.usernameNoLetter; // Must contain at least one letter
    }

    if (!formData.email.trim()) newErrors.email = t.emailRequired;
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = t.emailInvalid;

    if (!formData.password) newErrors.password = t.passwordRequired;
    else if (formData.password.length < 6) newErrors.password = t.passwordLength;

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t.passwordsNoMatch;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateCredentials()) {
      handleSendCode(false);
    }
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    
    if (!enteredCode.trim()) {
      setGeneralError(t.codeRequired);
      return;
    }

    if (enteredCode === verificationCode) {
      setStep('profile');
    } else {
      setGeneralError(t.codeInvalid);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!formData.displayName.trim()) {
      setErrors({ displayName: t.displayNameRequired });
      return;
    }

    setLoading(true);
    try {
      await authService.register(
        formData.username,
        formData.displayName,
        formData.email,
        formData.password,
        formData.avatar
      );
      onSuccess();
    } catch (err: any) {
      setGeneralError(t.regFailed);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- RENDERERS ---

  const renderProgress = () => (
    <div className="flex justify-between mb-8 px-2 relative">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-10" />
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === 'credentials' || step === 'verification' || step === 'profile' ? 'bg-halo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>1</div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === 'verification' || step === 'profile' ? 'bg-halo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>2</div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === 'profile' ? 'bg-halo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>3</div>
    </div>
  );

  return (
    <div className="w-full">
      {renderProgress()}

      {generalError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2 animate-pulse">
          <AlertCircle size={16} />
          {generalError}
        </div>
      )}

      {/* STEP 1: CREDENTIALS */}
      {step === 'credentials' && (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4 animate-float" style={{ animation: 'none' }}>
           <Input
            label={t.username}
            placeholder={t.usernamePlaceholder}
            icon={User}
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            error={errors.username}
          />
          <Input
            label={t.email}
            type="email"
            placeholder={t.emailPlaceholder}
            icon={Mail}
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            error={errors.email}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t.password}
              type="password"
              placeholder={t.passwordPlaceholder}
              icon={Lock}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              error={errors.password}
            />
            <Input
              label={t.confirmPassword}
              type="password"
              placeholder={t.passwordPlaceholder}
              icon={Key}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              error={errors.confirmPassword}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" isLoading={loading}>
              {t.nextStep} <ArrowRight size={18} />
            </Button>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-slate-400 text-sm">
              {t.alreadyHaveAccount}{' '}
              <button 
                type="button" 
                onClick={onLoginClick}
                className="text-halo-400 hover:text-halo-300 font-medium transition-colors"
              >
                {t.signIn}
              </button>
            </p>
          </div>
        </form>
      )}

      {/* STEP 2: VERIFICATION */}
      {step === 'verification' && (
        <form onSubmit={handleVerificationSubmit} className="space-y-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-halo-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-halo-400">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t.verify}</h3>
            <p className="text-sm text-slate-400">
              {t.emailSentTo} <span className="text-white font-medium">{formData.email}</span>
            </p>
          </div>

          <div className="relative">
            <Input
              label={t.codeLabel}
              placeholder="••••••"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" isLoading={loading}>
              {t.verify} <ShieldCheck size={18} />
            </Button>
            
            <button
              type="button"
              onClick={() => handleSendCode(true)}
              disabled={cooldown > 0 || loading}
              className={`
                w-full py-3 px-4 rounded-xl border border-slate-700 font-medium text-sm
                transition-all duration-200 flex items-center justify-center gap-2
                ${cooldown > 0 
                  ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' 
                  : 'bg-transparent text-slate-300 hover:text-white hover:border-slate-500'}
              `}
            >
              {cooldown > 0 ? (
                <>
                  <Timer size={16} />
                  {t.resendAvailableIn} {formatTime(cooldown)}
                </>
              ) : (
                t.resendCode
              )}
            </button>
          </div>

          <div className="text-center mt-4">
             <button 
                type="button"
                onClick={() => setStep('credentials')}
                className="text-slate-500 hover:text-slate-300 text-sm flex items-center justify-center gap-1 mx-auto"
             >
               <ArrowLeft size={14} /> {t.back}
             </button>
          </div>
        </form>
      )}

      {/* STEP 3: PROFILE */}
      {step === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="text-center mb-2">
            <h3 className="text-xl font-semibold text-white mb-2">Setup Profile</h3>
            <p className="text-sm text-slate-400">How should we call you?</p>
          </div>

          <AvatarSelector 
            selected={formData.avatar}
            onSelect={(avatar) => setFormData({...formData, avatar})}
            label={t.selectAvatar}
          />

          <Input
            label={t.displayName}
            placeholder={t.displayNamePlaceholder}
            icon={Smile}
            value={formData.displayName}
            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
            error={errors.displayName}
          />

          <div className="pt-4">
            <Button type="submit" isLoading={loading}>
              {t.finish} <ArrowRight size={18} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};