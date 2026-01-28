import React, { useState, useEffect } from 'react';
import { User, LogOut, ShieldCheck, X, Calendar, Edit2, Check, AtSign, Clock, Lock } from 'lucide-react';
import { User as UserType } from '../types';
import { authService } from '../services/authService';

interface UserProfileModalProps {
  currentUser: UserType;
  targetUser: UserType;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  onUpdateUser?: (updated: UserType) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  currentUser, 
  targetUser, 
  isOpen, 
  onClose, 
  onLogout,
  onUpdateUser 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  
  const isSelf = currentUser.id === targetUser.id;

  useEffect(() => {
    if (isOpen) {
      setBio(targetUser.bio || '');
      setIsEditing(false);
    }
  }, [isOpen, targetUser]);

  const handleSave = async () => {
    if (!isSelf) return;
    setLoading(true);
    try {
      const updated = await authService.updateProfile(currentUser.id, { bio });
      if (onUpdateUser) onUpdateUser(updated);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
      <div 
        className="w-full max-w-sm bg-slate-900/90 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-[zoomIn_0.3s_ease-out] relative backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Aesthetic Background */}
        <div className="h-40 bg-gradient-to-br from-indigo-600 via-purple-600 to-halo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 blur-3xl rounded-full"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10 backdrop-blur-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-8 pb-8 -mt-16 relative">
          
          {/* Avatar Area */}
          <div className="flex justify-between items-end mb-6">
            <div className="w-32 h-32 rounded-[32px] bg-slate-800 border-[6px] border-slate-900 flex items-center justify-center text-6xl shadow-2xl relative transform transition-transform hover:scale-105 duration-300">
              {targetUser.avatar}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 rounded-full border-[4px] border-slate-900 shadow-sm"></div>
            </div>
            
            {/* Edit Button (Only for Self) */}
            {isSelf && (
              <button 
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={loading}
                className={`
                  mb-2 p-3 rounded-2xl transition-all border shadow-lg
                  ${isEditing 
                    ? 'bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600' 
                    : 'bg-slate-800/80 text-white border-white/10 hover:bg-white/10'}
                `}
              >
                {isEditing ? <Check size={20} /> : <Edit2 size={20} />}
              </button>
            )}
          </div>

          {/* Name & Username */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">{targetUser.displayName}</h2>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-halo-400 font-medium">@{targetUser.username}</span>
            </div>
          </div>

          {/* Glassy Info Blocks */}
          <div className="space-y-3">
            
            {/* Bio Block */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-colors group">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">About</h4>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-halo-500 resize-none h-24"
                  maxLength={140}
                  autoFocus
                />
              ) : (
                <p className="text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap font-light">
                    {targetUser.bio || <span className="text-slate-600 italic">No bio yet.</span>}
                </p>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white/5 border border-white/5 rounded-3xl">
                   <div className="flex items-center gap-2 mb-2 text-indigo-400">
                     <Calendar size={18} />
                   </div>
                   <p className="text-xs text-slate-500 uppercase font-bold">Joined</p>
                   <p className="text-sm text-white font-medium">
                     {new Date(targetUser.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                   </p>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-3xl">
                   <div className="flex items-center gap-2 mb-2 text-emerald-400">
                     <Lock size={18} />
                   </div>
                   <p className="text-xs text-slate-500 uppercase font-bold">Security</p>
                   <p className="text-sm text-white font-medium">Encrypted</p>
                </div>
            </div>

          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
             {/* Send Message (Others) */}
             {!isSelf && (
                <button 
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-halo-600 to-indigo-600 hover:from-halo-500 hover:to-indigo-500 text-white shadow-xl shadow-halo-900/50 transition-all font-bold text-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <AtSign size={20} /> Send Message
                </button>
             )}

             {/* Logout (Self) */}
             {isSelf && onLogout && (
               <button 
                 onClick={onLogout}
                 className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all flex items-center justify-center gap-2 font-semibold"
               >
                 <LogOut size={20} />
                 Sign Out
               </button>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};