import type { PageLoad } from "./$types";
import { spaceSchema } from "$lib/schemas";
import { error } from '@sveltejs/kit';
import { spaces } from "$lib/api";
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load: PageLoad = async ({ params }) => {
  const spaceId = params.id;

  const space = await spaces.findById(spaceId);

  if (!space) {
    error(404, {
      message: 'Space not found'
    });
  }

  const form = await superValidate(space, zod(spaceSchema));


  return { title: "edit space", space };
};
