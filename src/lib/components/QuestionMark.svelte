<!-- 
 @component
 Button question mark at header of the page
  -->

<script lang="ts">
  import QuestionIcon from "$lib/components/icons/QuestionIcon.svelte";
</script>

<button class="w-10 h-full question-mark-button ml-auto">
  <QuestionIcon size={16} />
  <span class="sr-only">Question Mark</span>
</button>

<style>
  .question-mark-button {
    background-color: var(--color-pink-light);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 6px;
  }
</style>
