import React, { useState, useEffect } from 'react';
import { Users, X, Shield, Star, Ban, UserMinus, MessageSquare, Copy, Check, Lock, Unlock, Pin, Globe, LogOut } from 'lucide-react';
import { User, Group, MemberRole } from '../types';
import { chatService } from '../services/chatService';
import { authService } from '../services/authService';
import { AvatarSelector } from './AvatarSelector';
import { Input } from './Input';

interface GroupModalProps {
  currentUser: User;
  group?: Group | null; // If present, we are in View/Edit mode. If null, Create mode.
  isOpen: boolean;
  onClose: () => void;
  onGroupAction: () => void; // Trigger refresh
}

export const GroupModal: React.FC<GroupModalProps> = ({ currentUser, group, isOpen, onClose, onGroupAction }) => {
  const [mode, setMode] = useState<'create' | 'view'>('create');
  
  // Create Form State
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [avatar, setAvatar] = useState('🛡️');
  const [type, setType] = useState<'public' | 'private'>('private');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  
  // View/Manage State
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [membersDetails, setMembersDetails] = useState<(User & { role: MemberRole })[]>([]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (group) {
        setMode('view');
        // Hydrate members
        const allUsers = authService.getAllUsers();
        const details = group.members.map(m => {
          const u = allUsers.find(user => user.id === m.userId);
          return u ? { ...u, role: m.role } : null;
        }).filter(Boolean) as (User & { role: MemberRole })[];
        setMembersDetails(details);
        setInviteLink(group.invite?.code ? `halo://join/${group.invite.code}` : '');
      } else {
        setMode('create');
        setName('');
        setDesc('');
        setAvatar('🛡️');
        setType('private');
        setSlug('');
      }
    }
  }, [isOpen, group]);

  const handleCreate = () => {
    setError('');
    if (!name.trim()) return;
    try {
      chatService.createGroup(name, desc, avatar, currentUser.id, type, slug);
      onGroupAction();
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLeaveGroup = () => {
    if (!group) return;
    if (confirm("Are you sure you want to leave this group?")) {
      try {
        chatService.leaveGroup(group.id, currentUser.id);
        onGroupAction();
        onClose();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const generateInvite = () => {
    if (!group) return;
    const code = chatService.generateInviteLink(group.id, currentUser.id);
    setInviteLink(`halo://join/${code}`);
    onGroupAction();
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKick = (userId: string) => {
    if (!group) return;
    if (confirm("Are you sure you want to kick this user?")) {
      try {
        // Pass currentUser.id as actor
        chatService.kickMember(group.id, currentUser.id, userId);
        setMembersDetails(prev => prev.filter(m => m.id !== userId));
        onGroupAction();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleBan = (userId: string) => {
    if (!group) return;
    if (confirm("Ban this user permanently?")) {
      try {
        chatService.banMember(group.id, currentUser.id, userId);
        setMembersDetails(prev => prev.filter(m => m.id !== userId));
        onGroupAction();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handlePromote = (userId: string) => {
    if (!group) return;
    try {
      chatService.updateMemberRole(group.id, currentUser.id, userId, 'admin');
      setMembersDetails(prev => prev.map(m => m.id === userId ? { ...m, role: 'admin' } : m));
      onGroupAction();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleMuteChat = () => {
    if (!group) return;
    try {
      chatService.updateGroupSettings(group.id, currentUser.id, { onlyAdminsCanPost: !group.settings.onlyAdminsCanPost });
      onGroupAction();
      onClose();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Permission Check
  const myRole = group?.members.find(m => m.userId === currentUser.id)?.role || 'member';
  const canManage = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-[zoomIn_0.2s_ease-out] relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
         <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur">
            <h2 className="text-xl font-bold text-white">
              {mode === 'create' ? 'Create Group' : 'Group Info'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
         </div>

         <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {mode === 'create' ? (
              <div className="space-y-6">
                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
                
                <AvatarSelector selected={avatar} onSelect={setAvatar} label="Group Icon" />
                
                <div className="flex bg-slate-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setType('private')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${type === 'private' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                       Private
                    </button>
                    <button 
                      onClick={() => setType('public')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${type === 'public' ? 'bg-halo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                       Public
                    </button>
                </div>

                <Input label="Group Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Group" />
                
                {type === 'public' && (
                  <div>
                    <Input 
                      label="Group Username (Slug)" 
                      value={slug} 
                      onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10))} 
                      placeholder="coolgroup" 
                      className="font-mono text-halo-400"
                    />
                    <p className="text-[10px] text-slate-500 ml-1 -mt-3">3-10 characters, letters & numbers only.</p>
                  </div>
                )}

                <Input label="Description (Optional)" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this group about?" />
                
                <button 
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  className="w-full py-3 rounded-xl bg-halo-600 hover:bg-halo-500 text-white font-bold transition-all disabled:opacity-50"
                >
                  Create Group
                </button>
              </div>
            ) : group ? (
              <div className="space-y-6">
                 {/* Header Info */}
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-4xl border border-slate-700 relative">
                      {group.avatar}
                      {group.type === 'public' && (
                        <div className="absolute -bottom-2 -right-2 bg-halo-600 rounded-full p-1.5 border-4 border-slate-900">
                          <Globe size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white leading-none mb-1">{group.name}</h3>
                      {group.slug && <p className="text-halo-400 text-sm font-mono mb-1">@{group.slug}</p>}
                      <p className="text-slate-400 text-xs">{group.members.length} members</p>
                    </div>
                 </div>

                 {/* Leave Group Button */}
                 <button 
                   onClick={handleLeaveGroup}
                   className="w-full py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 font-bold uppercase text-xs flex items-center justify-center gap-2 mb-4"
                 >
                    <LogOut size={16} /> Leave Group
                 </button>

                 {/* Actions */}
                 {canManage && (
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={generateInvite}
                        className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 hover:bg-indigo-500/20 transition-all flex flex-col items-center gap-2"
                      >
                         <Copy size={20} />
                         <span className="text-xs font-bold uppercase">Invite Link</span>
                      </button>
                      <button 
                        onClick={toggleMuteChat}
                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-all flex flex-col items-center gap-2"
                      >
                         {group.settings.onlyAdminsCanPost ? <Unlock size={20} /> : <Lock size={20} />}
                         <span className="text-xs font-bold uppercase">{group.settings.onlyAdminsCanPost ? 'Unmute Chat' : 'Mute Chat'}</span>
                      </button>
                   </div>
                 )}

                 {/* Invite Link Display */}
                 {inviteLink && (
                   <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Share this link</p>
                        <p className="text-xs text-halo-400 font-mono truncate">{inviteLink}</p>
                        <p className="text-[10px] text-slate-600 mt-1">Expires in 7 days</p>
                      </div>
                      <button onClick={copyInvite} className="p-2 text-slate-400 hover:text-white">
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                   </div>
                 )}

                 {/* Members List */}
                 <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Members</h4>
                    <div className="space-y-2">
                      {membersDetails.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg group">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                               {m.avatar}
                             </div>
                             <div>
                               <p className="text-sm text-white font-medium flex items-center gap-1">
                                 {m.displayName}
                                 {m.role === 'owner' && <Star size={12} className="text-yellow-400" />}
                                 {m.role === 'admin' && <Shield size={12} className="text-blue-400" />}
                               </p>
                               <p className="text-[10px] text-slate-500 capitalize">{m.role}</p>
                             </div>
                           </div>
                           
                           {/* Admin Actions */}
                           {canManage && m.id !== currentUser.id && m.role !== 'owner' && (
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               {isOwner && m.role !== 'admin' && (
                                 <button onClick={() => handlePromote(m.id)} title="Promote to Admin" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded">
                                   <Shield size={14} />
                                 </button>
                               )}
                               <button onClick={() => handleKick(m.id)} title="Kick" className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 rounded">
                                 <UserMinus size={14} />
                               </button>
                               <button onClick={() => handleBan(m.id)} title="Ban" className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded">
                                 <Ban size={14} />
                               </button>
                             </div>
                           )}
                        </div>
                      ))}
                    </div>
                 </div>

              </div>
            ) : null}
         </div>
      </div>
    </div>
  );
};