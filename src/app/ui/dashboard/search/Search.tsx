"use client";
import React, { useState } from "react";
import Image from "next/image";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import { set } from "mongoose";

const Search = ({ placeholder }: { placeholder: string }) => {
  return (
    <div className="self-center relative">
      <div className="bg-[#fff]/20 h-auto flex px-2 py-1.5 rounded gap-1">
        <Image
          src={magnifyingGlass}
          alt="magnifying glass"
          width={20}
          height={20}
        />
        <input
          placeholder={`Search for ${placeholder}`}
          className="bg-transparent focus:outline-none"
        />
      </div>
    </div>
  );
};

export default Search;
