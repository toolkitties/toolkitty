<script lang="ts">
  import * as Dialog from "../../../components/dialog/index";

  // TODO: fetch users and their permissions
  const users = [
    { name: "Boo Boo", role: "pending" },
    { name: "Bob", role: "pending" },
    { name: "Panda", role: "admin" },
    { name: "Puppy", role: "admin" },
    { name: "Bird", role: "admin" },
  ];

  // TODO: fetch active calendar code from state
  const calendarCode = "5a7b";

  let copyText = "copy";

  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Content copied to clipboard");
      copyText = "copied";
      setTimeout(() => {
        copyText = "copy";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      // TODO: show toast error message
      copyText = "error";
    }
  }
</script>

<section class="section">
  <h2>Share</h2>
  <button class="button" onclick={() => copyToClipboard(calendarCode)}>
    <span>🔐 calendar code: {calendarCode}</span>
    <span>{copyText}</span>
  </button>
</section>

<section class="section">
  <h2>Users</h2>
  <p>
    There are three roles at ToolKitties. Public members can view the program,
    contributors can add to it and admins can edit the calendar presets. New
    arrivals will be listed at the top in red, change their permissions to let
    them in!
  </p>
  {#if users}
    {#each users as u}
      <Dialog.Root>
        <Dialog.Trigger class="button">
          <span>{u.name}</span>
          <span>{u.role}</span>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Update permissions for {u.name}</Dialog.Title>
          <Dialog.Close>admin</Dialog.Close>
          <Dialog.Close>organiser</Dialog.Close>
          <Dialog.Close>reject</Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    {/each}
  {/if}
</section>
