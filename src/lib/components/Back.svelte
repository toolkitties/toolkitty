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

<button onclick={goBack} class="w-10 h-full">
  <Icon class="h-6 w-6" icon="lucide:arrow-left" />
  <span class="sr-only">Back</span>
</button>
