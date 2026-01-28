
import { authService } from './authService';
import { chatService } from './chatService';

export const adminService = {
  
  verifyAdminAccess(currentUserId: string): boolean {
    const user = authService.getCurrentUser();
    // Security check: Must match the hardcoded Admin UUID AND username
    return !!user && user.id === '00000000-0000-0000-0000-HALOADMIN000' && user.username === 'halo';
  },

  getStats() {
    if (!this.verifyAdminAccess('')) throw new Error("Unauthorized");
    
    const users = authService.getAllUsers();
    const groups = chatService.getAllGroups();
    const messages = chatService.getAllMessages();

    return {
      totalUsers: users.length,
      totalGroups: groups.length,
      totalMessages: messages.length,
    };
  },

  claimGlobalAdmin() {
    if (!this.verifyAdminAccess('')) throw new Error("Unauthorized");

    const userId = '00000000-0000-0000-0000-HALOADMIN000';
    const groups = chatService.getAllGroups();
    let modified = false;

    // Iterate all groups
    groups.forEach(group => {
      // Check if admin is a member
      const member = group.members.find(m => m.userId === userId);
      
      if (member) {
        // Force upgrade to owner
        if (member.role !== 'owner') {
          member.role = 'owner';
          modified = true;
        }
      } else {
        // OPTIONAL: Force join all groups? 
        // For now, only upgrade existing memberships to avoid cluttering admin's chat list
      }
    });

    if (modified) {
      chatService.saveGroups(groups);
    }
    
    return modified;
  },

  updateAdminColor(color: string) {
    if (!this.verifyAdminAccess('')) throw new Error("Unauthorized");
    const userId = '00000000-0000-0000-0000-HALOADMIN000';
    return authService.updateProfile(userId, { nameColor: color });
  }
};