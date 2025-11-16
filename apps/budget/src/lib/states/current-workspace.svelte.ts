import {Context} from "runed";
import type {Workspace, WorkspacePreferences} from "$lib/schema/workspaces";

/**
 * State class representing the currently active workspace
 */
export class CurrentWorkspaceState {
  workspaceId = $state<number | null>(null);
  workspace = $state<Workspace | null>(null);
  preferences = $state<WorkspacePreferences | null>(null);

  constructor(workspace: Workspace | null) {
    if (workspace) {
      this.setWorkspace(workspace);
    }
  }

  setWorkspace(workspace: Workspace) {
    this.workspace = workspace;
    this.workspaceId = workspace.id;

    // Parse preferences JSON
    if (workspace.preferences) {
      try {
        this.preferences = JSON.parse(workspace.preferences);
      } catch (e) {
        console.error("Failed to parse workspace preferences:", e);
        this.preferences = {};
      }
    } else {
      this.preferences = {};
    }
  }

  clearWorkspace() {
    this.workspace = null;
    this.workspaceId = null;
    this.preferences = null;
  }

  updatePreferences(newPrefs: Partial<WorkspacePreferences>) {
    this.preferences = {...this.preferences, ...newPrefs};
  }
}

/**
 * Context instance for current workspace state
 * Use currentWorkspace.get() to access in components
 */
export const currentWorkspace = new Context<CurrentWorkspaceState>("current_workspace");
