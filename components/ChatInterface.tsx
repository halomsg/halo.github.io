import React, { useState, useEffect, useRef } from 'react';
import { User, MessageContent, Group } from '../types';
import { Send, Search, MoreVertical, Phone, Video, Smile, ShieldCheck, X, Mic, StopCircle, Play, Pause, Plus, Users, Pin, Hash, Link as LinkIcon, Shield, ChevronLeft, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { encryptionService } from '../services/encryptionService';
import { chatService, ChatMessage } from '../services/chatService';
import { UserProfileModal } from './UserProfileModal';
import { GroupModal } from './GroupModal';
import { AdminPanel } from './AdminPanel';
import { authService } from '../services/authService';

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
  t: any;
}

interface DecryptedMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: MessageContent;
  timestamp: number;
  isGroupMessage: boolean;
  senderName?: string;
  senderAvatar?: string;
  senderNameColor?: string; // Support for RGB
}

const EMOJI_LIST = ['😀','😂','😍','😎','😭','😡','👍','👎','🎉','🔥','❤️','💔','👀','🚀','👽','💀','👋','💩','🤡','🥶','🥳','🤯','🤬','👾'];

// --- AUDIO COMPONENT ---
const AudioMessage = ({ base64Audio, duration }: { base64Audio: string, duration?: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(base64Audio);
    audioRef.current = audio;
    audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); });
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    return () => { audio.pause(); audioRef.current = null; };
  }, [base64Audio]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px] select-none">
      <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-10 h-10 rounded-full bg-white text-halo-600 flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform">
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="h-6 flex items-center gap-[2px] opacity-80 overflow-hidden">
             {Array.from({ length: 24 }).map((_, i) => {
               const height = 30 + Math.random() * 70; 
               const isActive = (i / 24) * 100 < progress;
               return <div key={i} className={`w-1 rounded-full transition-colors ${isActive ? 'bg-white' : 'bg-white/40'}`} style={{ height: `${height}%` }} />
             })}
        </div>
        <span className="text-[10px] opacity-80 font-mono font-medium">
          {isPlaying && audioRef.current ? formatTime(audioRef.current.currentTime) : formatTime(duration || 0)}
        </span>
      </div>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ user: initialUser, onLogout, t }) => {
  // State
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [activeChat, setActiveChat] = useState<User | Group | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lists
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Indicators
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<string>('');

  // Modals
  const [profileTarget, setProfileTarget] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalTarget, setGroupModalTarget] = useState<Group | null>(null); 
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Admin Check
  const isAdmin = currentUser.username === 'halo';

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helpers
  const isGroup = (chat: User | Group): chat is Group => 'members' in chat;

  // Init
  useEffect(() => {
    refreshSidebar();
  }, [currentUser.id]);

  // Main Loop: Messages & Typing Indicators
  useEffect(() => {
    if (activeChat) {
      loadMessages();
      const interval = setInterval(() => {
        loadMessages();
        
        // CHECK TYPING STATUS
        const activeIds = chatService.getActiveTypingUsers(activeChat.id, currentUser.id);
        const allUsers = authService.getAllUsers();
        const names = activeIds.map(id => {
          const u = allUsers.find(user => user.id === id);
          return u ? u.displayName.split(' ')[0] : 'Someone';
        });
        setTypingUsers(names);

      }, 1000); // Check every second for responsiveness
      
      return () => {
        clearInterval(interval);
        setTypingUsers([]);
      };
    }
  }, [activeChat]);

  // Update Online Status for Active Chat (Direct Messages Only)
  useEffect(() => {
    if (activeChat && !isGroup(activeChat)) {
      const updateStatus = () => {
         // Re-fetch user to get latest lastSeen
         const freshUser = authService.getAllUsers().find(u => u.id === activeChat.id);
         if (freshUser && freshUser.lastSeen) {
             const diff = Date.now() - freshUser.lastSeen;
             if (diff < 2 * 60 * 1000) { // 2 minutes threshold
                 setOnlineStatus(t.online || 'Online');
             } else {
                 const date = new Date(freshUser.lastSeen);
                 const today = new Date();
                 const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
                 const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                 setOnlineStatus(`Last seen ${isToday ? 'today' : date.toLocaleDateString()} at ${timeStr}`);
             }
         } else {
             setOnlineStatus('Offline');
         }
      };
      updateStatus();
      const interval = setInterval(updateStatus, 30000); // Check every 30s
      return () => clearInterval(interval);
    } else {
      setOnlineStatus('');
    }
  }, [activeChat, t.online]);

  useEffect(() => scrollToBottom(), [messages]);

  const refreshSidebar = () => {
    const { users, groups } = chatService.getRecentChats(currentUser.id);
    setRecentUsers(users);
    setMyGroups(groups);
  };

  const loadMessages = async () => {
    if (!activeChat) return;
    const isGrp = isGroup(activeChat);
    const rawMsgs = chatService.getConversation(currentUser.id, activeChat.id, isGrp);
    
    const allUsers = authService.getAllUsers(); // Cache for lookups

    const decrypted = await Promise.all(rawMsgs.map(async (msg) => {
      let content: MessageContent;
      try {
        const jsonStr = await encryptionService.decrypt(msg.encryptedData);
        try { content = JSON.parse(jsonStr); } catch { content = { type: 'text', content: jsonStr }; }
      } catch { content = { type: 'text', content: 'Error' }; }
      
      const sender = allUsers.find(u => u.id === msg.senderId);
      return { 
        ...msg, 
        content,
        senderName: sender?.displayName || 'Unknown',
        senderAvatar: sender?.avatar || '👤',
        senderNameColor: sender?.nameColor
      };
    }));
    setMessages(decrypted);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // --- ACTIONS ---

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (activeChat) {
      // Send heartbeat
      chatService.sendTypingHeartbeat(currentUser.id, activeChat.id);
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim() || !activeChat) return;
    await sendMessage({ type: 'text', content: inputText.trim() });
    setInputText('');
    setShowEmojiPicker(false);
  };

  const sendMessage = async (messageContent: MessageContent) => {
    if (!activeChat) return;
    const payload = JSON.stringify(messageContent);
    const encryptedData = await encryptionService.encrypt(payload);
    
    const isGrp = isGroup(activeChat);
    chatService.sendMessage(currentUser.id, activeChat.id, encryptedData, isGrp);
    await loadMessages();
    refreshSidebar();
  };

  const handleJoinGroup = async () => {
    try {
      // Parse code if full link pasted
      const code = joinCodeInput.replace('halo://join/', '');
      const grp = await chatService.joinGroupByCode(currentUser.id, code);
      refreshSidebar();
      setActiveChat(grp);
      setJoinCodeInput('');
      setShowJoinInput(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePinMessage = (msgId: string) => {
    if (activeChat && isGroup(activeChat)) {
       // Check admin
       const me = activeChat.members.find(m => m.userId === currentUser.id);
       if (me?.role === 'owner' || me?.role === 'admin') {
         chatService.pinMessage(activeChat.id, msgId);
         const updatedGroups = chatService.getUserGroups(currentUser.id);
         const updatedActive = updatedGroups.find(g => g.id === activeChat.id);
         if (updatedActive) setActiveChat(updatedActive);
       }
    }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          audioChunksRef.current = [];
          mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
          mediaRecorderRef.current.onstop = () => {
              const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                  sendMessage({ type: 'audio', content: reader.result as string, duration: recordingTime });
                  setRecordingTime(0);
              };
              stream.getTracks().forEach(t => t.stop());
          };
          mediaRecorderRef.current.start();
          setIsRecording(true);
          recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
      } catch { alert("Mic permission denied"); }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); clearInterval(recordingTimerRef.current); };
  const cancelRecording = () => { mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop()); setIsRecording(false); clearInterval(recordingTimerRef.current); setRecordingTime(0); };

  // --- UI RENDERERS ---

  const canPost = () => {
    if (!activeChat) return false;
    if (!isGroup(activeChat)) return true;
    if (!activeChat.settings.onlyAdminsCanPost) return true;
    const me = activeChat.members.find(m => m.userId === currentUser.id);
    return me?.role === 'owner' || me?.role === 'admin';
  };

  const getPinnedMessage = () => {
    if (activeChat && isGroup(activeChat) && activeChat.pinnedMessageId) {
       return messages.find(m => m.id === activeChat.pinnedMessageId);
    }
    return null;
  };
  const pinnedMsg = getPinnedMessage();

  // Construct Typing Text
  let typingText = '';
  if (typingUsers.length === 1) typingText = `${typingUsers[0]} is typing...`;
  else if (typingUsers.length === 2) typingText = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  else if (typingUsers.length > 2) typingText = `${typingUsers.length} people are typing...`;

  return (
    <div className="flex h-[100dvh] bg-dark-bg text-white overflow-hidden font-sans">
      {/* Modals */}
      {profileTarget && (
        <UserProfileModal 
          currentUser={currentUser}
          targetUser={profileTarget}
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          onLogout={profileTarget.id === currentUser.id ? onLogout : undefined}
          onUpdateUser={setCurrentUser}
        />
      )}
      <GroupModal 
        currentUser={currentUser}
        group={groupModalTarget}
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onGroupAction={() => { refreshSidebar(); if(groupModalTarget && activeChat?.id === groupModalTarget.id) { 
           // If user left the group, activeChat should close or update
           const updated = chatService.getUserGroups(currentUser.id).find(g => g.id === groupModalTarget.id);
           if(updated) setActiveChat(updated);
           else setActiveChat(null); // User left
        }}}
      />
      {isAdmin && (
        <AdminPanel 
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          currentUser={currentUser}
          onUpdateUser={(u) => { setCurrentUser(u); refreshSidebar(); }}
        />
      )}

      {/* SIDEBAR */}
      <div className={`
        w-full md:w-96 bg-slate-900 border-r border-slate-800 flex flex-col z-20 transition-transform duration-300
        ${activeChat ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setProfileTarget(currentUser); setIsProfileOpen(true); }}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-halo-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg">
                    <Logo size="sm" className="w-6 h-6" />
                  </div>
                  <div>
                      <h1 className="font-bold text-lg text-white leading-tight">Halo</h1>
                      <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Messenger</p>
                  </div>
              </div>
              <div className="flex gap-2">
                 {/* Admin Trigger */}
                 {isAdmin && (
                   <button onClick={() => setIsAdminPanelOpen(true)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all shadow-md shadow-red-500/10" title="Admin Panel">
                      <Shield size={20} />
                   </button>
                 )}
                 <button onClick={() => setShowJoinInput(!showJoinInput)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="Join Group">
                    <LinkIcon size={20} />
                 </button>
                 <button onClick={() => { setGroupModalTarget(null); setGroupModalOpen(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="Create Group">
                    <Plus size={20} />
                 </button>
              </div>
          </div>

          {showJoinInput && (
            <div className="mb-3 animate-[fadeIn_0.2s_ease-out]">
               <div className="flex gap-2">
                 <input 
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="Link or @username"
                    className="flex-1 bg-slate-950 text-xs text-white p-2 rounded-lg border border-slate-700"
                 />
                 <button onClick={handleJoinGroup} className="bg-halo-600 px-3 py-1 rounded-lg text-xs font-bold">Join</button>
               </div>
            </div>
          )}
          
          <div className="relative group">
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if(e.target.value) setSearchResults(chatService.searchUsers(e.target.value, currentUser.id)); }}
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-950/50 text-sm text-slate-200 rounded-xl pl-10 pr-4 py-3 border border-slate-800 focus:outline-none focus:border-halo-500 transition-all"
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-500 hover:text-white"><X size={16} /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-4">
           {/* Groups Section */}
           {(myGroups.length > 0) && !searchQuery && (
             <div>
                <h3 className="px-3 text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Users size={12} /> Groups</h3>
                {myGroups.map(g => (
                   <div key={g.id} onClick={() => setActiveChat(g)} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${activeChat?.id === g.id ? 'bg-halo-600/20' : 'hover:bg-slate-800/50'}`}>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl border border-slate-700">{g.avatar}</div>
                      <div>
                        <p className={`font-semibold text-sm ${activeChat?.id === g.id ? 'text-halo-400' : 'text-slate-200'}`}>{g.name}</p>
                        <p className="text-[10px] text-slate-500">{g.members.length} members</p>
                      </div>
                   </div>
                ))}
             </div>
           )}

           {/* Direct Messages */}
           <div>
              <h3 className="px-3 text-xs font-bold text-slate-500 uppercase mb-2">Private Chats</h3>
              {searchQuery ? (
                  searchResults.map(u => (
                    <div key={u.id} onClick={() => { setActiveChat(u); setSearchQuery(''); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl border border-slate-700">{u.avatar}</div>
                      <div>
                        <p className="font-medium text-slate-200">{u.displayName}</p>
                        <p className="text-xs text-halo-500">@{u.username}</p>
                      </div>
                    </div>
                  ))
              ) : (
                  recentUsers.map(u => (
                    <div key={u.id} onClick={() => setActiveChat(u)} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${activeChat?.id === u.id ? 'bg-halo-600/20' : 'hover:bg-slate-800/50'}`}>
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl border border-slate-700">{u.avatar}</div>
                      <div>
                        <p className={`font-semibold text-sm ${activeChat?.id === u.id ? 'text-halo-400' : 'text-slate-200'}`}>{u.displayName}</p>
                        <p className="text-[10px] text-slate-500">@{u.username}</p>
                      </div>
                    </div>
                  ))
              )}
           </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={`
        flex-1 flex flex-col bg-dark-bg relative
        ${activeChat ? 'flex fixed inset-0 md:static z-30' : 'hidden md:flex'}
      `}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="h-[70px] border-b border-slate-800/50 flex items-center justify-between px-4 md:px-6 bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                   {/* Mobile Back Button */}
                   <button 
                     onClick={() => setActiveChat(null)} 
                     className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                   >
                     <ChevronLeft size={24} />
                   </button>

                   <div 
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                        if (isGroup(activeChat)) {
                        setGroupModalTarget(activeChat);
                        setGroupModalOpen(true);
                        } else {
                        setProfileTarget(activeChat);
                        setIsProfileOpen(true);
                        }
                    }}
                    >
                        <div className={`w-10 h-10 flex items-center justify-center text-xl shadow-inner border border-slate-700 ${isGroup(activeChat) ? 'rounded-xl bg-slate-800' : 'rounded-full bg-slate-800'}`}>
                            {activeChat.avatar}
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="font-bold text-lg text-white leading-tight flex items-center gap-2 truncate max-w-[150px] md:max-w-xs">
                            {isGroup(activeChat) ? activeChat.name : activeChat.displayName}
                            {isGroup(activeChat) && (
                                activeChat.type === 'public' ? 
                                <Globe size={16} className="text-halo-500 flex-shrink-0" /> : 
                                <Hash size={16} className="text-slate-500 flex-shrink-0" />
                            )}
                            </h2>
                            {isGroup(activeChat) ? (
                                <div className="flex items-center gap-1.5 h-4">
                                  {typingText ? (
                                     <span className="text-xs text-halo-400 font-medium animate-pulse">{typingText}</span>
                                  ) : (
                                     <p className="text-xs text-slate-400">{activeChat.members.length} members {activeChat.slug ? `@${activeChat.slug}` : ''}</p>
                                  )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 h-4">
                                  {typingText ? (
                                     <span className="text-xs text-halo-400 font-medium animate-pulse">{typingText}</span>
                                  ) : (
                                    <>
                                        {onlineStatus === 'Online' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>}
                                        <span className={`text-xs font-medium truncate ${onlineStatus === 'Online' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {onlineStatus || 'Offline'}
                                        </span>
                                    </>
                                  )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <button className="p-2.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Pinned Message Bar */}
            {pinnedMsg && (
              <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2 flex items-center gap-3 backdrop-blur-sm cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => document.getElementById(`msg-${pinnedMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                 <div className="w-1 h-8 bg-halo-500 rounded-full"></div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-halo-400 mb-0.5">Pinned Message</p>
                    <p className="text-xs text-slate-300 truncate max-w-md">{pinnedMsg.content.type === 'text' ? pinnedMsg.content.content : 'Audio Message'}</p>
                 </div>
                 <Pin size={16} className="text-slate-500 rotate-45" />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar" ref={messagesEndRef}>
                {messages.length === 0 && (
                   <div className="flex flex-col items-center justify-center h-full text-slate-600 pb-20">
                      <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-4 text-4xl animate-float" style={{ animation: 'none' }}>
                        👋
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-1">It's quiet here...</h3>
                      <p className="text-sm">{isGroup(activeChat) ? 'Invite friends or say hello!' : 'Send a message to start chatting.'}</p>
                   </div>
                )}

                {messages.map((msg, idx) => {
                    // SYSTEM MESSAGE RENDERING
                    if (msg.content.type === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center my-4 animate-fadeIn">
                                <div className="bg-slate-800/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/50 shadow-lg">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={12} className="text-halo-500" />
                                        {msg.content.content}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    const isMe = msg.senderId === currentUser.id;
                    const isAudio = msg.content.type === 'audio';
                    const prevIsSame = idx > 0 && messages[idx-1].senderId === msg.senderId && messages[idx-1].content.type !== 'system';
                    
                    return (
                        <div id={`msg-${msg.id}`} key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1 relative`}>
                           {!isMe && !prevIsSame && (
                             <div className="w-8 h-8 mr-2 rounded-full bg-slate-800 flex items-center justify-center text-sm border border-slate-700 self-end mb-1 shrink-0">
                               {msg.senderAvatar}
                             </div>
                           )}
                           {!isMe && prevIsSame && <div className="w-8 mr-2 shrink-0" />}

                            <div className="flex flex-col max-w-[85%] md:max-w-[65%]">
                                {!isMe && !prevIsSame && isGroup(activeChat) && (
                                  <span 
                                    className={`text-[10px] ml-1 mb-0.5 font-bold ${msg.senderNameColor === 'rainbow' ? 'text-rainbow' : 'text-halo-400'}`}
                                    style={msg.senderNameColor && msg.senderNameColor !== 'rainbow' ? { color: msg.senderNameColor } : undefined}
                                  >
                                    {msg.senderName}
                                  </span>
                                )}
                                <div 
                                  className={`
                                    px-4 py-2 shadow-md text-[15px] relative rounded-2xl
                                    ${isMe ? 'bg-halo-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-100 rounded-tl-sm'}
                                  `}
                                  onDoubleClick={() => handlePinMessage(msg.id)}
                                >
                                    {isAudio ? (
                                      <AudioMessage base64Audio={msg.content.content} duration={msg.content.duration} />
                                    ) : (
                                      <>
                                        {msg.content.content.includes('halo://join/') ? (
                                          <div className="flex items-center gap-2 p-1">
                                            <div className="bg-slate-900/50 p-2 rounded-lg"><LinkIcon size={20} /></div>
                                            <div>
                                              <p className="text-xs font-bold uppercase">Group Invite</p>
                                              <button onClick={() => { setJoinCodeInput(msg.content.content); setShowJoinInput(true); }} className="text-xs underline hover:text-white mt-1">Join Group</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content.content}</p>
                                        )}
                                      </>
                                    )}
                                    <span className={`text-[9px] block mt-1 text-right font-bold opacity-60 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Input Area */}
            {canPost() ? (
              <div className="p-3 md:p-4 bg-dark-bg/95 backdrop-blur border-t border-slate-800/50 pb-safe">
                  <div className="max-w-4xl mx-auto bg-slate-900 rounded-[24px] border border-slate-700/50 p-1.5 flex items-end gap-2 relative shadow-2xl">
                      {isRecording && (
                        <div className="absolute inset-0 z-10 bg-slate-800 rounded-[24px] flex items-center px-4 animate-pulse border border-red-500/30">
                           <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
                           <span className="text-white font-mono min-w-[50px]">{Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}</span>
                           <div className="flex-1 text-center text-sm text-slate-400">Recording...</div>
                           <button onClick={cancelRecording} className="text-xs text-slate-400 mr-4 font-bold uppercase hover:text-white">Cancel</button>
                           <button onClick={stopRecording} className="p-2 bg-halo-600 rounded-full text-white shadow-lg"><Send size={18} fill="currentColor" /></button>
                        </div>
                      )}
                      
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-3 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-2xl p-3 shadow-2xl grid grid-cols-6 gap-2 w-72 animate-[float_0.3s_ease-out]">
                           {EMOJI_LIST.map(e => <button key={e} onClick={() => setInputText(p => p+e)} className="text-2xl hover:bg-slate-700 p-1.5 rounded-lg transition-transform hover:scale-110">{e}</button>)}
                        </div>
                      )}

                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 rounded-full transition-colors mb-0.5 ${showEmojiPicker ? 'text-halo-400 bg-halo-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                          <Smile size={24} />
                      </button>
                      
                      <textarea
                          value={inputText}
                          onChange={handleInputChange}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }}}
                          placeholder="Message..."
                          className="flex-1 bg-transparent text-white placeholder-slate-500 max-h-32 min-h-[46px] py-3 focus:outline-none resize-none custom-scrollbar text-[16px]" // text-16px prevents iOS zoom
                          rows={1}
                      />
                      
                      {inputText.trim() ? (
                        <button onClick={handleSendText} className="p-3 rounded-full bg-halo-600 text-white hover:bg-halo-500 shadow-lg transform hover:scale-105 transition-all mb-0.5"><Send size={20} fill="currentColor" /></button>
                      ) : (
                        <button onClick={startRecording} className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all mb-0.5"><Mic size={22} /></button>
                      )}
                  </div>
              </div>
            ) : (
               <div className="p-4 bg-slate-900 text-center text-slate-500 text-sm font-bold border-t border-slate-800">
                  <Lock size={14} className="inline mr-2" /> Only admins can send messages in this group.
               </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/20">
             <div className="w-24 h-24 rounded-[30px] bg-gradient-to-tr from-halo-600 to-indigo-600 flex items-center justify-center mb-6 shadow-2xl shadow-halo-500/20 animate-float">
                <Logo size="lg" />
             </div>
             <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Welcome to Halo</h2>
             <p className="text-slate-400 max-w-md text-lg leading-relaxed">
               Create a Group, Join via Link, or Chat Privately. <br/>
               <span className="text-halo-400">Secure. Fast. Beautiful.</span>
             </p>
          </div>
        )}
      </div>
    </div>
  );
};