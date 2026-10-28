<script lang="ts">
  import AccessRoleDialog from "$lib/components/dialog/AccessRoleDialog.svelte";
  import * as AlertDialog from "$lib/components/dialog/index";
  let {
    data,
    publicKey,
  }: { data: User | AccessRequest; publicKey?: PublicKey } = $props();
  let open = $state(false);
  let isAccessRequest = (data as AccessRequest).from !== undefined;
  let role = (data as User).role;
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger
    class="w-full bg-white border border-black rounded flex items-center justify-between p-2 px-3"
  >
    <span class="flex items-center gap-2 text-[17px]">
      {data.name ? data.name : "no name yet"}
      {!isAccessRequest && (data as User).publicKey === publicKey
        ? "(you)"
        : ""}
    </span>
    <button
      class="button-small {isAccessRequest
        ? 'button-light-yellow'
        : role === 'admin'
          ? 'button-green'
          : role === 'organiser'
            ? 'button-light-pink'
            : 'button-light-blue'}"
    >
      {isAccessRequest ? "pending" : (data as User).role}
    </button>
    <AccessRoleDialog {data} bind:open />
  </AlertDialog.Trigger>
</AlertDialog.Root>
