import { Dialog, Dialog as DialogPrimitive } from "bits-ui";

// import custom components to be styled consistently across the app.
import Content from "./dialog-content.svelte";

// import default components that remain the unchanged from bits ui.
const Root = DialogPrimitive.Root;
const Title = DialogPrimitive.Title;
const Trigger = DialogPrimitive.Trigger;
const Close = DialogPrimitive.Close;
const Portal = DialogPrimitive.Portal
const Description = DialogPrimitive.Description

// export both custom and default.
export {
  Root,
  Title,
  Trigger,
  Content,
  Description,
  Close,
  Portal
};

/*
HOW TO USE THE COMPONENT
<Dialog.Root>
  <Dialog.Trigger></Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title></Dialog.Title>
    <Dialog.Description></Dialog.Description>
    <Dialog.Close></Dialog.Close>
    <Dialog.Close></Dialog.Close>
  </Dialog.Content>
</Dialog.Root>
*/