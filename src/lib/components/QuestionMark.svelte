<!-- 
 @component
 Button question mark at header of the page
  -->

<script>
  import Icon from "@iconify/svelte";
</script>

<button class="w-10 h-full question-mark-button ml-auto">
  <img src="/images/question_mark.svg" alt="question mark" />
  <span class="sr-only">Question Mark</span>
</button>

<style>
  .question-mark-button {
    background-color: var(--color-pink-light);
    border-radius: 50%;
    display: flex; /* Dodano */
    justify-content: center; /* Dodano */
    align-items: center; /* Dodano */
  }
</style>
