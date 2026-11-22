import { redirect } from 'next/navigation';

/** Accounts are removed: the app opens straight into the workspace. */
export default function LoginPage() {
  redirect('/projects');
}
