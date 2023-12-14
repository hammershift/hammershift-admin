"use client"
import React, {useEffect, useState} from 'react'
import Link from 'next/link';

const DeleteUser = ({ params }: { params: { id: string } }) => {
      const ID = params.id;
      const [data, setData] = useState<any>(null)

    useEffect(() => {
        const fetchData = async () => {
        const res = await fetch('/api/users?user_id=' + ID)
        const json = await res.json()
        setData(json)
        }
        fetchData()
    },[])


  return (
    <div className='section-container tw-mt-4'>
        <div className='tw-font-bold'>Delete User</div>
        <div>Are you sure you want to delete user: {JSON.stringify(data)}</div>
        <div className='tw-flex tw-mt-4 tw-gap-4'>
            <Link href={`/dashboard/users`}>
                <button className='btn-transparent-white'>back</button>
            </Link>
            <Link href={`/dashboard/users/delete_user/${ID}`}>
                <button className='btn-transparent-red'>DELETE USER</button> 
            </Link>
        </div>
    </div>
  )
}

export default DeleteUser