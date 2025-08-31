<script lang="ts">
  import * as Dialog from "../ui/dialog";
  // import * as Menubar from "../ui/menubar"; // TODO: Add menubar component or remove this file

  let aboutDialogOpen = $state(false);
</script>

<!-- TODO: Add menubar component or implement proper menu
<Menubar.Root class="rounded-none border-b border-none px-2 lg:px-4">
  Menu content temporarily disabled - menubar component missing
</Menubar.Root>
-->

<Dialog.Root bind:open={aboutDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>About Budget</Dialog.Title>
      <Dialog.Description>Lorem ipsum</Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
