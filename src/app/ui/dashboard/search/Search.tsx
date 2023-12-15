"use client"
import React, {useState} from 'react'
import Image from 'next/image';
import magnifyingGlass from '@/../public/images/magnifying-glass.svg';
import { set } from 'mongoose';

const Search = ({placeholder, routeName} : {placeholder: string, routeName: string}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [list, setList] = useState([]);;
    const [searchKeyword, setSearchKeyword] = useState('');

    const handleInputClick = () => {
      if (list.length !== 0) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(e.target.value);
      const response = await fetch(`/api/cars/filter?search=${searchKeyword}`);
      const data = await response.json();

      if (data.length !== 0) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      setList(data.cars);
    };




  return (
        <div className='tw-self-center tw-relative'>
          <div className='tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1'>
            <Image src={magnifyingGlass} alt='magnifying glass' width={20} height={20}/>
            <input 
              placeholder={`Search for ${placeholder}`} 
              className='tw-bg-transparent focus:tw-outline-none' 
              onClick={handleInputClick}/>
          </div>
          {
          // isOpen && 
          //   <SearchDropdown list={list}/>
          }
        </div>
  )
}


type UsersProps = {
  _id: string,
  email: string,
  image?: string,
  emailVerified: boolean,
  aboutMe?: string,
  country?: string,
  fullName: string,
  state?: string,
  username: string,
}

export default Search

const SearchDropdown = ({list} : {list: {total: number, users: UsersProps[]}}) => {
  
  return (
    <div className='tw-absolute tw-top-[20px] tw-shadow-md tw-bg-[#1A2C3D] '>
      Hello
      {
        // list && 
        // list.users.map((item: any) => {
        //   <div key={item._id}>items.username</div>
        // })
      }
    </div>  
  )
}