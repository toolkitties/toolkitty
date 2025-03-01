import { AlertDialog as AlertDialogPrimitive } from "bits-ui";

// import custom components to be styled consistently across the app.
import Content from "./DialogContent.svelte";

// import default components that remain the unchanged from bits ui.
const Root = AlertDialogPrimitive.Root;
const Title = AlertDialogPrimitive.Title;
const Trigger = AlertDialogPrimitive.Trigger;
const Action = AlertDialogPrimitive.Action;
const Cancel = AlertDialogPrimitive.Cancel;
const Portal = AlertDialogPrimitive.Portal;
const Description = AlertDialogPrimitive.Description;

// export both custom and default.
export {
  Root,
  Title,
  Trigger,
  Content,
  Description,
  Action,
  Cancel,
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