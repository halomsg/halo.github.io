import { User, MessageType, Group, GroupMember, MemberRole } from '../types';
import { authService } from './authService';
import { encryptionService } from './encryptionService';

const STORAGE_KEY_MESSAGES = 'halo_messages_db';
const STORAGE_KEY_GROUPS = 'halo_groups_db';
const STORAGE_KEY_TYPING = 'halo_typing_db';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string; // Can be UserId or GroupId
  encryptedData: string; 
  timestamp: number;
  isGroupMessage: boolean;
}

// Map<ChatId, Map<UserId, Timestamp>>
interface TypingStatus {
  [chatId: string]: {
    [userId: string]: number;
  }
}

export const chatService = {
  
  // --- MESSAGING ---

  getAllMessages(): ChatMessage[] {
    const msgsStr = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return msgsStr ? JSON.parse(msgsStr) : [];
  },

  async sendSystemMessage(groupId: string, text: string) {
    const content = JSON.stringify({ type: 'system', content: text });
    const encryptedData = await encryptionService.encrypt(content);
    
    // System messages have a specific senderId (e.g., 'system') or null, 
    // but to fit existing types we use a reserved UUID
    this.sendMessage('00000000-0000-0000-0000-000000000000', groupId, encryptedData, true);
  },

  sendMessage(senderId: string, receiverId: string, encryptedData: string, isGroupMessage = false): ChatMessage {
    const messages = this.getAllMessages();
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId,
      receiverId,
      encryptedData,
      timestamp: Date.now(),
      isGroupMessage
    };

    messages.push(newMessage);
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    return newMessage;
  },

  getConversation(currentUserId: string, targetId: string, isGroup: boolean): ChatMessage[] {
    const messages = this.getAllMessages();
    if (isGroup) {
      return messages.filter(msg => msg.receiverId === targetId && msg.isGroupMessage)
        .sort((a, b) => a.timestamp - b.timestamp);
    } else {
      return messages.filter(msg => 
        !msg.isGroupMessage &&
        ((msg.senderId === currentUserId && msg.receiverId === targetId) ||
         (msg.senderId === targetId && msg.receiverId === currentUserId))
      ).sort((a, b) => a.timestamp - b.timestamp);
    }
  },

  // --- TYPING INDICATORS ---

  getTypingData(): TypingStatus {
    const str = localStorage.getItem(STORAGE_KEY_TYPING);
    return str ? JSON.parse(str) : {};
  },

  sendTypingHeartbeat(userId: string, chatId: string) {
    const data = this.getTypingData();
    if (!data[chatId]) data[chatId] = {};
    
    data[chatId][userId] = Date.now();
    
    const now = Date.now();
    Object.keys(data).forEach(cId => {
      Object.keys(data[cId]).forEach(uId => {
        if (now - data[cId][uId] > 10000) { 
          delete data[cId][uId];
        }
      });
      if (Object.keys(data[cId]).length === 0) delete data[cId];
    });

    localStorage.setItem(STORAGE_KEY_TYPING, JSON.stringify(data));
  },

  getActiveTypingUsers(chatId: string, currentUserId: string): string[] {
    const data = this.getTypingData();
    if (!data[chatId]) return [];

    const now = Date.now();
    const activeThreshold = 3000; 

    return Object.keys(data[chatId]).filter(userId => {
      return userId !== currentUserId && (now - data[chatId][userId] < activeThreshold);
    });
  },

  // --- GROUPS ---

  getAllGroups(): Group[] {
    const groupsStr = localStorage.getItem(STORAGE_KEY_GROUPS);
    return groupsStr ? JSON.parse(groupsStr) : [];
  },

  saveGroups(groups: Group[]) {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
  },

  createGroup(
    name: string, 
    description: string, 
    avatar: string, 
    creatorId: string, 
    type: 'public' | 'private', 
    slug?: string
  ): Group {
    const groups = this.getAllGroups();
    
    // Validate Public Group Slug
    if (type === 'public') {
      if (!slug) throw new Error("Public groups must have a username (slug)");
      if (!/^[a-zA-Z0-9]{3,10}$/.test(slug)) throw new Error("Group username must be 3-10 alphanumeric characters");
      
      const existing = groups.find(g => g.slug?.toLowerCase() === slug.toLowerCase());
      if (existing) throw new Error("This group username is already taken");
    }

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name,
      description,
      avatar: avatar || '🛡️',
      type,
      slug: type === 'public' ? slug : undefined,
      createdAt: Date.now(),
      members: [{ userId: creatorId, role: 'owner', joinedAt: Date.now() }],
      bannedUserIds: [],
      settings: {
        onlyAdminsCanPost: false
      }
    };
    groups.push(newGroup);
    this.saveGroups(groups);
    
    // Send System Message
    this.sendSystemMessage(newGroup.id, `Group created by owner`);

    return newGroup;
  },

  generateInviteLink(groupId: string, creatorId: string): string {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error("Group not found");

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let code = '';
    for (let i = 0; i < 20; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    group.invite = {
      code,
      creatorId,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };

    this.saveGroups(groups);
    return code;
  },

  async joinGroupByCode(userId: string, code: string): Promise<Group> {
    const groups = this.getAllGroups();
    // Check invite code
    let group = groups.find(g => g.invite?.code === code);
    
    // Check slug (public handle)
    if (!group) {
        group = groups.find(g => g.slug === code || g.slug === code.replace('@', ''));
        if (group && group.type === 'private') group = undefined; // Cannot join private via slug
    }

    if (!group) throw new Error("Group not found or invite expired");
    if (group.bannedUserIds.includes(userId)) throw new Error("You are banned from this group");
    if (group.members.some(m => m.userId === userId)) throw new Error("Already a member");

    // Invite code expiration check (if joining via invite)
    if (group.invite?.code === code && group.invite && Date.now() > group.invite.expiresAt) {
       throw new Error("Invite link expired");
    }

    group.members.push({ userId, role: 'member', joinedAt: Date.now() });
    this.saveGroups(groups);

    // Get username for system message
    const user = authService.getAllUsers().find(u => u.id === userId);
    const name = user ? user.displayName : 'Someone';
    await this.sendSystemMessage(group.id, `${name} has joined the group`);

    return group;
  },

  leaveGroup(groupId: string, userId: string) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error("Group not found");

    const memberIndex = group.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) throw new Error("Not a member");

    // Owner cannot leave if they are the only one, or must transfer ownership (simplified here: prevent leaving)
    if (group.members[memberIndex].role === 'owner' && group.members.length > 1) {
       throw new Error("Owners must transfer ownership before leaving");
    }
    
    group.members.splice(memberIndex, 1);
    
    // If empty, delete group? For now, keep it.
    this.saveGroups(groups);

    const user = authService.getAllUsers().find(u => u.id === userId);
    const name = user ? user.displayName : 'Someone';
    this.sendSystemMessage(group.id, `${name} has left the group`);
  },

  // --- SERVER-SIDE PERMISSION VERIFICATION ---
  
  verifyPermission(group: Group, actorId: string, targetId: string, action: 'kick' | 'ban' | 'promote' | 'mute') {
    const actor = group.members.find(m => m.userId === actorId);
    const target = group.members.find(m => m.userId === targetId);
    
    // 1. Actor must exist
    if (!actor) throw new Error("Unauthorized: Actor not in group");

    // 2. Mute settings check
    if (action === 'mute') {
        if (actor.role !== 'owner' && actor.role !== 'admin') throw new Error("Only admins can change settings");
        return;
    }

    // 3. Target must exist
    if (!target) throw new Error("Target user not found");

    // 4. Role Hierarchy
    if (actor.role === 'member') throw new Error("Insufficient permissions");
    
    // Admins cannot kick/ban other admins or owners
    if (actor.role === 'admin') {
        if (target.role === 'admin' || target.role === 'owner') throw new Error("Admins cannot target peers or owners");
    }

    // Owner can do anything to anyone except themselves (handled by UI generally)
  },

  updateGroupSettings(groupId: string, actorId: string, updates: Partial<Group['settings']>) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      this.verifyPermission(group, actorId, '0', 'mute'); // targetId 0 for generic check
      group.settings = { ...group.settings, ...updates };
      this.saveGroups(groups);
      
      if (updates.onlyAdminsCanPost !== undefined) {
         this.sendSystemMessage(groupId, `Chat has been ${updates.onlyAdminsCanPost ? 'muted' : 'unmuted'} by admin`);
      }
    }
  },

  pinMessage(groupId: string, messageId: string | undefined) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.pinnedMessageId = messageId;
      this.saveGroups(groups);
      if(messageId) this.sendSystemMessage(groupId, "A message was pinned");
    }
  },

  // Role Management
  updateMemberRole(groupId: string, actorId: string, targetUserId: string, newRole: MemberRole) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      this.verifyPermission(group, actorId, targetUserId, 'promote');
      const member = group.members.find(m => m.userId === targetUserId);
      if (member) {
        member.role = newRole;
        this.saveGroups(groups);
        
        const targetUser = authService.getAllUsers().find(u => u.id === targetUserId);
        const name = targetUser ? targetUser.displayName : 'User';
        this.sendSystemMessage(groupId, `${name} was promoted to ${newRole}`);
      }
    }
  },

  kickMember(groupId: string, actorId: string, targetUserId: string) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      this.verifyPermission(group, actorId, targetUserId, 'kick');
      group.members = group.members.filter(m => m.userId !== targetUserId);
      this.saveGroups(groups);

      const targetUser = authService.getAllUsers().find(u => u.id === targetUserId);
      const name = targetUser ? targetUser.displayName : 'User';
      this.sendSystemMessage(groupId, `${name} was kicked from the group`);
    }
  },

  banMember(groupId: string, actorId: string, targetUserId: string) {
    const groups = this.getAllGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      this.verifyPermission(group, actorId, targetUserId, 'ban');
      group.members = group.members.filter(m => m.userId !== targetUserId);
      if (!group.bannedUserIds.includes(targetUserId)) {
        group.bannedUserIds.push(targetUserId);
      }
      this.saveGroups(groups);

      const targetUser = authService.getAllUsers().find(u => u.id === targetUserId);
      const name = targetUser ? targetUser.displayName : 'User';
      this.sendSystemMessage(groupId, `${name} was banned permanently`);
    }
  },

  // --- HELPERS ---

  searchUsers(query: string, currentUserId: string): User[] {
    if (!query || query.length < 1) return [];
    
    const cleanQuery = query.replace(/^@/, '').toLowerCase();
    const allUsers = authService.getAllUsers();
    
    return allUsers.filter(u => 
      u.id !== currentUserId && 
      (u.username.toLowerCase().includes(cleanQuery) || 
       u.displayName.toLowerCase().includes(cleanQuery))
    );
  },

  getUserGroups(userId: string): Group[] {
    const groups = this.getAllGroups();
    return groups.filter(g => g.members.some(m => m.userId === userId));
  },

  getRecentChats(currentUserId: string): { users: User[], groups: Group[] } {
    const messages = this.getAllMessages();
    const allUsers = authService.getAllUsers();
    const userGroups = this.getUserGroups(currentUserId);
    const chattedUserIds = new Set<string>();

    messages.forEach(msg => {
      if (!msg.isGroupMessage) {
        if (msg.senderId === currentUserId) chattedUserIds.add(msg.receiverId);
        if (msg.receiverId === currentUserId) chattedUserIds.add(msg.senderId);
      }
    });

    return {
      users: allUsers.filter(u => chattedUserIds.has(u.id)),
      groups: userGroups
    };
  }
};