<!-- 
 @component
 Alert dialog to accept or reject a booking request.
  -->

<script lang="ts">
  import * as AlertDialog from "./index";
  import { bookings } from "$lib/api";
  import Date from "$lib/components/Date.svelte";

  let {
    request,
    open = $bindable(false),
  }: { request: BookingRequestEnriched; open: boolean } = $props();

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
    <AlertDialog.Title
      >{request.resource?.name} requested for:</AlertDialog.Title
    >
    <AlertDialog.Description>
      <p>{request.event?.name}</p>
      <p>
        <Date date={request.timeSpan.start} />-<Date
          date={request.timeSpan.end!}
        />
      </p>
      <p>{request.space?.name}</p>
    </AlertDialog.Description>
    <AlertDialog.Action onclick={() => acceptRequest(request.id)}
      >accept</AlertDialog.Action
    >
    <AlertDialog.Action onclick={() => rejectRequest(request.id)}
      >reject</AlertDialog.Action
    >
  </AlertDialog.Content>
</AlertDialog.Portal>
