import { User } from '../types';

const STORAGE_KEY_USERS = 'halo_users_db';
const STORAGE_KEY_CURRENT_USER = 'halo_current_session';

// SUPER ADMIN CONFIGURATION
const ADMIN_USERNAME = 'halo';
const ADMIN_PASSWORD_HASH = btoa('123$password$%'); // Simple base64 for demo matching
const ADMIN_UUID = '00000000-0000-0000-0000-HALOADMIN000';

interface StoredUser extends User {
  passwordHash: string;
}

export const authService = {
  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  getAllUsers(): StoredUser[] {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  async checkAvailability(username: string, email: string): Promise<void> {
    await this.delay(500); 
    
    // Protect Admin Username
    if (username.toLowerCase() === ADMIN_USERNAME) {
      throw new Error('USERNAME_TAKEN');
    }

    const users = this.getAllUsers();
    
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('USERNAME_TAKEN');
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('EMAIL_TAKEN');
    }
  },

  async register(username: string, displayName: string, email: string, password: string, avatar: string): Promise<User> {
    await this.delay(800); 

    await this.checkAvailability(username, email);

    const users = this.getAllUsers();
    const now = Date.now();

    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      username,
      displayName,
      email,
      passwordHash: btoa(password),
      createdAt: now,
      lastSeen: now,
      avatar: avatar || '👤',
      bio: ''
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    
    const sessionUser = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      email: newUser.email,
      avatar: newUser.avatar,
      bio: newUser.bio,
      createdAt: newUser.createdAt,
      lastSeen: newUser.lastSeen
    };

    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));

    return sessionUser;
  },

  async login(usernameOrEmail: string, password: string): Promise<User> {
    await this.delay(800);

    const inputHash = btoa(password);

    // --- SUPER ADMIN LOGIN CHECK ---
    if (usernameOrEmail.toLowerCase() === ADMIN_USERNAME && inputHash === ADMIN_PASSWORD_HASH) {
      return this.ensureAdminAccountExists();
    }

    const users = this.getAllUsers();
    const userIndex = users.findIndex(u => 
      (u.username.toLowerCase() === usernameOrEmail.toLowerCase() || 
       u.email.toLowerCase() === usernameOrEmail.toLowerCase()) &&
      u.passwordHash === inputHash
    );

    if (userIndex === -1) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const user = users[userIndex];
    
    // Update last seen on login
    user.lastSeen = Date.now();
    users[userIndex] = user;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    const sessionUser: User = {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username, 
      email: user.email,
      avatar: user.avatar,
      bio: user.bio || '',
      nameColor: user.nameColor,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen
    };

    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
    return sessionUser;
  },

  updateHeartbeat(userId: string) {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].lastSeen = Date.now();
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }
  },

  /**
   * Ensures the 'halo' admin account exists in the DB. 
   * If not, creates it.
   * Returns the session user.
   */
  ensureAdminAccountExists(): User {
    const users = this.getAllUsers();
    let adminUser = users.find(u => u.id === ADMIN_UUID);
    const now = Date.now();

    if (!adminUser) {
      adminUser = {
        id: ADMIN_UUID,
        username: ADMIN_USERNAME,
        displayName: 'Halo',
        email: 'admin@halo.messenger',
        passwordHash: ADMIN_PASSWORD_HASH,
        avatar: '⚡',
        bio: 'Official Halo Administrator',
        nameColor: 'rainbow',
        createdAt: now,
        lastSeen: now
      };
      users.push(adminUser);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } else {
        // Update admin last seen
        const idx = users.findIndex(u => u.id === ADMIN_UUID);
        if (idx !== -1) {
            users[idx].lastSeen = now;
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        }
    }

    const sessionUser: User = {
      id: adminUser.id,
      username: adminUser.username,
      displayName: adminUser.displayName,
      email: adminUser.email,
      avatar: adminUser.avatar,
      bio: adminUser.bio,
      nameColor: adminUser.nameColor,
      createdAt: adminUser.createdAt,
      lastSeen: now
    };

    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
    return sessionUser;
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) throw new Error('User not found');

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    
    // Update session if it's the current user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const newSession = { ...currentUser, ...updates };
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(newSession));
      return newSession;
    }

    // Return sanitized user
    const { passwordHash, ...safeUser } = updatedUser;
    return safeUser;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return userStr ? JSON.parse(userStr) : null;
  }
};