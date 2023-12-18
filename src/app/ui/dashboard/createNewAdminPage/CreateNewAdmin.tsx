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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.id) {
      case "first_name":
        const firstName = e.target.value;
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

      if (
        !newAdmin.first_name ||
        !newAdmin.last_name ||
        !newAdmin.username ||
        !newAdmin.password ||
        !confirmPassword
      ) {
        setRequiredFieldsError(true);
        alert("Please fill out required fields");
      } else if (newAdmin.password !== confirmPassword.confirm_password) {
        alert("Password does not match");
      } else if (!response.ok) {
        console.error("Error creating admin account");
      } else {
        console.log(response);
        console.log(adminList);
        setAdminList([...adminList, newAdmin]);
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
              placeholder="First Name *"
              id="first_name"
              value={newAdmin.first_name}
              onChange={handleChange}
              className="tw-text-black tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
            ></input>
            <input
              type="text"
              placeholder="Last Name *"
              id="last_name"
              value={newAdmin.last_name}
              onChange={handleChange}
              className="tw-text-black tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
            ></input>
          </div>
          <label className="tw-mx-1">Username</label>
          <input
            type="text"
            placeholder=" Username *"
            id="username"
            value={newAdmin.username}
            onChange={handleChange}
            className="tw-text-black tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
          ></input>
          <label className="tw-mx-1">Password</label>
          <input
            type="password"
            placeholder="Password *"
            id="password"
            value={newAdmin.password}
            onChange={handleChange}
            className="tw-text-black tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
          ></input>
          <label className="tw-mx-1">Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm Password *"
            onChange={handleConfirmPasswordChange}
            className="tw-text-black tw-w-1/3 tw-m-1 tw-pl-1 tw-border-yellow-500 tw-border-4"
          ></input>
          <button
            className="tw-w-1/3 tw-h-12 tw-p-1 tw-rounded-full tw-m-1 tw-bg-yellow-400 tw-text-black tw-font-bold"
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
