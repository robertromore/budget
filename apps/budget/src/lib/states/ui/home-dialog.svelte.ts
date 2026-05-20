/**
 * Home Dialog State
 *
 * Shared open/close state for the create-home dialog. The dialog itself lives
 * in homes-sidebar.svelte (always-mounted under the home app's sidebar), and
 * other surfaces (the /home list page's "Add Home" button) flip the flag here
 * to open it. Keeps a single source of truth and avoids duplicate dialogs.
 */

class HomeDialogState {
  addHomeOpen = $state(false);

  openAddHome() {
    this.addHomeOpen = true;
  }

  closeAddHome() {
    this.addHomeOpen = false;
  }
}

export const homeDialogState = new HomeDialogState();
