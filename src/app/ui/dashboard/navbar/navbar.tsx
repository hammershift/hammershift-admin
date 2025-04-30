"use client";
import React from "react";

//icons
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import { Menu } from "@mui/icons-material";

const Navbar = ({ openSidebar }: { openSidebar: () => void }) => {
  return (
    <nav className="flex flex-row h-auto w-auto justify-between items-center bg-slate-800 px-5 rounded-l ">
      <div className="md:hidden mr-5" onClick={openSidebar}>
        <Menu />
      </div>
      <p className="text-yellow-400">Admin Panel</p>
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
      </div>
    </nav>
  );
};

export default Navbar;
