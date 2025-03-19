<script lang="ts">
  type Health = "sad" | "ok" | "happy";

  let avatarHealth: Health = "ok";
</script>

<div class="w-10 h-full mx-auto">
  {#if avatarHealth === "sad"}
    <img src="/images/toolkitty-avatar-sad.png" alt="" />
  {:else if avatarHealth === "ok"}
    <img src="/images/toolkitty-avatar-ok.png" alt="" />
  {:else if avatarHealth === "happy"}
    <img src="/images/toolkitty-avatar-happy.png" alt="" />
  {/if}
</div>
