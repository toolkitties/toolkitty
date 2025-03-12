<script lang="ts">
  import * as AlertDialog from "./index";
  import { access, roles, calendars } from "$lib/api";
  import { toast } from "$lib/toast.svelte";

  let {
    data,
    open = $bindable(false),
  }: { data: User | AccessRequest; open: boolean } = $props();

  let isAccessRequest = (data as AccessRequest).from !== undefined;
  let publicKey = $derived(
    isAccessRequest ? (data as AccessRequest).from : (data as User).publicKey,
  );
  let role = $derived(isAccessRequest ? undefined : (data as User).role);

  /**
   * Assign user to a new role and accept access request if pending
   */
  async function assignRole(role: Role) {
    let activeCalendarId = await calendars.getActiveCalendarId();
    try {
      if (isAccessRequest) {
        await access.acceptAccessRequest({
          requestId: (data as AccessRequest).id,
        });
      }

      roles.assignRole(activeCalendarId!, publicKey, role);

      // close the dialog
      open = false;

      toast.success(`Successfully assigned ${data.name} to ${role}`);
    } catch (error) {
      toast.error(`Failed to assign ${data.name} to ${role}`);
      console.error("Failed to accept access request:", error);
    }
  }

  /**
   * Reject request for calendar access
   */
  async function rejectRequest() {
    try {
      await access.rejectAccessRequest({
        requestId: (data as AccessRequest).id,
      });

      // close the dialog
      open = false;
    } catch (error) {
      console.error("Failed to reject access request:", error);
    }
  }

  // TODO: Handle user actions from requests
</script>

<AlertDialog.Portal>
  <AlertDialog.Content>
    <AlertDialog.Title
      >Update permission for {data.name ? data.name : "Anon"}</AlertDialog.Title
    >
    {#if isAccessRequest}
      <AlertDialog.Description
        >{(data as AccessRequest).message}</AlertDialog.Description
      >
    {/if}
    <AlertDialog.Action onclick={() => assignRole("admin")}
      >admin {role === "admin" ? "(current)" : ""}</AlertDialog.Action
    >
    <AlertDialog.Action onclick={() => assignRole("organiser")}
      >organiser {role === "admin" ? "(current)" : ""}
    </AlertDialog.Action>
    {#if isAccessRequest}
      <AlertDialog.Action onclick={rejectRequest}>reject</AlertDialog.Action>
    {:else}
      <AlertDialog.Cancel>cancel</AlertDialog.Cancel>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Portal>
