<script lang="ts">
  import AvailabilitySetter from "$lib/components/AvailabilitySetter.svelte";
  import { create } from "$lib/api/spaces";

  let { formType } = $props();
  let availability: { date: string; startTime: string; endTime: string }[] =
    $state([]);
  let alwaysAvailable = $state(false);

  function updateAvailability(
    newAvailability: { date: string; startTime: string; endTime: string }[],
  ) {
    availability = newAvailability;
  }
  async function handleCreateSpace(e: Event) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

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

    // Prepare the payload
    const payload: SpaceFields = {
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
    };

    console.log("Final Payload:", payload);

    try {
      const response = await create(payload);
      console.log("Space created with ID:", response);
    } catch (error) {
      console.error("Error creating space:", error);
    }
  }

  let selectedSpaceType = $state("physical");
</script>

<form onsubmit={handleCreateSpace}>
  <fieldset>
    <label for="physical">Physical Location</label>
    <input
      type="radio"
      name="space-type"
      value="physical"
      bind:group={selectedSpaceType}
      checked
    />
    <label for="gps">GPS coordinates</label>
    <input
      type="radio"
      name="space-type"
      value="gps"
      bind:group={selectedSpaceType}
    />
    <label for="virtual">Virtual Space</label>
    <input
      type="radio"
      name="space-type"
      value="virtual"
      bind:group={selectedSpaceType}
    />
  </fieldset>

  <label for="space-name">Space Name*</label>
  <input type="text" name="space-name" required />
  {#if selectedSpaceType === "physical"}
    <fieldset>
      <legend>Address</legend>
      <label for="address-street">Street</label>
      <input type="text" name="address-street" required />
      <label for="address-city">City</label>
      <input type="text" name="address-city" required />
      <label for="address-state">State</label>
      <input type="text" name="address-state" required />
      <label for="address-zip">Zip</label>
      <input type="text" name="address-zip" required />
      <label for="address-country">Country</label>
      <input type="text" name="address-country" required />
    </fieldset>
  {/if}
  {#if selectedSpaceType === "gps"}
    <fieldset>
      <legend>Co-ordinates</legend>
      <label for="address-lat">Latitude*</label>
      <input type="number" name="address-lat" required />
      <label for="address-lon">Longitude*</label>
      <input type="number" name="address-lon" required />
    </fieldset>
  {/if}
  {#if selectedSpaceType === "virtual"}
    <label for="address-virtual">Link to virtual space*</label>
    <input type="text" name="address-virtual" required />
  {/if}
  <label for="capacity">Capacity*</label>
  <input type="number" name="capacity" required />
  <label for="accessibility-details">Accessibility Details*</label>
  <textarea name="accessibility-details" required></textarea>
  <label for="space-description">Space Description*</label>
  <textarea name="space-description" required></textarea>
  <label for="contact-details">Contact Details*</label>
  <input type="text" name="contact-details" required />

  <fieldset>
    <legend>🔗 Useful link (website, social media)</legend>
    <div class="flex flex-row">
      <div>
        <label for="space-link-text">Link Title</label>
        <input type="text" name="space-link-text" />
      </div>
      <div>
        <label for="space-link-url">URL</label>
        <input type="url" name="space-link-url" />
      </div>
    </div>
  </fieldset>

  <label for="space-message">Your message to anyone booking this space</label>
  <input
    type="text"
    name="space-message"
    placeholder="Please let me know in advance if..."
  />

  <p>Space availability</p>

  {#if !alwaysAvailable}
    <AvailabilitySetter
      {availability}
      onUpdateAvailability={updateAvailability}
    />
  {/if}

  <label>
    <input type="checkbox" bind:checked={alwaysAvailable} />
    Always Available
  </label>

  <p>Can this space have multiple bookings at the same time?</p>
  <fieldset>
    <label for="multi-bookable">Yes</label>
    <input type="radio" name="multi-bookable" value="true" />
    <label for="multi-bookable">No</label>
    <input type="radio" name="multi-bookable" value="false" checked />
  </fieldset>

  {#if formType === "create"}
    <button type="submit">Create Space</button>
  {/if}
  {#if formType === "edit"}
    <button type="submit">Update Space</button>
  {/if}
</form>
