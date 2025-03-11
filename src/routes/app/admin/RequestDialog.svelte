<script lang="ts">
  import AccessRoleDialog from "$lib/components/dialog/AccessRoleDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";
  let { user }: { user: RequestDialogUser } = $props();
  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button">
    <p>{user.name} {user.role}</p>
    <AccessRoleDialog {user} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
