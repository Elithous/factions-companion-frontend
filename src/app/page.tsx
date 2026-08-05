import { redirect } from "next/navigation";

/** The app has no landing page of its own — stats is the default view. */
export default function HomePage() {
  redirect('/stats');
}
