// Stub — OTP verification is handled inline on /login (phone tab).
// This page is a placeholder for a future register-with-phone flow.
export default function VerifyOtpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Verify your phone</h1>
        <p className="text-sm text-muted-foreground">
          OTP verification is handled on the{" "}
          <a href="/login" className="text-primary hover:underline">
            sign-in page
          </a>
          .
        </p>
      </div>
    </main>
  );
}
