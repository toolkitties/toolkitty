<!-- 
 @component
 Avatar displayed in the header of the app.
 
 Dynamically changes between 3 states based on number of connected peers:
 - Sad: Bad network health
 - Ok: Ok network health
 - Happy: Good network health
  -->

<script lang="ts">
  type Health = "sad" | "ok" | "happy";

  let kittyHealth: Health = $state("ok");

  // TODO: get network status from backend and update avatar health state
</script>

<div class="w-10 h-full mx-auto">
  {#if kittyHealth === "sad"}
    <img
      src="/images/toolkitty-avatar-sad.png"
      alt="kitten sleeping next to toolkit box"
    />
  {:else if kittyHealth === "ok"}
    <div class="flex items-center gap-2">
      <img
        src="/images/toolkitty.png"
        alt="kitten holding toolkit box"
        width="40"
        height="42"
      />
    </div>
  {:else if kittyHealth === "happy"}
    <img
      src="/images/toolkitty-avatar-happy.png"
      alt="happy kitten sitting inside toolkit box"
    />
  {/if}
</div>
