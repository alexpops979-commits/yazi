import { redirect } from 'next/navigation';

/** Plans are removed from this build: every feature is available to everyone. */
export default function BillingPage() {
  redirect('/projects');
}
