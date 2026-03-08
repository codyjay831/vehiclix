export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-red-50/50">
      <h1 className="text-4xl font-bold tracking-tight text-red-900">Admin Dashboard (Owner only)</h1>
      <p className="mt-4 text-red-700">Protected route: /admin/*</p>
    </div>
  );
}
