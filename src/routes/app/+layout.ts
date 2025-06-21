import type { LayoutLoad } from "./$types";
import { goto } from "$app/navigation";
import { access, users } from "$lib/api";

export const load: LayoutLoad = async ({ parent }) => {
  const parentData = await parent();
  const { publicKey, activeCalendarId } = parentData;

  if (!activeCalendarId) {
    goto("/");
  }

  const accessStatus = await access.checkStatus(publicKey, activeCalendarId);

  if (accessStatus == "pending") {
    // access status is pending, go to pending page
    goto("/request");
    return;
  }

  // TODO: handle rejected state. Where do we go?

  const user = await users.get(activeCalendarId!, publicKey);
  const userRole = user?.role;

  return {
    activeCalendarId: activeCalendarId as string,
    userRole,
  };
};
