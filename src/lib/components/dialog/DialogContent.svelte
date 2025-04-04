<!-- 
 @component
 Generic dialog content component for consistent styling across all dialogs in the app
  -->

<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
  import Icon from "@iconify/svelte";

  let { children } = $props();
</script>

<AlertDialogPrimitive.Portal>
  <!-- TODO: Add transition back to overlay -->
  <AlertDialogPrimitive.Overlay
    class="fixed inset-0 z-40 backdrop-blur-sm bg-black/30"
  />
  <AlertDialogPrimitive.Content
    interactOutsideBehavior="close"
    class="fixed bottom-0 left-0 z-50 bg-white px-5 pt-10 pb-[70px] w-full text-center"
  >
    <!-- TODO: Add transitions back in -->
    <div class="space-y-[15px]">
      {@render children()}
    </div>
    <AlertDialogPrimitive.Cancel class="absolute right-5 top-5 mt-0">
      <Icon class="h-6 w-6 rotate-45" icon="lucide:plus" />
    </AlertDialogPrimitive.Cancel>
  </AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
