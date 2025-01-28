// Set default timeout for toast
const TOAST_TIMEOUT = 5000;

type ToastType = "success" | "error" | "info";
class Toast {
  message: string;
  id: number;
  type: ToastType;
  link?: string;
  actionRequired: boolean;

  constructor(message: string, id: number, type: ToastType, actionRequired: boolean) {
    this.message = message;
    this.id = id;
    this.type = type;
    this.link = "";
    this.actionRequired = actionRequired;
  }
}

/**
 * ```
 *  _   __   
 * ( `︶` )) 
 * |     ||  
 * |     || 
 * '-----'`
 * ```
 * Toasts are temporary messages shown to the user when certain events happen.
 * They can contain a link which will direct the user to another page.
 * 
 */

class Toasts {
  /**
   * Determines if toasts disappear automatically, false when dialog is open so user doesn't miss any new toasts
   */
  autoDismiss: boolean = $state(true)
  /**
   * Array of toasts to show the user
   */
  toasts: Toast[] = $state([]);

  constructor() {
    this.toasts = [];
  }

  // Public methods to create new toasts
  success(message: string, link?: string) {
    this.addToast("success", message, link);
  }

  error(message: string, link?: string) {
    this.addToast("error", message, link);
  }

  info(message: string, link?: string) {
    this.addToast("info", message, link)
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }

  //TODO: Only show new toasts to the user when dialog is closed
  private addToast(type: ToastType, message: string, link?: string) {

    // Create unique id for toast so it can be easily removed.
    const id = Math.floor(Math.random() * 1000000);

    const actionRequired = true

    const toast: Toast = {
      id,
      message,
      type,
      link,
      actionRequired
    }

    // Push new toast to top of list
    this.toasts.push(toast)

    this.dismissToastTimeout(toast.id)
  }

  /**
   * Timeout function that either dismissed the toast
   * or calls itself if dismissing toasts is paused
   */
  private dismissToastTimeout(id: number) {
    const timeout = setTimeout(() => {
      console.log('dismissing toast: ' + this.autoDismiss)
      if (this.autoDismiss) {
        clearTimeout(timeout);
        this.dismissToast(id);
      } else {
        clearTimeout(timeout);
        this.dismissToastTimeout(id);
      }
    }, TOAST_TIMEOUT)
  }
}

export const toast = new Toasts();