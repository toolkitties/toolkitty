<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";
  import Icon from "@iconify/svelte";
  import { fade, slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
</script>

<DialogPrimitive.Portal>
  <DialogPrimitive.Overlay
    transition={fade}
    transitionConfig={{ duration: 100 }}
    class="fixed inset-0 z-50 backdrop-blur bg-black/30"
  />
  <DialogPrimitive.Content
    transition={slide}
    transitionConfig={{ axis: "y", easing: quintOut }}
    class="fixed bottom-0 left-0 z-50 bg-white px-5 pt-10 pb-[70px] w-full text-center"
    {...$$restProps}
  >
    <div class="space-y-[15px]">
      <slot />
    </div>
    <DialogPrimitive.Close class="absolute right-5 top-5 mt-0">
      <Icon class="h-6 w-6 rotate-45" icon="lucide:plus" />
    </DialogPrimitive.Close>
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>
