"use client";
import React from "react";

//icons
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import { Menu } from "@mui/icons-material";

const Navbar = ({ openSidebar }: { openSidebar: () => void }) => {
  return (
    <nav className="tw-flex tw-flex-row tw-h-auto tw-w-auto tw-justify-between tw-items-center tw-bg-slate-800 tw-px-5 tw-rounded-l ">
      <div className="md:tw-hidden tw-mr-5" onClick={openSidebar}>
        <Menu />
      </div>
      <p className="tw-text-yellow-400">Admin Panel</p>
      <div className="tw-flex tw-items-end tw-justify-end">
        <div className="tw-flex">
          <input
            type="text"
            placeholder="Search..."
            className="tw-bg-gray-700 tw-text-white tw-py-1 tw-px-2 tw-m-2 tw-mr-0 tw-w-auto tw-h-auto max-md:tw-hidden"
          />
        </div>
        <div className="tw-flex">
          <NotificationsIcon className="tw-m-3" />
          <SettingsIcon className="tw-m-3" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
