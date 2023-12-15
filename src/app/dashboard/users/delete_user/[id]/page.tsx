"use client"
import React, {useEffect, useState} from 'react'
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const DeleteUser = ({ params }: { params: { id: string } }) => {
      const router = useRouter()
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

    const handleDelete = async () => {
        const res = await fetch('/api/users/delete?user_id=' + ID, {
            method: 'PUT',
        })
        const json = await res.json()
        if (!res.ok) throw Error(json.message)
        alert('User Deleted')
        router.push('/dashboard/users')
    }


  return (
    <div className='section-container tw-mt-4'>
        <div className='tw-font-bold'>Delete User</div>
        <div>Are you sure you want to delete user: {JSON.stringify(data)}</div>
        <div className='tw-flex tw-mt-4 tw-gap-4'>
            <Link href={`/dashboard/users`}>
                <button className='btn-transparent-white'>back</button>
            </Link>
                <button className='btn-transparent-red' onClick={handleDelete}>DELETE USER</button> 
            
        </div>
    </div>
  )
}

export default DeleteUser