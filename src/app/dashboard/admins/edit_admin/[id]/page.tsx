"use client";

import Link from "next/link";
import React from "react";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const EditAdmin = () => {
  return (
    <div className="section-container tw-mt-4">
      <Link href={`/dashboard/admins`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
        EDIT ADMIN ACCOUNT
      </h2>{" "}
      <form>
        <div className="tw-flex tw-flex-col tw-justify-between tw-gap-4 tw-m-6">
          <div className="tw-flex tw-justify-between tw-w-2/5">
            <label className="tw-px-6">Admin ID:</label>
            <input
              type="text"
              name="_id"
              className="tw-bg-[#fff]/20 tw-text-white/50 tw-border-yellow-500 tw-border-2 tw-px-1"
              disabled
            />
          </div>
          <div className="tw-flex tw-justify-between tw-w-2/5">
            <label className="tw-px-6">First Name:</label>
            <input
              name="fullName"
              type="text"
              className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
            />
          </div>
          <div className="tw-flex tw-justify-between tw-w-2/5">
            <label className="tw-px-6">Last Name:</label>
            <input
              name="fullName"
              type="text"
              className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
            />
          </div>
          <div className="tw-flex tw-justify-between tw-w-2/5">
            <label className="tw-px-6">Email:</label>
            <input
              name="fullName"
              type="text"
              className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
            />
          </div>
          <div className="tw-flex tw-justify-between tw-w-2/5">
            <label className="tw-px-6">Username:</label>
            <input
              name="username"
              type="text"
              className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
            />
          </div>
          <div className="tw-flex tw-justify-between tw-w-2/5">
            <label className="tw-px-6">Password:</label>
            <input
              name="username"
              type="text"
              className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
            />
          </div>
          <div className="tw-flex tw-justify-between tw-w-1/4">
            <label className="tw-px-6">Role:</label>
            <div>
              <div>
                <input type="radio"></input>
                <label>Owner</label>
              </div>
              <div>
                <input type="radio"></input>
                <label>Admin</label>
              </div>
              <div>
                <input type="radio"></input>
                <label>Moderator</label>
              </div>
              <div>
                <input type="radio"></input>
                <label>Guest</label>
              </div>
            </div>
          </div>
          <div className="tw-flex tw-gap-1 tw-justify-evenly tw-w-2/5 tw-m-4">
            <Link href={`/dashboard/users/delete_user/`}>
              <button className="btn-transparent-red">DELETE USER</button>
            </Link>
            <button className="btn-transparent-white" type="submit">
              Save Changes
            </button>
            {/*
                    <button
                        className="btn-transparent-white"
                        onClick={revertChanges}
                    >
                        REVERT CHANGES
                    </button> */}
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditAdmin;
