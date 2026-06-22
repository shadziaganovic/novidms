export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold text-slate-900">NOVIDMS</h1>
      <p className="text-lg text-slate-600">
        Multi-tenant DMS — <span className="font-semibold">ubaci → nađi</span>
      </p>
      <div className="flex gap-3">
        <a href="/login" className="btn-primary">
          Prijava
        </a>
        <a href="/register" className="btn-secondary">
          Registracija firme
        </a>
      </div>
    </main>
  );
}
