<script>
  import CustomCalendar from "../../../components/CustomCalendar.svelte";
  import Select from "../../../components/select.svelte";

  let themes = [
    { value: "friendly", label: "Friendly (default)", default: true },
    { value: "dark", label: "Dark mode" },
    { value: "moody", label: "Moody" },
  ];
</script>

<h1>Welcome to ToolKitties! Start here to organise your own programme.</h1>

<form>
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

  <button class="border border-black rounded p-4" type="submit">Create</button>
</form>
