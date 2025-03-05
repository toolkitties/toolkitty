<script lang="ts">
  import * as AlertDialog from "./index";
  import { bookings } from "$lib/api";

  let {
    request,
    open = $bindable(false),
  }: { request: BookingRequest; open: boolean } = $props();

  /**
   * Accept request for a booking
   */
  async function acceptRequest(requestId: Hash) {
    try {
      await bookings.accept(requestId);

      // close the dialog
      open = false;
    } catch (error) {
      console.error("Failed to accept access request:", error);
    }
  }

  /**
   * Reject request for a booking
   */
  async function rejectRequest(requestId: Hash) {
    try {
      await bookings.reject(requestId);

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
    <AlertDialog.Title>{request.resourceId} requested for:</AlertDialog.Title>
    <AlertDialog.Description>
      <p>eventId: {request.eventId}</p>
      <p>requester: {request.requester}</p>
    </AlertDialog.Description>
    <AlertDialog.Action onclick={() => acceptRequest(request.id)}
      >accept</AlertDialog.Action
    >
    <AlertDialog.Action onclick={() => rejectRequest(request.id)}
      >reject</AlertDialog.Action
    >
  </AlertDialog.Content>
</AlertDialog.Portal>
