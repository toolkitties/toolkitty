<script lang="ts">
  import * as AlertDialog from "./index";

  let { request } = $props();

  // TODO: Handle user actions from requests
</script>

<AlertDialog.Portal>
  <AlertDialog.Content>
    {#if request.type == "space_request"}
      <AlertDialog.Title>{request.space.name} requested for:</AlertDialog.Title>
      <AlertDialog.Description>
        {request.event.name}<br />
        {request.event.startDate} - {request.event.endDate}<br />
      </AlertDialog.Description>
      <AlertDialog.Action>approve</AlertDialog.Action>
      <AlertDialog.Action>reject</AlertDialog.Action>
    {:else if request.type == "resource_request"}
      <AlertDialog.Title
        >{request.resource.name} requested for:</AlertDialog.Title
      >
      <AlertDialog.Description>
        {request.event.name}<br />
        {request.event.startDate} - {request.event.endDate}<br />
        {request.space.name}
      </AlertDialog.Description>
      <AlertDialog.Action>approve</AlertDialog.Action>
      <AlertDialog.Action>reject</AlertDialog.Action>
    {:else}
      <AlertDialog.Title>{request.name} requested access</AlertDialog.Title>
      <AlertDialog.Description>{request.message}</AlertDialog.Description>
      <AlertDialog.Action>accept</AlertDialog.Action>
      <AlertDialog.Action>reject</AlertDialog.Action>
    {/if}
    <AlertDialog.Cancel>cancel</AlertDialog.Cancel>
  </AlertDialog.Content>
</AlertDialog.Portal>
