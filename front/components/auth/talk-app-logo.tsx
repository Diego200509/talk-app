import Image from "next/image";

type Props = { className?: string };

const SRC = "/img/Talk-app_sin-fondo.png";

export function TalkAppLogo({ className = "" }: Props) {
  return (
    <Image
      src={SRC}
      alt="TalkApp"
      width={400}
      height={124}
      priority
      className={`h-auto w-[200px] object-contain object-center sm:w-[240px] lg:w-[min(100%,400px)] lg:object-left ${className}`}
    />
  );
}
