import type { PageLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { resources } from "$lib/api";
import { superValidate } from "sveltekit-superforms";
import { zod } from 'sveltekit-superforms/adapters';
import { resourceSchema } from "$lib/schemas";

export const load: PageLoad = async ({ params }) => {
  const resourceId = params.id;

  const resource = await resources.findById(resourceId);

  if (!resource) {
    error(404, {
      message: 'Resource not found'
    });
  }

  const form = await superValidate(resource, zod(resourceSchema));

  return { title: "edit resource", form };
};
