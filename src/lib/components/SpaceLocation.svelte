<script lang="ts">
  import PinIcon from "$lib/components/icons/PinIcon.svelte";

  let { location }: { location: Space["location"] } = $props();

  const physicalAddress = $derived(
    location.type === "physical"
      ? [
          location.street,
          location.city,
          location.state,
          location.zip,
          location.country,
        ]
          .filter(Boolean)
          .join(", ")
      : "",
  );

  const osmSearchUrl = $derived(
    `https://www.openstreetmap.org/search?query=${encodeURIComponent(physicalAddress)}`,
  );

  const osmEmbedUrl = $derived.by(() => {
    if (location.type !== "gps") return "";
    const offset = 0.01;
    const bbox = [
      location.lon - offset,
      location.lat - offset,
      location.lon + offset,
      location.lat + offset,
    ].join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${location.lat}%2C${location.lon}`;
  });
</script>

{#if location.type === "virtual"}
  <a
    class="button button-light-blue w-full justify-center text-center"
    href={location.link}
    target="_blank"
    rel="noreferrer"
  >
    Open virtual space
  </a>
{:else}
  <div class="rounded-sm bg-pink-light px-3 py-3 text-center text-[18px]">
    <span class="inline-flex items-center justify-center gap-1">
      <PinIcon size={18} />
      {location.type === "physical"
        ? physicalAddress
        : `${location.lat}, ${location.lon}`}
    </span>
  </div>

  {#if location.type === "gps"}
    <iframe
      class="mt-3 h-64 w-full rounded-sm border border-black"
      src={osmEmbedUrl}
      title="Space location on OpenStreetMap"
      loading="lazy"
    ></iframe>
    <a
      class="mt-1 block text-center text-blue underline"
      href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}#map=15/${location.lat}/${location.lon}`}
      target="_blank"
      rel="noreferrer">Open in OpenStreetMap</a
    >
  {:else}
    <a
      class="mt-2 block text-center text-blue underline"
      href={osmSearchUrl}
      target="_blank"
      rel="noreferrer">Find this address in OpenStreetMap</a
    >
  {/if}
{/if}
