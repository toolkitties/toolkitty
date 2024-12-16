import { Dialog as DialogPrimitive } from "bits-ui";

// import custom components to be styled consistently across the app.
import Content from "./dialog-content.svelte";

// import default components that remain the unchanged from bits ui.
const Root = DialogPrimitive.Root;
const Title = DialogPrimitive.Title;
const Trigger = DialogPrimitive.Trigger;
const Close = DialogPrimitive.Close;

// export both custom and default.
export {
  Root,
  Title,
  Trigger,
  Content,
  Close,
};

/*
HOW TO USE THE COMPONENT
<Dialog.Root>
  <Dialog.Trigger></Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title></Dialog.Title>
    <Dialog.Close></Dialog.Close>
    <Dialog.Close></Dialog.Close>
  </Dialog.Content>
</Dialog.Root>
*/