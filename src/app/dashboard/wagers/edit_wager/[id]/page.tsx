import React from 'react'
import Link from 'next/link'

const EditWager = ({ params }: { params: { id: string } }) => {
      const ID = params.id;
  return (
    <div>EditWager

       <div className='tw-flex tw-gap-4 tw-mt-4'>
            <Link href={`/dashboard/wagers`}>
                <button className='btn-transparent-white'>back</button>
            </Link>
            <button className='btn-transparent-white '>EDIT WAGER</button>
            <Link href={`/dashboard/wagers/delete_wager/${ID}`}>
                <button className='btn-transparent-red'>DELETE WAGER</button> 
            </Link>
        </div>

    </div>
  )
}

export default EditWager