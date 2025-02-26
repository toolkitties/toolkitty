/*
Parsing form data before passing to API
*/

// Spaces

export function parseSpaceFormData(
  formData: FormData,
  alwaysAvailable: boolean,
  availability: { date: string; startTime: string; endTime: string }[],
) {
  // Extract form values
  const type = formData.get("space-type") as "physical" | "gps" | "virtual";
  const name = formData.get("space-name") as string;
  const capacity = parseInt(formData.get("capacity") as string, 10);
  const accessibility = formData.get("accessibility-details") as string;
  const description = formData.get("space-description") as string;
  const contact = formData.get("contact-details") as string;
  const message = (formData.get("space-message") as string) || "";
  const multiBookable = formData.get("multi-bookable") === "true";

  // Parse location based on type
  let location: PhysicalLocation | GPSLocation | VirtualLocation = {
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  }; // Default to PhysicalLocation to satisfy TypeScript

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

  // Parse link
  const linkTitle = formData.get("space-link-text") as string;
  const linkUrl = formData.get("space-link-url") as string;
  const link: Link | null =
    linkTitle && linkUrl
      ? { type: "custom" as const, title: linkTitle, url: linkUrl }
      : null;

  // Parse availability
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
    message,
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
  // Extract form values
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const contact = formData.get("contact") as string;
  const multiBookable = formData.get("multi-bookable") === "true";

  // Parse link
  const linkTitle = formData.get("link-text") as string;
  const linkUrl = formData.get("link-url") as string;
  const link: Link | null =
    linkTitle && linkUrl
      ? { type: "custom" as const, title: linkTitle, url: linkUrl }
      : null;

  // Parse availability
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
