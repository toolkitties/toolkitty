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
    <img
      src="/images/toolkitty-avatar-ok.png"
      alt="kitten holding toolkit box"
    />
  {:else if kittyHealth === "happy"}
    <img
      src="/images/toolkitty-avatar-happy.png"
      alt="happy kitten sitting inside toolkit box"
    />
  {/if}
</div>
