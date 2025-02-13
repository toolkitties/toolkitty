<script lang="ts">
  import { goto } from "$app/navigation";
  import { access } from "$lib/api";
  import { publicKey } from "$lib/api/identity";
  import { promiseResult } from "$lib/promiseMap";

  // @TODO: We want to check in the database if we already made a request by calling the async
  // method access.hasRequested(), is there a svelty way to do this from here? Like with `onMount`
  // or something?
  let pending = false;

  // @TODO: Same here, want to actually check the db.
  let rejected = false;

  async function join(event: Event) {
    event.preventDefault();

    // @TODO: Want to get the calendar id from the page url somehow.
    let calendarId = "";
    let request = {
      calendarId,
      name: "",
      message: ""
    }

    let requestId = await access.requestAccess(request);
    pending = true;

    // @TODO: For now I'm just waiting on a promise which is resolved when the request response is
    // processed. Don't know if this is the pattern we want, as it doesn't account for app
    // restarts (the promise would be lost), and it is a different way of using the promiseMap to
    // what we do so far (just waiting on an operation passing through the processor). Maybe we
    // could use a live query somehow to wait on database change?
    await promiseResult(requestId);

    // Check if we now have access.
    let myPublicKey = await publicKey();
    let hasAccess = await access.checkHasAccess(myPublicKey, calendarId);

    // If the answer is "no" then we were rejected.
    rejected = !hasAccess;

    if (hasAccess) {
      goto(`/app/calendar/${calendarId}`);
    }
  }

</script>

<h1>Kitty Fest 25</h1>

{#if pending && !rejected}
  <p>
    Your request is now pending. You will be notified when this changes. Read
    more about Toolkitties <a href="/help">here</a>.
  </p>
  <span>⏳</span>
{:else if rejected}
  <p>
    Your request was rejected!!
  </p>
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
