<script lang="ts">
  import { Tabs } from "bits-ui";

  let spaceType: "physical" | "gps" | "virtual" = $state("physical");
</script>

<h1>Create Space</h1>
<p>info, instructions, guidance? hello organisers! bla bla bla bla bla</p>

<Tabs.Root bind:value={spaceType}>
  <Tabs.List
    class="flex justify-between gap-1.5 p-1.5 items-center border-black bg-black/20 rounded"
  >
    <Tabs.Trigger
      value="physical"
      class="grow text-xs {spaceType == 'physical' ? 'bg-yellow-200' : ''}"
      >physical space</Tabs.Trigger
    >
    <Tabs.Trigger
      value="gps"
      class="grow text-xs {spaceType == 'gps' ? 'bg-pink-200' : ''}"
      >GPS coordinates</Tabs.Trigger
    >
    <Tabs.Trigger
      value="virtual"
      class="grow text-xs {spaceType == 'virtual' ? 'bg-blue-200' : ''}"
      >virtual space</Tabs.Trigger
    >
  </Tabs.List>
</Tabs.Root>

<form class="space-y-4">
  {spaceType}
  <input type="text" placeholder="Space name" />
  <input type="text" placeholder="Address" />

  <input type="number" />
</form>
