import { redirect } from 'next/navigation';

/** Invitations belong to the accounts model, which is disabled. */
export default function InvitePage() {
  redirect('/projects');
}
