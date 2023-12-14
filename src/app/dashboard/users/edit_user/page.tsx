import React from 'react'
import { redirect } from 'next/navigation'

const EditUserRedirect = () => {

    redirect('/dashboard/users')

  return (
    <div>EditUser</div>
  )
}

export default EditUserRedirect