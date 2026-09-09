'use client'

import './cardMenuBtn.css'
import Link from 'next/link'

export default function CardMenuBtnPlay(){
    return(
        // <a href="@/src/pages/BlindGame" className="card" id="card-play">
        //     Игра в слепую онлайн
        // </a>
        <Link href="/Game" className='card'>Игра в слепую онлайн</Link>
    )
}