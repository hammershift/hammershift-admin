import React from 'react'
import Image from 'next/image';
import magnifyingGlass from '@/../public/images/magnifying-glass.svg';

const Search = ({placeholder} : {placeholder: string}) => {
  return (
        <div className='tw-self-center '>
          <div className='tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1'>
            <Image src={magnifyingGlass} alt='magnifying glass' width={20} height={20}/>
            <input placeholder={`Search for ${placeholder}`} className='tw-bg-transparent focus:tw-outline-none'/>
          </div>
        </div>
  )
}

export default Search