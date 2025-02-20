<script lang="ts">
  import { ICON_SIZE } from "$lib/constants";
  let { size = ICON_SIZE } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 28 28"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  class="icon"
>
  <rect y="11.2" width="5.6" height="5.6" fill="black" />
  <rect x="11.2" y="11.2" width="5.6" height="5.6" fill="black" />
  <rect x="22.4" y="11.2" width="5.6" height="5.6" fill="black" />
</svg>
