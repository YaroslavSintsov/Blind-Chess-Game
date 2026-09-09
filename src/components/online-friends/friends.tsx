import '../../../app/globals.css'

export default function Friends(){
    return(
        <>
            <button className="friends-online" id='button-friends'>
                Онлайн - друзей
            </button>
            <div className="friends-modal" id='modal-friends'>
                <p className="account-name">User228</p>
            </div>
        </>
    )
}