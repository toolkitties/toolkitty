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
  <rect y="12" width="4" height="4" fill="black" />
  <rect x="4" y="12" width="4" height="4" fill="black" />
  <rect x="8" y="12" width="4" height="4" fill="black" />
  <rect x="12" y="12" width="4" height="4" fill="black" />
  <rect x="16" y="12" width="4" height="4" fill="black" />
  <rect x="20" y="12" width="4" height="4" fill="black" />
  <rect x="12" y="8" width="4" height="4" fill="black" />
  <rect x="12" y="4" width="4" height="4" fill="black" />
  <rect x="12" width="4" height="4" fill="black" />
  <rect x="12" y="16" width="4" height="4" fill="black" />
  <rect x="12" y="20" width="4" height="4" fill="black" />
  <rect x="12" y="24" width="4" height="4" fill="black" />
  <rect x="24" y="12" width="4" height="4" fill="black" />
</svg>
