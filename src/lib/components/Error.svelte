<!-- 
 @component
 Generic error component, used anytime we want to show an error to the user.
  -->

<script lang="ts">
  import { page } from "$app/state";
</script>

<div class="flex flex-col items-center justify-center">
  <span>(*_*)</span>
  <h1>{page.error?.message}</h1>
</div>
