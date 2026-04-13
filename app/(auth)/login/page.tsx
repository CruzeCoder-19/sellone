import { LoginForm } from "./LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Wolsell</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Sign in to continue.
          </p>
        </div>
        <LoginForm callbackUrl={callbackUrl ?? "/customer"} />
      </div>
    </main>
  );
}
