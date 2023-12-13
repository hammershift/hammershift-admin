"use client"
import React, {use, useEffect} from 'react'
import { redirect } from 'next/navigation'
import { useSession } from 'next-auth/react'

const withAuth = (Component : any) => {
  return function WithAuth(props: any) {
    const session = useSession()
    // console.log("session", session)
    useEffect(() => {
      if (!session.data) {
        redirect('/')
      }
    }, [])
    
    if (!session.data) return null;

    return <Component {...props} />
    }
}

export default withAuth