<script lang="ts">
  import AccessRoleDialog from "$lib/components/dialog/AccessRoleDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";
  let { data }: { data: User | AccessRequest } = $props();
  let open = $state(false);
  let isAccessRequest = (data as AccessRequest).from !== undefined;
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger class="button flex justify-between w-full text-left">
    <span>
      {data.name ? data.name : "Anon"}
    </span>
    <span>
      {isAccessRequest ? "pending" : (data as User).role}
    </span>
    <AccessRoleDialog {data} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
