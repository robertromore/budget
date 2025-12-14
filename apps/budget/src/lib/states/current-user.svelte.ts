import type { User, UserPreferences } from "$lib/schema/users";
import { Context } from "runed";

/**
 * State class representing the currently active user workspace
 */
export class CurrentUserState {
  userId = $state<number | null>(null);
  user = $state<User | null>(null);
  preferences = $state<UserPreferences | null>(null);

  constructor(user: User | null) {
    if (user) {
      this.setUser(user);
    }
  }

  setUser(user: User) {
    this.user = user;
    this.userId = user.id;

    // Parse preferences JSON
    if (user.preferences) {
      try {
        this.preferences = JSON.parse(user.preferences);
      } catch (e) {
        console.error("Failed to parse user preferences:", e);
        this.preferences = {};
      }
    } else {
      this.preferences = {};
    }
  }

  clearUser() {
    this.user = null;
    this.userId = null;
    this.preferences = null;
  }

  updatePreferences(newPrefs: Partial<UserPreferences>) {
    this.preferences = { ...this.preferences, ...newPrefs };
  }
}

/**
 * Context instance for current user state
 * Use currentUser.get() to access in components
 */
export const currentUser = new Context<CurrentUserState>("current_user");
