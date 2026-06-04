import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-muted">Страница не найдена</p>
      <Link href="/stickers" className="link-tech text-sm">
        На наклейку
      </Link>
    </div>
  );
}
