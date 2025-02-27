<script lang="ts">
  import * as AlertDialog from "./index";
  import { access } from "$lib/api";

  let {
    request,
    open = $bindable(false),
  }: { request: AccessRequest; open: boolean } = $props();

  /**
   * Accept request for calendar access
   */
  async function acceptRequest(calendarId: Hash, requestId: Hash) {
    try {
      await access.acceptAccessRequest(calendarId, { requestId });

      // close the dialog
      open = false;
    } catch (error) {
      console.error("Failed to accept access request:", error);
    }
  }

  /**
   * Reject request for calendar access
   */
  async function rejectRequest(calendarId: Hash, requestId: Hash) {
    try {
      await access.rejectAccessRequest(calendarId, { requestId });

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
    <AlertDialog.Title>{request.name} requested access</AlertDialog.Title>
    <AlertDialog.Description>{request.message}</AlertDialog.Description>
    <AlertDialog.Action
      on:click={() => acceptRequest(request.calendarId, request.id)}
      >accept</AlertDialog.Action
    >
    <AlertDialog.Action
      on:click={() => rejectRequest(request.calendarId, request.id)}
      >reject</AlertDialog.Action
    >
    <AlertDialog.Cancel>cancel</AlertDialog.Cancel>
  </AlertDialog.Content>
</AlertDialog.Portal>
