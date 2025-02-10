<script lang="ts">
  import * as Dialog from "./index";

  let { request } = $props();

  // TODO: Handle user actions from requests
</script>

<Dialog.Portal>
  <Dialog.Content>
    {#if (request.type = "space_request")}
      <Dialog.Title>{request.space.name} requested for:</Dialog.Title>
      <Dialog.Description>
        {request.event.name}<br />
        {request.event.startDate} - {request.event.endDate}<br />
      </Dialog.Description>
      <Dialog.Close>approve</Dialog.Close>
      <Dialog.Close>reject</Dialog.Close>
    {:else if (request.type = "resource_requested")}
      <Dialog.Title>{request.resource.name} requested for:</Dialog.Title>
      <Dialog.Description>
        {request.event.name}<br />
        {request.event.startDate} - {request.event.endDate}<br />
        {request.space.name}
      </Dialog.Description>
      <Dialog.Close>approve</Dialog.Close>
      <Dialog.Close>reject</Dialog.Close>
    {:else}
      <Dialog.Title>Update permissions for {request.name}</Dialog.Title>
      <Dialog.Description>{request.message}</Dialog.Description>
      <Dialog.Close>admin</Dialog.Close>
      <Dialog.Close>organiser</Dialog.Close>
      <Dialog.Close>reject or remove</Dialog.Close>
    {/if}
  </Dialog.Content>
</Dialog.Portal>
