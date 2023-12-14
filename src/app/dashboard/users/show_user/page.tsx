import React from 'react'
import { redirect } from 'next/navigation'

const ShowUserRedirect = () => {

    redirect('/dashboard/users')
  return (
    <div>ShowUserRedirect</div>
  )
}

export default ShowUserRedirect