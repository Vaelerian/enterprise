export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Enterprise</h1>
          <p className="text-sm text-muted-foreground">
            Requirements gathering platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
