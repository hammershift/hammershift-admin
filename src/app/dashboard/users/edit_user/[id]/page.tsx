"use client"
import React, {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation';
import Link from 'next/link';

let styles = { 
    label: {}
}

const EditUser = ({ params }: { params: { id: string } }) => {
  const [data, setData] = useState<any>(null)
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
    <div className='section-container tw-mt-4'><span className='tw-font-bold'>EDIT PAGE</span> {JSON.stringify(data)}
    {data &&
        <form>
            <div className='tw-grid tw-gap-4'>
                <div className='tw-flex tw-gap-4'>
                    <label style={styles.label} >id</label>
                    <input value={data?._id || ''} className='tw-bg-[#fff]/20 tw-text-white/50' disabled/>
                </div>
                 <div className='tw-flex tw-gap-4'>
                    <label>Full Name</label>
                    <input defaultValue={data?.fullName || ''} className='tw-bg-[#fff]/20'/>
                </div>
                <div className='tw-flex tw-gap-4'>
                    <label>Username</label>
                    <input defaultValue={data?.username || ''} className='tw-bg-[#fff]/20'/>
                </div>
                <div className='tw-flex tw-gap-4'>
                    <label>Email</label>
                    <input defaultValue={data?.email || ''} className='tw-bg-[#fff]/20'/>
                </div>
                <div className='tw-flex tw-gap-4'>
                    <label>Email Verification</label>
                    <input defaultValue={ data?.emailVerified == null || data?.emailVerified == false ? "False" : "True" } className='tw-bg-[#fff]/20'/>
                </div>
                <div className='tw-flex tw-gap-4'>
                    <label>About Me</label>
                    <input defaultValue={data?.aboutMe || ''} className='tw-bg-[#fff]/20'/>
                </div>
                <div className='tw-flex tw-gap-4'>
                    <label>State</label>
                    <input defaultValue={data?.state || ''} className='tw-bg-[#fff]/20'/>
                </div>
                <div className='tw-flex tw-gap-4'>
                    <label>Country</label>
                    <input defaultValue={data?.country || ''} className='tw-bg-[#fff]/20'/>
                </div>
               
                

            </div>
            <div className='tw-flex tw-gap-4 tw-mt-4'>
                <Link href={`/dashboard/users`}>
                    <button className='btn-transparent-white'>back</button>
                </Link>
                <button className='btn-transparent-white '>EDIT USER</button>
                <Link href={`/dashboard/users/delete_user/${ID}`}>
                    <button className='btn-transparent-red'>DELETE USER</button> 
                </Link>
            </div>
        </form>
    }
    </div>
  )
}

export default EditUser
