import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, MessageSquare, Zap, X, Palette, Lock } from 'lucide-react';
import { adminService } from '../services/adminService';
import { User } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (u: User) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentUser, onUpdateUser }) => {
  const [stats, setStats] = useState({ totalUsers: 0, totalGroups: 0, totalMessages: 0 });
  const [colorInput, setColorInput] = useState(currentUser.nameColor || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const data = adminService.getStats();
        setStats(data);
        setColorInput(currentUser.nameColor || '');
      } catch (e) {
        onClose(); // Force close if unauthorized
      }
    }
  }, [isOpen, currentUser]);

  const handleApplyColor = async (color: string) => {
    try {
      setLoading(true);
      const updated = await adminService.updateAdminColor(color);
      onUpdateUser(updated);
      setColorInput(color);
    } finally {
      setLoading(false);
    }
  };

  const handleGodMode = async () => {
    if (confirm("WARNING: This will force 'Owner' privileges on all groups you have joined. Continue?")) {
      try {
        setLoading(true);
        const changed = adminService.claimGlobalAdmin();
        if (changed) alert("Privileges escalated successfully.");
        else alert("No permission changes needed or not in any groups.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-lg animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="w-full max-w-2xl bg-slate-950 border border-halo-900/50 rounded-2xl shadow-[0_0_50px_rgba(14,165,233,0.2)] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Security Decor */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 animate-rainbow"></div>

        <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500 border border-red-500/20">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono tracking-tight">ROOT_ACCESS // ADMIN_PANEL</h2>
              <p className="text-[10px] text-red-500 uppercase tracking-[0.2em] font-bold">Authorized Personnel Only</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
          
          {/* STATS GRID */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Users size={80} />
               </div>
               <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Users</p>
               <p className="text-3xl font-mono text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <MessageSquare size={80} />
               </div>
               <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Messages</p>
               <p className="text-3xl font-mono text-white">{stats.totalMessages}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Activity size={80} />
               </div>
               <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Groups</p>
               <p className="text-3xl font-mono text-white">{stats.totalGroups}</p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Appearance */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
                <Palette size={16} /> Admin Identity
              </h3>
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    placeholder="Hex (#ff0000) or 'rainbow'"
                    className="flex-1 bg-black border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <button 
                    onClick={() => handleApplyColor(colorInput)}
                    disabled={loading}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-lg border border-slate-700"
                  >
                    Set
                  </button>
                </div>
                <button 
                   onClick={() => handleApplyColor('rainbow')}
                   className="w-full py-3 rounded-lg bg-gradient-to-r from-red-500 via-green-500 to-blue-500 text-white font-bold uppercase text-xs shadow-lg opacity-90 hover:opacity-100 transition-opacity"
                >
                  Activate RGB Mode
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
                <Lock size={16} /> Permissions Override
              </h3>
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Forces 'Owner' status in all joined groups. This bypasses normal role restrictions.
                  <br/><span className="text-red-500 font-bold">Use with caution.</span>
                </p>
                <button 
                  onClick={handleGodMode}
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 font-bold uppercase text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Zap size={14} /> Grant All Privileges
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};