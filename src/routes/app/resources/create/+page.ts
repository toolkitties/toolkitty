import { resourceSchema } from "$lib/schemas";
import type { PageLoad } from "./$types";
import { superValidate, defaults } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const load: PageLoad = async () => {
  const form = defaults(zod(resourceSchema));

  return { form };
};
