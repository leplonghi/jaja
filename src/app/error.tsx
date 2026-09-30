"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-16 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">Algo deu errado</h1>
      <p className="mt-2 text-muted">Não foi culpa do seu palpite. Tente de novo.</p>
      <button onClick={reset} className="btn-primary mt-8 rounded-xl px-6 py-3 text-sm">
        Tentar novamente
      </button>
    </div>
  );
}
