import './cardMenuBtn.css'
import Link from 'next/link'

export default function CardMenuBtnTactics(){
    return(
        <Link href="/tactics" className='card'>Задачи по игре в слепую</Link>
    )
}
