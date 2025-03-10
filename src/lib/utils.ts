/*
Parsing form data before passing to API
*/

// Calendars
export function parseCalendarData(formData: FormData, noEndDate: boolean) {
  let endDate;
  if (noEndDate) {
    endDate = null;
  } else {
    endDate = formData.get("calendar-end-date") as Date | null;
  }
  const name = formData.get("name") as string;
  const dates = [
    {
      start: formData.get("calendar-start-date") as Date | null,
      end: endDate,
    },
  ] as TimeSpan[];
  const festivalInstructions = formData.get("festival-instructions") as
    | string
    | null;
  const spacePageText = formData.get("space-page-text") as string | null;
  const resourcePageText = formData.get("resource-page=text") as string | null;

  return {
    name,
    dates,
    festivalInstructions,
    spacePageText,
    resourcePageText,
  } as CalendarFields;
}

// Spaces

export function parseSpaceFormData(
  formData: FormData,
  alwaysAvailable: boolean,
  availability: { date: string; startTime: string; endTime: string }[],
) {
  const type = formData.get("space-type") as "physical" | "gps" | "virtual";
  const name = formData.get("space-name") as string;
  const capacity = parseInt(formData.get("capacity") as string, 10);
  const accessibility = formData.get("accessibility-details") as string;
  const description = formData.get("space-description") as string;
  const contact = formData.get("contact-details") as string;
  const messageForRequesters = (formData.get("space-message") as string) || "";
  const multiBookable = formData.get("multi-bookable") === "true";

  let location: PhysicalLocation | GPSLocation | VirtualLocation = {
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  };
  if (type === "physical") {
    location = {
      street: formData.get("address-street") as string,
      city: formData.get("address-city") as string,
      state: formData.get("address-state") as string,
      zip: formData.get("address-zip") as string,
      country: formData.get("address-country") as string,
    };
  } else if (type === "gps") {
    location = {
      lat: (formData.get("address-lat") as string).trim(),
      lon: (formData.get("address-lon") as string).trim(),
    };
  } else if (type === "virtual") {
    location = formData.get("address-virtual") as string;
  }

  const linkTitle = formData.get("space-link-text") as string;
  const linkUrl = formData.get("space-link-url") as string;
  const link: Link | null =
    linkTitle && linkUrl
      ? { type: "custom" as const, title: linkTitle, url: linkUrl }
      : null;

  let parsedAvailability: TimeSpan[] | "always";
  if (alwaysAvailable) {
    parsedAvailability = "always";
  } else {
    parsedAvailability = availability.map(({ date, startTime, endTime }) => ({
      start: new Date(`${date}T${startTime}`),
      end: new Date(`${date}T${endTime}`),
    }));
  }

  return {
    type,
    name,
    location,
    capacity,
    accessibility,
    description,
    contact,
    link,
    messageForRequesters,
    images: [],
    availability: parsedAvailability,
    multiBookable,
  } as SpaceFields;
}

// Resources

export function parseResourceFormData(
  formData: FormData,
  alwaysAvailable: boolean,
  availability: { date: string; startTime: string; endTime: string }[],
) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const contact = formData.get("contact") as string;
  const multiBookable = formData.get("multi-bookable") === "true";

  const linkTitle = formData.get("link-text") as string;
  const linkUrl = formData.get("link-url") as string;
  const link: Link | null =
    linkTitle && linkUrl
      ? { type: "custom" as const, title: linkTitle, url: linkUrl }
      : null;

  let parsedAvailability: TimeSpan[] | "always";
  if (alwaysAvailable) {
    parsedAvailability = "always";
  } else {
    parsedAvailability = availability.map(({ date, startTime, endTime }) => ({
      start: new Date(`${date}T${startTime}`),
      end: new Date(`${date}T${endTime}`),
    }));
  }

  return {
    name,
    description,
    contact,
    link,
    availability: parsedAvailability,
    multiBookable,
  } as ResourceFields;
}

// Events

export function parseEventFormData(
  formData: FormData,
  selectedSpace: Space | null,
) {
  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;

  const safeName = name ?? "";
  const safeDescription = description ?? "";

  const ticketLinkTitle = formData.get("ticket-link-text") as string | null;
  const ticketLinkUrl = formData.get("ticket-link-url") as string | null;
  const ticketLink =
    ticketLinkTitle && ticketLinkUrl
      ? { type: "ticket" as const, title: ticketLinkTitle, url: ticketLinkUrl }
      : null;

  const additionalLinkTitle = formData.get("additional-link-text") as
    | string
    | null;
  const additionalLinkUrl = formData.get("additional-link-url") as
    | string
    | null;
  const additionalLink =
    additionalLinkTitle && additionalLinkUrl
      ? {
          type: "custom" as const,
          title: additionalLinkTitle,
          url: additionalLinkUrl,
        }
      : null;

  const spaceId = selectedSpace ? selectedSpace.id : null;

  const startDate = formData.get("event-start-date") as string | null;
  const startTime = formData.get("event-start-time") as string | null;
  const endDate = formData.get("event-end-date") as string | null;
  const endTime = formData.get("event-end-time") as string | null;

  const startDateTime = new Date(`${startDate}T${startTime}`);
  const endDateTime = new Date(`${endDate}T${endTime}`);

  const selectedResources: string[] = [];
  formData.forEach((value, key) => {
    if (key.startsWith("resource-")) {
      selectedResources.push(value as string);
    }
  });

  const links: { type: "custom" | "ticket"; title: string; url: string }[] = [];
  if (ticketLink) links.push(ticketLink);
  if (additionalLink) links.push(additionalLink);

  return {
    name: safeName,
    description: safeDescription,
    spaceId,
    startDate: startDateTime,
    endDate: endDateTime,
    links,
    images: [],
    resources: selectedResources,
  };
}

// Availability

export function isSubTimespan(
  startDate: Date,
  endDate: Date | undefined,
  timeSpan: TimeSpan,
): boolean {
  if (endDate == undefined) {
    return timeSpan.end > startDate;
  }

  return timeSpan.end > startDate || timeSpan.start < endTate;
}
