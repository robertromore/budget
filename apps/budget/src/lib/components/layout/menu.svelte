<script lang="ts">
import * as Dialog from '$ui/lib/components/ui/dialog';

let aboutDialogOpen = $state(false);
</script>

<Dialog.Root bind:open={aboutDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>About Budget</Dialog.Title>
      <Dialog.Description>Lorem ipsum</Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
