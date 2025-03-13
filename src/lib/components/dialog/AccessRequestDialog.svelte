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
  async function acceptRequest(requestId: Hash) {
    try {
      await access.acceptAccessRequest({ requestId });

      // close the dialog
      open = false;
    } catch (error) {
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
    <AlertDialog.Title>{request.name} requested access</AlertDialog.Title>
    <AlertDialog.Description>{request.message}</AlertDialog.Description>
    <AlertDialog.Action onclick={() => acceptRequest(request.id)}
      >accept</AlertDialog.Action
    >
    <AlertDialog.Action onclick={() => rejectRequest(request.id)}
      >reject</AlertDialog.Action
    >
    <AlertDialog.Cancel>cancel</AlertDialog.Cancel>
  </AlertDialog.Content>
</AlertDialog.Portal>
