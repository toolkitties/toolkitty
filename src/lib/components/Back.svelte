<!-- 
 @component
 Button to go back to previous page
  -->

<script>
  import Icon from "@iconify/svelte";

  function goBack() {
    window.history.back();
  }
</script>

<button on:click={goBack} class="w-10 h-10 bg-light-yellow rounded-full">
  <Icon class="h-6 w-6" icon="lucide:arrow-left" />
  <span class="sr-only">Back</span>
</button>

<style>
</style>
