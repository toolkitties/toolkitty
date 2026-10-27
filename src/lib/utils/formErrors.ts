export function hasFormErrors(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasFormErrors);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasFormErrors);
  }
  return false;
}

export function scrollToFirstFormError() {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(
      'form [aria-invalid="true"], form .form-error',
    );
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      target.focus({ preventScroll: true });
    }
  });
}
