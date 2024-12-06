<script lang="ts">
  import { goto } from "$app/navigation";

  function join(event: Event) {
    event.preventDefault();
    goto(`/app/events`);
  }
</script>

<h1>My Festival</h1>

<form onsubmit={join}>
  <input id="name" name="name" type="text" placeholder="Your name" />
  <textarea id="message" name="message" rows="4" placeholder="Your message"
  ></textarea>
  <button class="border border-black rounded p-4" type="submit"
    >Request access</button
  >
</form>
