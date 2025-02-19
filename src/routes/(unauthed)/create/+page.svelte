
<script lang="ts">
  import { calendars } from "$lib/api";
  import { goto } from "$app/navigation";
    import FestivalCalendar from "../../../components/festival-calendar.svelte";

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
      console.log("call calendars.create");
      await calendars.create({ fields: {
          name,
          dates: [{start: new Date(), end: new Date()}]
      } });
    } catch (err) {
      // Toasty!
    }

    goto(`/app/events`);
  }
</script>

<h1>Welcome to ToolKitties! Start here to organise your own programme.</h1>

<form>
  <input id="name" name="name" type="text" placeholder="Programme name" />
  <input id="username" name="username" type="text" placeholder="Your name" />
  <FestivalCalendar canSelectMultiple={true} />
  <button class="border border-black rounded p-4" type="submit">Create</button>
</form>
