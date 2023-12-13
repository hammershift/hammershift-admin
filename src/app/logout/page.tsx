import React from 'react'

const Logout = () => {
  return (
    <div className='tw-p-4'>
        <div>Are you sure you want to logout?</div>
        <div className='tw-flex tw-gap-4 '>
            <button className='btn-transparent-white'>Yes</button>
            <button className='btn-transparent-white'>No</button>
        </div>

    </div>
  )
}

export default Logout