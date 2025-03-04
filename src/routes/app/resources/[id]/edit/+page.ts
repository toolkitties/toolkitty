import type { PageLoad } from "./$types";
import { resources } from "$lib/api";
import { superValidate } from "sveltekit-superforms";
import { zod } from 'sveltekit-superforms/adapters';
import { resourceSchema } from "$lib/schemas";

export const load: PageLoad = async ({ params }) => {
  const resourceId = params.id;

  const resource = await resources.findById(resourceId);
  const form = await superValidate(resource, zod(resourceSchema));

  return { title: "edit resource", resource };
};
