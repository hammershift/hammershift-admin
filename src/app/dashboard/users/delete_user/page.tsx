import React from 'react'
import { redirect } from 'next/navigation'

const DeleteUserRedirect = () => {
        redirect('/dashboard/users')

  return (
    <div>DeleteUserRedirect</div>
  )
}

export default DeleteUserRedirect