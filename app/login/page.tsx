import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * The form reads `?next=` with useSearchParams, which forces a client bailout.
 * Wrapping it in Suspense keeps the rest of the route static and gives people
 * something to look at while it hydrates, rather than a blank screen.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center px-5">
          <p className="mono">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
