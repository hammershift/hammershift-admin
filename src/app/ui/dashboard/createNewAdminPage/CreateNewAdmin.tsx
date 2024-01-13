"use client";

import React, { useState } from "react";

type newAdmin = {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
};

const CreateNewAdminPage = () => {
  const [newAdmin, setNewAdmin] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState({
    confirm_password: "",
  });
  const [requiredFieldsError, setRequiredFieldsError] = useState(false);
  const [adminList, setAdminList] = useState<newAdmin[]>([]);
  const [emptyInputError, setEmptyInputError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.id) {
      case "first_name":
        const firstName = e.target.value;
        if (!firstName) {
          setEmptyInputError(true);
        }
        setNewAdmin({ ...newAdmin, first_name: firstName });
        break;
      case "last_name":
        const lastName = e.target.value;
        setNewAdmin({ ...newAdmin, last_name: lastName });
        break;
      case "username":
        const username = e.target.value;
        setNewAdmin({ ...newAdmin, username: username });
        break;
      case "password":
        const password = e.target.value;
        setNewAdmin({ ...newAdmin, password: password });
        break;
      default:
        break;
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword({ confirm_password: e.target.value });
  };

  const handleCreateAccountButtonClick = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(newAdmin),
      });

      const data = (await response.json()) as { message: string };
      if (data.message === "Admin already exists") {
        alert("Admin already exists");
      } else if (
        !newAdmin.first_name ||
        !newAdmin.last_name ||
        !newAdmin.username ||
        !newAdmin.password ||
        !confirmPassword
      ) {
        setEmptyInputError(true);
        setRequiredFieldsError(true);
      } else if (newAdmin.password !== confirmPassword.confirm_password) {
        alert("Password does not match");
      } else if (!response.ok) {
        console.error("Error creating admin account");
      } else {
        setConfirmPassword({ confirm_password: "" });
        setNewAdmin({
          first_name: "",
          last_name: "",
          username: "",
          password: "",
        });
        alert("Admin account created successfully!");
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
  };

  return (
    <div className="section-container tw-mt-4 tw-flex tw-flex-col tw-justify-center tw-items-center max-md:tw-items-start">
      <div className="tw-m-3">
        <h2 className="tw-text-yellow-500 tw-font-bold tw-text-lg">
          Create New Admin
        </h2>
      </div>
      <div className="tw-m-7 tw-mt-4">
        <form className="tw-flex tw-flex-col tw-justify-center tw-items-center max-md:tw-items-start">
          <label className="tw-mx-1">Name</label>
          <div className="tw-flex tw-justify-center tw-items-center max-sm:tw-flex-col">
            <input
              type="text"
              placeholder="First Name *"
              id="first_name"
              value={newAdmin.first_name}
              onChange={handleChange}
              className={`tw-bg-[#fff]/20 tw-text-white/50 tw-border-2 tw-px-1 tw-m-2 ${
                emptyInputError ? "tw-border-red-500" : "tw-border-yellow-500"
              }`}
            ></input>
            <input
              type="text"
              placeholder="Last Name *"
              id="last_name"
              value={newAdmin.last_name}
              onChange={handleChange}
              className={`tw-bg-[#fff]/20 tw-text-white/50 tw-border-2 tw-px-1 tw-m-2 ${
                emptyInputError ? "tw-border-red-500" : "tw-border-yellow-500"
              }`}
            ></input>
          </div>
          <label className="tw-mx-1">Username</label>
          <input
            type="text"
            placeholder=" Username *"
            id="username"
            value={newAdmin.username}
            onChange={handleChange}
            className={`tw-bg-[#fff]/20 tw-text-white/50 tw-border-2 tw-px-1 tw-m-2 ${
              emptyInputError ? "tw-border-red-500" : "tw-border-yellow-500"
            }`}
          ></input>
          <label className="tw-mx-1">Password</label>
          <input
            type="password"
            placeholder="Password *"
            id="password"
            value={newAdmin.password}
            onChange={handleChange}
            className={`tw-bg-[#fff]/20 tw-text-white/50 tw-border-2 tw-px-1 tw-m-2 ${
              emptyInputError ? "tw-border-red-500" : "tw-border-yellow-500"
            }`}
          ></input>
          <label className="tw-mx-1">Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm Password *"
            onChange={handleConfirmPasswordChange}
            className={`tw-bg-[#fff]/20 tw-text-white/50 tw-border-2 tw-px-1 tw-m-2 ${
              emptyInputError ? "tw-border-red-500" : "tw-border-yellow-500"
            }`}
          ></input>
          {requiredFieldsError ? (
            <p className="tw-text-red-500">Please fill-out required fields</p>
          ) : null}
          <button
            className="tw-w-1/3 tw-h-12 tw-p-1 tw-rounded-full tw-m-1 tw-mt-4 tw-bg-yellow-400 tw-text-black tw-font-bold"
            onClick={handleCreateAccountButtonClick}
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateNewAdminPage;
