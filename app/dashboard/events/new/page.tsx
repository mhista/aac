import { redirect } from "next/navigation";

/**
 * Retired route.
 *
 * This used to create a draft while rendering and forward into the editor.
 * That is not allowed — Next refuses a revalidatePath during render — and it
 * was the wrong shape regardless: a link prefetch, a refresh or a back-button
 * press each created another "Untitled event". Creating a row is a POST now,
 * driven by the New event button on the events list.
 *
 * Kept as a redirect rather than deleted so any bookmark or stale link lands
 * somewhere sensible instead of a 404.
 */
export default function NewEventRedirect() {
  redirect("/dashboard/events");
}
