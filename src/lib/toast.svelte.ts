// Set default timeout for toast
const TOAST_TIMEOUT = 5000;

type ToastType = "success" | "error" | "info";
class Toast {
  message: string;
  id: number;
  type: ToastType;
  link?: string;
  request?: RequestEvent; // opens a modal for the user to respond to the request quickly

  constructor(
    message: string,
    id: number,
    type: ToastType,
    link: string,
    request: RequestEvent,
  ) {
    this.message = message;
    this.id = id;
    this.type = type;
    this.link = link;
    this.request = request;
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
  autoDismiss: boolean = $state(true);
  /**
   * Array of toasts to show the user
   */
  toasts: Toast[] = $state([]);

  constructor() {
    this.toasts = [];
  }

  // Public methods to create new toasts
  success(message: string, options?: { link?: string }) {
    this.addToast("success", message, options);
  }

  error(message: string, options?: { link?: string }) {
    this.addToast("error", message, options);
  }

  info(message: string, options?: { link?: string; request?: RequestEvent }) {
    this.addToast("info", message, options);
  }

  /**
   * Show access request toast to the user
   */
  accessRequest(data: AccessRequest) {
    const message = data.name + " requested access";
    const request: RequestEvent = {
      type: "access_request",
      data,
    };
    this.addToast("info", message, { request });
  }

  /**
   * Show booking request toast to the user
   */
  bookingRequest(data: BookingRequestEnriched) {
    const name =
      data.resourceType === "space" ? data.space?.name : data.resource?.name;
    const message =
      "new booking request for " + (name ? name : data.resourceId);
    const request: RequestEvent = {
      type: "booking_request",
      data,
    };
    this.addToast("info", message, { request });
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }

  //TODO: Only show new toasts to the user when dialog is closed
  private addToast(
    type: ToastType,
    message: string,
    options?: { link?: string; request?: RequestEvent },
  ) {
    // Create unique id for toast so it can be easily removed.
    const id = Math.floor(Math.random() * 1000000);

    const toast: Toast = {
      id,
      message,
      type,
      link: options?.link,
      request: options?.request,
    };

    // Push new toast to top of list
    this.toasts.push(toast);

    this.dismissToastTimeout(toast.id);
  }

  /**
   * Timeout function that either dismissed the toast
   * or calls itself if dismissing toasts is paused
   */
  private dismissToastTimeout(id: number) {
    const timeout = setTimeout(() => {
      console.log("dismissing toast: " + this.autoDismiss);
      if (this.autoDismiss) {
        clearTimeout(timeout);
        this.dismissToast(id);
      } else {
        clearTimeout(timeout);
        this.dismissToastTimeout(id);
      }
    }, TOAST_TIMEOUT);
  }
}

export const toast = new Toasts();
