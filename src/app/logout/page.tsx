"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from "next-auth/react"

const Logout = () => {
  const router = useRouter()
  return (
    <div className='tw-p-4'>
        <div>Are you sure you want to logout?</div>
        <div className='tw-flex tw-gap-4 '>
            <button className='btn-transparent-white' onClick={() => signOut({redirect: true, callbackUrl: "/"})}>Yes</button>
            <button className='btn-transparent-white' onClick={() => router.push('/dashboard')}>No</button>
        </div>

    </div>
  )
}

export default Logout