<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';

let aboutDialogOpen = $state(false);
</script>

<!-- Application menu component - currently displays about dialog only -->
<!-- Menubar component can be added when additional menu functionality is needed -->

<Dialog.Root bind:open={aboutDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>About Budget</Dialog.Title>
      <Dialog.Description>Lorem ipsum</Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
