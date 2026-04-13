export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
        <a href="/" className="text-sm text-primary hover:underline">
          Return to home
        </a>
      </div>
    </main>
  );
}
