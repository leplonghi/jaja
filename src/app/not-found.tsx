import Link from "next/link";
import { SealMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-16 text-center">
      <SealMark size={72} className="opacity-70 grayscale" />
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Nada por aqui</h1>
      <p className="mt-2 text-muted">Esse lacre não existe, ou a página foi movida.</p>
      <Link href="/" className="btn-primary mt-8 rounded-xl px-6 py-3 text-sm">
        Voltar ao início
      </Link>
    </div>
  );
}
