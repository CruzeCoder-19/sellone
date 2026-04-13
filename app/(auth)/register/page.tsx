import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join Wolsell — India&apos;s B2B marketplace.
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
