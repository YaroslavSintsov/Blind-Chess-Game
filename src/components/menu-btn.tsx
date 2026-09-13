import Link from 'next/link';

export default function MenuBtn() {
  return (
    <Link href={'/menu'} className="menu-href">Меню</Link>
  );
}