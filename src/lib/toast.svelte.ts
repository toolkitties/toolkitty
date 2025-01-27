// Set default timeout for toast
const TOAST_TIMEOUT = 5000;

type ToastType = "success" | "error" | "info";
class Toast {
  message: string;
  id: number;
  type: ToastType;
  link?: string;

  constructor(message: string, id: number, type: ToastType) {
    this.message = message;
    this.id = id;
    this.type = type;
    this.link = "";
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

  private addToast(type: ToastType, message: string, link?: string) {

    // Create unique id for toast so it can be easily removed.
    const id = Math.floor(Math.random() * 1000000);

    const toast: Toast = {
      id,
      message,
      type,
      link,
    }

    // Push new toast to top of list
    this.toasts.push(toast)

    // Remove toast after certain amount of time
    setTimeout(() => this.dismissToast(id), TOAST_TIMEOUT);
  }

  private dismissToast(id: number) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }
}

export const toast = new Toasts();