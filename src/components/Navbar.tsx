import Link from "next/link";
import { Compass, Lock, Plus, Trophy, Home } from "lucide-react";
import { getCurrentUser } from "@/lib/data";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

const links = [
  { href: "/eventos", label: "Explorar" },
  { href: "/ranking", label: "Ranking" },
  { href: "/cofre", label: "Meu cofre" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Lacre — página inicial">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/eventos/novo" className="btn-ghost hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold sm:inline-flex">
              <Plus size={16} aria-hidden /> Criar evento
            </Link>
            {user ? (
              <div className="group relative">
                <Link href={`/u/${user.handle}`} aria-label="Meu perfil" className="block rounded-full">
                  <Avatar name={user.display_name} src={user.avatar_url} size={38} />
                </Link>
              </div>
            ) : (
              <Link href="/login" className="btn-primary rounded-xl px-4 py-2 text-sm">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Navegação inferior no celular */}
      <nav
        aria-label="Navegação móvel"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-1.5 text-[11px] font-medium text-muted">
          <MobileLink href="/" label="Início" Icon={Home} />
          <MobileLink href="/eventos" label="Explorar" Icon={Compass} />
          <li className="flex justify-center">
            <Link href="/eventos/novo" aria-label="Criar evento" className="btn-primary -mt-6 grid size-12 place-items-center rounded-full">
              <Plus size={22} aria-hidden />
            </Link>
          </li>
          <MobileLink href="/cofre" label="Cofre" Icon={Lock} />
          <MobileLink href="/ranking" label="Ranking" Icon={Trophy} />
        </ul>
      </nav>
    </>
  );
}

function MobileLink({ href, label, Icon }: { href: string; label: string; Icon: typeof Home }) {
  return (
    <li>
      <Link href={href} className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition hover:text-fg">
        <Icon size={20} aria-hidden />
        {label}
      </Link>
    </li>
  );
}
