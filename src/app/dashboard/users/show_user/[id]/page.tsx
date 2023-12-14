"use client"
import React, { useEffect, useState } from 'react'
import {useRouter} from 'next/navigation';

const ShowUser = ({ params }: { params: { id: string } }) => {
  const [data, setData] = useState({})
  const router = useRouter();
  const ID = params.id;

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/users?user_id=' + ID)
      const json = await res.json()
      setData(json)
    }
    fetchData()
  },[])


 return (
  <div>
    <div>{JSON.stringify(data)}</div>
    <button className='btn-transparent-white' onClick={() => router.push('/dashboard/users')}>back</button>
    <button className='btn-transparent-white' onClick={() => router.push(`/dashboard/users/edit_user/${ID}`)}>edit</button>
  </div>
)
}

export default ShowUser