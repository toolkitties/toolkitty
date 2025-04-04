<!-- 
 @component
 Contribute button displayed on events, spaces and resources page.
 Allows the user to quickly navigate to create pages.
  -->

<script lang="ts">
  let contributeButtonOpen: boolean = $state(false);
</script>

<div class="relative">
  <div class="fixed bottom-20 right-4 z-20 flex flex-col items-end space-y-2">
    {#if contributeButtonOpen}
      <div class="flex flex-col items-end space-y-2">
        <a href="/app/spaces/create" class="bg-white">Space</a>
        <a href="/app/resources/create" class="bg-white">Resource</a>
        <a href="/app/events/create" class="bg-white">Event</a>
      </div>
    {/if}

    <button
      onclick={() => (contributeButtonOpen = !contributeButtonOpen)}
      class="bg-black text-white"
    >
      Contribute
    </button>
  </div>
</div>
