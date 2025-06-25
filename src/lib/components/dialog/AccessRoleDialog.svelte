<!-- 
 @component
 Alert dialog to assign a user to a new role and/or accept calendar access request.
  -->

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

      toast.success(
        `Successfully assigned ${data.name ? data.name : "no name yet"} to ${role}`,
      );
    } catch (error) {
      toast.error(
        `Failed to assign ${data.name ? data.name : "no name yet"} to ${role}`,
      );
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
    <AlertDialog.Action
      class="button button-green w-full mb-2"
      onclick={() => assignRole("admin")}
      disabled={role === "admin"}
      >admin {role === "admin" ? "(current)" : ""}</AlertDialog.Action
    >
    {#if role !== "admin"}
      <AlertDialog.Action
        class="button button-light-pink w-full mb-2"
        onclick={() => assignRole("organiser")}
        >organiser {role === "organiser" ? "(current)" : ""}
      </AlertDialog.Action>
    {/if}
    {#if isAccessRequest}
      <AlertDialog.Action
        onclick={rejectRequest}
        class="button bg-red-light rounded-xl justify-center w-full"
        >reject</AlertDialog.Action
      >
    {:else}
      <AlertDialog.Cancel
        class="button bg-grey-light rounded-xl justify-center w-full"
        >cancel</AlertDialog.Cancel
      >
    {/if}
  </AlertDialog.Content>
</AlertDialog.Portal>
