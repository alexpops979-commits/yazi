import { redirect } from 'next/navigation';

/** Accounts are removed: registration is not available. */
export default function RegisterPage() {
  redirect('/projects');
}
