<script>
  import "../../app.css";
  import Back from "../../components/back.svelte";
  import { page } from "$app/stores";

  let indexPage = $derived($page.url.pathname == "/");
</script>

<main class="p-8 flex flex-col gap-4 h-dvh">
  <!-- to do: move to header component -->
  {#if !indexPage}
    <div class="fixed top-2 left-2">
      <Back />
    </div>
  {/if}
  <slot />
</main>
