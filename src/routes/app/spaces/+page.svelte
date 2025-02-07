<script lang="ts">
  import { onMount } from "svelte";
  import SpaceRow from "../../../components/space-row.svelte";
  import { findMany as findSpaces } from "../../../lib/api/spaces";

  let spaces: Space[] = [];

  onMount(async () => {
    try {
      const fetchedSpaces = await findSpaces();
      spaces = [...fetchedSpaces];
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });
</script>

<!--@TODO - replace with 'space page text' data when set up in db & api -->
<p>
  Below is a list of all the venues that are available to host events, with time
  slots that you can book. If you have organised a place to hold your event
  yourself, you can register a new venue and even make your space available to
  other Antiuni organisers.
</p>
<p>
  ❗Deleting your place will cause all events that have chosen your place to
  disappear❗(please give us or the organisers of the event good warning if you
  wish to do so)
</p>

{#each spaces as space}
  <SpaceRow {space} />
{/each}
