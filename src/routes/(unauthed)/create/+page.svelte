<<<<<<< HEAD
<script>
  import FestivalCalendar from '../../../components/festival-calendar.svelte';
=======
<script lang="ts">
  import CustomCalendar from "../../../components/CustomCalendar.svelte";
  import Select from "../../../components/select.svelte";
  import { calendars } from "$lib/api";
  import { goto } from "$app/navigation";

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
      const calendarId = await calendars.create({ name });
      await calendars.select(calendarId);
      await calendars.subscribe(calendarId);
    } catch (err) {
      // Toasty!
    }

    goto(`/app/events`);
  }
>>>>>>> main
</script>

<h1>Welcome to ToolKitties! Start here to organise your own programme.</h1>

<<<<<<< HEAD
<form>
  <input id="name" name="name" type="text" placeholder="Programme name" />
  <input id="username" name="username" type="text" placeholder="Your name" />
  <FestivalCalendar 
    canSelectMultiple={true}
  />
=======
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
  <CustomCalendar
    use={"festival creation"}
    canSelectMultiple={true}
    hasTimePicker={false}
  />

  <Select name="style" items={themes} />

  <p class="my-4">
    Calendars are private. Invite others with your calendar code.
  </p>

>>>>>>> main
  <button class="border border-black rounded p-4" type="submit">Create</button>
</form>
