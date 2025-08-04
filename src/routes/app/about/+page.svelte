<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let aboutText = `The Antiuniversity is an ongoing programme of self organised radical learning
and mutual education events. It is a collaborative experiment to challenge
academic and class hierarchy - in, outside and against existing institutional
structures. 

📆 KEY 2024 DATES 📆 
Event registrations open: 1 August 2024
Facilitation workshop: TBA (check social medias) Event Registrations close: 31
August 2024 Anti-University Festival: 12 - 19th October 2024 

1. HOW DOES THE ANTIUNI WORK? 

Anyone can organise an Antiuni event in any format, anywhere!
While the co-organisers at Antiuni HQ help administrate the platform, it's the
events' organisers who make the Antiuniversity what it is. The idea is that all
of us – organisers, hosts and guests – work collaboratively to create and share
new forms of knowledge and develop new skills. 

Past events have contained elements of the following – participation, open-ended (but structured)
discussion, collaboration, a practical workshop, a walk, an educational (or
otherwise) experiment, a public space intervention, direct action… 

There is no application process - all events are included as long as they follow the Antiuni
principles outlined here (in short - cause no harm) 

You may have a fully formed idea, with a platform and a specific audience in mind, or you might want to
discuss your ideas with us. We will be holding a facilitation session for this.

Our registration system simplifies the registration process and spreads the work
of organising a festival across all participants. You will now be able to upload
your event directly and instantly to the Antiuni website. No more boring admin
emails!`;

  // TODO: Handle update (placeholder for now)
  function handleUpdate() {
    console.log("Update functionality will be implemented here");
  }
</script>

<h1 class="text-center mb-2.5">Your festival instructions</h1>

<div class="text-center space-y-2 mb-2">
  <div class="mb-0">Find out more on how to use the Toolkitties app</div>
  <div>
    <a
      href="www.toolkitties.app"
      class="text-[color:var(--color-blue)] underline">www.toolkitties.app</a
    >
  </div>
</div>

<div class="bg-white border border-black rounded">
  <label
    for="aboutText"
    class="bg-grey-medium rounded-t flex items-center justify-between p-1.5 px-2 border-b border-b-black"
    >About Us</label
  >
  {#if data.userRole === "admin"}
    <textarea
      name="description"
      aria-invalid={"false"}
      value={aboutText}
      class="border-none"
      rows="10"
    ></textarea>
  {:else}
    <div class="p-2.5 pt-0">
      {aboutText}
    </div>
  {/if}
</div>

{#if data.userRole === "admin"}
  <div class="mt-4">
    <button
      onclick={handleUpdate}
      class="button button-grey w-full text-center"
    >
      Update
    </button>
  </div>
{/if}
