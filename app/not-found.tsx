import Link from "next/link";
import "./not-found.css";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="all">
      <div className="not-found">
        <div className="not-found-card">

        </div>
        <p className="title">404 - Страница не найдена</p>
        <p className="not-found-message">Извините, страница, которую вы ищете, не существует.</p>
        <Link href="/" className="not-found-link">Вернуться на главную</Link>
      </div>
    </div>
  );
}