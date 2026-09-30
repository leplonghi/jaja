import Link from "next/link";
import { Compass, Home, Lock, Plus, Trophy } from "lucide-react";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/data";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

export async function Navbar() {
  const [{ t }, viewer] = await Promise.all([getT(), getViewer()]);
  const links = [
    { href: "/explore", label: t("nav.explore") },
    { href: "/ranking", label: t("nav.ranking") },
    { href: "/vault", label: t("nav.vault") },
  ];
  return (
    <>
      <header className="sticky top-0 z-40 border-b-[1.5px] border-ink bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label={`${t("brand.name")} — ${t("nav.home")}`}>
            <Logo size={34} />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label={t("nav.main")}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink hover:text-paper">
                {l.label}
              </Link>
            ))}
            {viewer?.is_staff && (
              <Link href="/admin" className="rounded-full px-4 py-2 text-sm font-medium text-signal-deep transition hover:bg-ink hover:text-paper">
                {t("nav.admin")}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/new" className="btn btn-signal hidden px-4 py-2.5 text-sm sm:inline-flex">
              <Plus size={16} aria-hidden /> {t("nav.new")}
            </Link>
            {viewer ? (
              <>
                <Link href={`/u/${viewer.handle}`} aria-label={t("nav.profile")} className="block rounded-full">
                  <Avatar name={viewer.display_name} src={viewer.avatar_url} size={38} />
                </Link>
                <form action="/auth/signout" method="post" className="hidden md:block">
                  <button type="submit" className="rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-ink hover:text-paper">
                    {t("nav.logout")}
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-ink px-4 py-2.5 text-sm">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav aria-label={t("nav.mobile")} className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-ink bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-1.5 text-[11px] font-medium">
          <MobileLink href="/" label={t("nav.home")} Icon={Home} />
          <MobileLink href="/explore" label={t("nav.explore")} Icon={Compass} />
          <li className="flex justify-center">
            <Link href="/new" aria-label={t("nav.new")} className="btn btn-signal -mt-7 size-14">
              <Plus size={24} aria-hidden />
            </Link>
          </li>
          <MobileLink href="/vault" label={t("nav.vault")} Icon={Lock} />
          <MobileLink href="/ranking" label={t("nav.ranking")} Icon={Trophy} />
        </ul>
      </nav>
    </>
  );
}

function MobileLink({ href, label, Icon }: { href: string; label: string; Icon: typeof Home }) {
  return (
    <li>
      <Link href={href} className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition hover:text-signal-deep">
        <Icon size={20} aria-hidden />
        {label}
      </Link>
    </li>
  );
}
