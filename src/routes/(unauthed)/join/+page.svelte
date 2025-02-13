<script lang="ts">
  import { goto } from "$app/navigation";
  import { access } from "$lib/api";
  import { getActiveCalendarId } from "$lib/api/calendars";
  import { publicKey } from "$lib/api/identity";

  // @TODO: We want to check in the database if we already made a request by calling the async
  // method access.hasRequested(), is there a svelty way to do this from here? Like with `onMount`
  // or something?
  let pending = false;

  // @TODO: Same here, want to actually check the db using access.wasRejected.
  let rejected = false;

  async function join(event: Event) {
    event.preventDefault();

    // @TODO: Want to get the calendar id from the page url somehow.
    let calendarId = await getActiveCalendarId();

    if (calendarId == undefined) {
      console.error("active calendar not set");
      goto(`/app/calendar/${calendarId}`);
      return;
    };

    let request = {
      calendarId,
      name: "",
      message: ""
    }

    let requestId = await access.requestAccess(request);
    pending = true;

    // @TODO: Is this the best way to wait on a response here (probably no)?
    let hasAccess = false;
    let myPublicKey = await publicKey();
    while (!hasAccess && !rejected) {
      hasAccess = await access.checkHasAccess(myPublicKey, calendarId);
      rejected = await access.wasRejected(requestId);
    }

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
