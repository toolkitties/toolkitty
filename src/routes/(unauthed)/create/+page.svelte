<script lang="ts">
  import FestivalCalendar from "$lib/components/FestivalCalendar.svelte";
  import Select from "$lib/components/Select.svelte";
  import { calendars } from "$lib/api";
  import { goto } from "$app/navigation";
    import { setActiveCalendar } from "$lib/api/calendars";

  let themes = [
    { value: "friendly", label: "Friendly (default)", default: true },
    { value: "dark", label: "Dark mode" },
    { value: "moody", label: "Moody" },
  ];

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const data = new FormData(event.target as HTMLFormElement);
    const name = data.get("name") as string;

    try {
      let [operationId, calendarId] = await calendars.create({
        fields: {
          name: name,
          dates: [{ start: new Date(), end: new Date() }],
        },
      });
      await setActiveCalendar(calendarId);
    } catch (err) {
      console.log(err)
      // Toasty!
    }

    goto(`/app/events`);
  }
</script>

<h1>Welcome to ToolKitties! Start here to organise your own programme.</h1>

<form onsubmit={handleSubmit}>
  <label for="name">Programme name*</label>
  <input
    id="name"
    name="name"
    type="text"
    placeholder="Programme name"
    required
    class="mb-4"
  />

  <label for="username">Your name*</label>
  <input
    id="username"
    name="username"
    type="text"
    placeholder="Your name"
    required
    class="mb-4"
  />

  <label id="description">Programme description</label>
  <textarea
    id="description"
    name="description"
    rows="4"
    placeholder="Description"
    class="block mb-4"
  ></textarea>

  <label>Programme running time</label>
  <FestivalCalendar />

  <Select name="style" items={themes} />

  <p class="my-4">
    Calendars are private. Invite others with your calendar code.
  </p>

  <button class="border border-black rounded p-4" type="submit">Create</button>
</form>
