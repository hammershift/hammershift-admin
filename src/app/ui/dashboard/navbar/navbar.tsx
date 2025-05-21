"use client";
import React from "react";

//icons
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import { Menu } from "@mui/icons-material";
import velocityMarketsLogo from "../../../../../public/images/velocity-markets-logo.png";
import Image from "next/image";

const Navbar = ({ openSidebar }: { openSidebar: () => void }) => {
  return (
    <nav className="flex flex-row h-auto w-auto justify-between items-center bg-slate-800 px-5 rounded-l ">
      <Image
        alt="velocity-markets-logo"
        src={velocityMarketsLogo}
        width={250}
        className="mr-5 py-4"
      />
      <div className="md:hidden mr-5 py-2" onClick={openSidebar}>
        <Menu />
      </div>
      {/* <p className="text-yellow-400">Admin Panel</p>
      <div className="flex items-end justify-end">
        <div className="flex">
          <input
            type="text"
            placeholder="Search..."
            className="bg-gray-700 text-white py-1 px-2 m-2 mr-0 w-auto h-auto max-md:hidden"
          />
        </div>
        <div className="flex">
          <NotificationsIcon className="m-3" />
          <SettingsIcon className="m-3" />
        </div>
      </div> */}
    </nav>
  );
};

export default Navbar;
