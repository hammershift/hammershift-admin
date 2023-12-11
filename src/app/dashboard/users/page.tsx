import React from 'react'
import SearchIcon from '@mui/icons-material/Search';
import Image from 'next/image';
import Search from '@/app/ui/dashboard/search/Search';
import EditIcon from '@mui/icons-material/Edit';
import DvrIcon from '@mui/icons-material/Dvr';
import DeleteIcon from '@mui/icons-material/Delete';

const list = [{
    id: 'user1',
    username: 'samantha001',
    fullName: 'samantha jones',
    email: 'sam@mail.com',
    state: 'Washington DC',
    country: 'United States of America',

}, {
    id: 'user2',
    username: 'naruto001',
    fullName: 'Naturo Uzumaki',
    email: 'ramen@mail.com',
    state: 'Florida',
    country: 'United States of America',

}, {
    id: 'user3',
    username: 'sonic001',
    fullName: 'sonic the hedgehog',
    email: 'sonic@mail.com',
    state: 'Naruto001',
    country: 'United States of America',

}
];

const UsersPage = () => {
  return (
    <div className='section-container tw-mt-3'>

      <div className='tw-flex tw-justify-between'>
        <Search placeholder='users'/>
        <button className='btn-yellow'>ADD NEW</button>
      </div>

      <div className='tw-my-4'>
        <Table/>
      </div>

      <div className='tw-flex tw-justify-end '>
        <div className='tw-flex tw-items-center tw-gap-4'>
          <button className='btn-transparent-white'>prev</button>
          <div className='tw-h-auto'>page 1 of 1</div>
          <button className='btn-transparent-white'>next</button>
        </div>

      </div>
    </div>
  )
}

export default UsersPage



const Table = () => {
    return (
        <table className='tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center'>
            <thead>
                <tr>
                    <th className='tw-p-2.5 tw-font-bold '>Username</th>
                    <th className='tw-p-2.5 tw-font-bold '>Full Name</th>
                    <th className='tw-p-2.5 tw-font-bold'>Email</th>
                    <th className='tw-p-2.5 tw-font-bold'>State</th>
                    <th className='tw-p-2.5 tw-font-bold'>Country</th>
                    <th className='tw-p-2.5 tw-font-bold'>Actions</th>

                </tr>
            </thead>
            <tbody className='tw-w-full'>
                {
                    list && 
                    list.map((item, index) => (
                         <tr key={item.id} className=' tw-rounded-lg tw-bg-[#fff]/5'>
                            <td className='tw-p-2.5 tw-w-1/8'>{item.username}</td>
                            <td className='tw-p-2.5 tw-w-1/8'>{item.fullName}</td>
                            <td className='tw-p-2.5 tw-w-1/8'>{item.email}</td>
                            <td className='tw-p-2.5 tw-w-1/8'>{item.state}</td>
                            <td className='tw-p-2.5 tw-w-1/8'>{item.country}</td>
                            <td className='tw-p-2.5 tw-w-1/8'>
                              <div className='tw-flex tw-gap-4 tw-justify-center'>
                                <EditIcon/>
                                <DvrIcon/>
                                <DeleteIcon sx={{color: '#C2451E' }}/>
                              </div>

                            </td>
                        </tr>
                    )
                    )
                    }
            </tbody>
        </table>
    )
}