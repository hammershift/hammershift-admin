"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation';

const ShowUser = ({ params }: { params: { id: string } }) => {
  const [data, setData] = useState({})
  const urlPath = useParams();
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
    <div>{JSON.stringify(data)}</div>
  )
}

export default ShowUser