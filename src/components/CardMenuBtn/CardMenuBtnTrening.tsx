import './cardMenuBtn.css'
import Link from 'next/link'

export default function CardMenuBtnTrening(){
    return(
        <Link href="/trening" className='card'>Тренировка с компьютером</Link>
    )
}