<script lang="ts">
  type Health = "sad" | "ok" | "happy";

  let avatarHealth: Health = "ok";
</script>

<div class="w-10 h-full mx-auto">
  {#if avatarHealth === "sad"}
    <img
      src="/images/toolkitty-avatar-sad.png"
      alt="kitten sleeping next to toolkit box"
    />
  {:else if avatarHealth === "ok"}
    <img
      src="/images/toolkitty-avatar-ok.png"
      alt="kitten holding toolkit box"
    />
  {:else if avatarHealth === "happy"}
    <img
      src="/images/toolkitty-avatar-happy.png"
      alt="happy kitten sitting inside toolkit box"
    />
  {/if}
</div>
