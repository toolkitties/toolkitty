<!-- 
 @component
 Button to go back to previous page
  -->

<script>
  import Icon from "@iconify/svelte";
  import ArrowIcon from "$lib/components/icons/ArrowIcon.svelte";

  function goBack() {
    window.history.back();
  }
</script>

<button
  onclick={goBack}
  class="w-9 h-9 back-button flex items-center justify-center"
>
  <ArrowIcon size={13} />
  <span class="sr-only">Back</span>
</button>

<style>
  .back-button {
    background-color: var(--color-light-yellow);
    border-radius: 50%;
    padding: 6px;
  }
</style>
