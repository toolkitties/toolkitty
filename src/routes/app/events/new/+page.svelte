<script>
  import Select from "../../../../components/select.svelte";

  const resources = [
    { value: "1", label: "Projector" },
    { value: "2", label: "HDMI cable", disabled: true },
    { value: "3", label: "Sound system" },
    { value: "4", label: "Disco ball" },
    { value: "5", label: "Smoke machine" },
    { value: "6", label: "Stage lights" },
    { value: "7", label: "DJ mixer" },
    { value: "8", label: "Microphone" },
    { value: "9", label: "Laser lights" },
    { value: "10", label: "Fog machine", disabled: true },
    { value: "11", label: "Turntables" },
    { value: "12", label: "Amplifier" },
    { value: "13", label: "Speakers" },
    { value: "14", label: "Headphones" },
  ];

  const venues = [
    { value: "1", label: "Main stage" },
    { value: "2", label: "Recording studio" },
    { value: "3", label: "Kitchen" },
    { value: "4", label: "Rooftop" },
    { value: "5", label: "Forest" },
  ];

  let formData = {
    venue: "",
    resource: [],
  };
</script>

<form class="space-y-4">
  <input type="text" />
  <Select items={venues} name="venue" bind:value={formData.venue} />
  <Select
    items={resources}
    multiple={true}
    name="resource"
    bind:value={formData.resource}
  />
  <input type="number" />
</form>
