import React from 'react'
import { redirect } from 'next/navigation'

const EditAdminRedirect = () => {

    redirect('/dashboard/admins')

  return (
    <div>EditAdmin</div>
  )
}

export default EditAdminRedirect