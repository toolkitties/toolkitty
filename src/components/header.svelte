<script>
  import Back from "./back.svelte";

  let { title = "Default Title" } = $props();
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="fixed top-0 left-0 p-2 right-2 flex items-center w-full bg-white">
  <Back />
  <h1 class="grow text-center">{title}</h1>
  <div class="w-[42px]"></div>
</div>
