import React from 'react'
import Link from 'next/link'

const DeleteWager = ({ params }: { params: { id: string } }) => {
      const ID = params.id;
  return (
    <div>
        <div>DeleteWager</div>
        <div>Are you sure you want to delete wager:</div>

        <div className='tw-flex tw-gap-4 tw-mt-4'>
            <Link href={`/dashboard/wagers`}>
                <button className='btn-transparent-white'>back</button>
            </Link>
            <Link href={`/dashboard/wagers/delete_wager/${ID}`}>
                <button className='btn-transparent-red'>DELETE WAGER</button> 
            </Link>
        </div>
    </div>
  )
}

export default DeleteWager