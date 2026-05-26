import { getSession } from '@/lib/auth/session';
import { logout } from '@/lib/auth/actions';

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-sm ring-1 ring-slate-200 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">You&apos;re signed in!</h1>
        <p className="mt-2 text-sm text-slate-500">
          Welcome back, <span className="font-medium text-slate-700">{session?.email}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">Dashboard coming soon.</p>

        <form action={logout} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
