import Link from "next/link"
import Image from "next/image"

export function AuthBrand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 self-center font-medium text-foreground"
    >
      <Image
        src="/logo.svg"
        alt="Clars.ai"
        width={120}
        height={30}
        className="h-8 w-auto"
        priority
      />
    </Link>
  )
}
