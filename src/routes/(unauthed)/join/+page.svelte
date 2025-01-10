<script lang="ts">
  import { goto } from "$app/navigation";

  function join(event: Event) {
    event.preventDefault();
    // TODO: send request to join.
    pending = true;
    setTimeout(() => {
      goto("/app/events");
    }, 1500);
  }

  let pending = false;
</script>

<h1>Kitty Fest 25</h1>

{#if pending}
  <p>
    Your request is now pending. You will be notified when this changes. Read
    more about Toolkitties <a href="/help">here</a>.
  </p>
  <span>⏳</span>
{:else}
  <p>Welcome to Toolkitties</p>
  <form onsubmit={join}>
    <input id="name" name="name" type="text" placeholder="Your name" />
    <textarea id="message" name="message" rows="4" placeholder="Your message"
    ></textarea>
    <button class="border border-black rounded p-4" type="submit"
      >Request access</button
    >
  </form>
{/if}
