import React from "react";

const CreateNewAdminPage = () => {
  return (
    <div className="section-container tw-mt-4 tw-flex tw-flex-col tw-justify-center tw-items-center">
      <div className="tw-m-3">
        <h2 className="tw-text-yellow-500 tw-font-bold tw-text-lg">
          Create New Admin
        </h2>
      </div>
      <div className="tw-m-7 tw-mt-4">
        <form className="tw-flex tw-flex-col tw-justify-center tw-items-center">
          <label className="tw-mx-1">Name</label>
          <div className="tw-flex tw-justify-center tw-items-center">
            <input
              type="text"
              placeholder="First Name"
              className="tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
            ></input>
            <input
              type="text"
              placeholder="Last Name"
              className="tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
            ></input>
          </div>
          <label className="tw-mx-1">Username</label>
          <input
            type="text"
            placeholder=" Username"
            className="tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
          ></input>
          <label className="tw-mx-1">Password</label>
          <input
            type="password"
            placeholder="Password"
            className="tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
          ></input>
          <label className="tw-mx-1">Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm Password"
            className="tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
          ></input>
          <button className="tw-w-1/3 tw-h-12 tw-p-1 tw-rounded-full tw-m-1 tw-bg-yellow-400 tw-text-black tw-font-bold">
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateNewAdminPage;
