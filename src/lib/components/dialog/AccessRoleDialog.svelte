<script lang="ts">
  import * as AlertDialog from "./index";
  import { access, roles, calendars, identity } from "$lib/api";
  import { toast } from "$lib/toast.svelte";

  let {
    user,
    open = $bindable(false),
  }: { user: RequestDialogUser; open: boolean } = $props();

  /**
   * Assign user to a new role and accept access request if pending
   */
  async function assignRole(role: Role) {
    let activeCalendarId = await calendars.getActiveCalendarId();
    try {
      if (user.pendingRequest) {
        await access.acceptAccessRequest({ requestId: user.pendingRequest.id });
      }

      roles.assignRole(activeCalendarId!, user.publicKey, role);

      // close the dialog
      open = false;

      toast.success(`Successfully assigned ${user.name} to ${role}`);
    } catch (error) {
      toast.error(`Failed to assign ${user.name} to ${role}`);
      console.error("Failed to accept access request:", error);
    }
  }

  /**
   * Reject request for calendar access
   */
  async function rejectRequest(requestId: Hash) {
    try {
      await access.rejectAccessRequest({ requestId });

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
    <AlertDialog.Title>Update permission for {user.name}</AlertDialog.Title>
    {#if user.pendingRequest}
      <AlertDialog.Description
        >{user.pendingRequest.message}</AlertDialog.Description
      >
    {/if}
    <AlertDialog.Action
      onclick={() => assignRole("admin")}
      disabled={user.role === "admin"}
      >admin {user.role === "admin" ? "(current)" : ""}</AlertDialog.Action
    >
    <AlertDialog.Action
      onclick={() => assignRole("organiser")}
      disabled={user.role === "organiser"}
      >organiser {user.role === "admin" ? "(current)" : ""}
    </AlertDialog.Action>
    {#if user.pendingRequest}
      <AlertDialog.Action onclick={() => rejectRequest(user.pendingRequest!.id)}
        >reject</AlertDialog.Action
      >
    {:else}
      <AlertDialog.Cancel>cancel</AlertDialog.Cancel>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Portal>
