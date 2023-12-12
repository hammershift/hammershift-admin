"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/app/lib/actions';

import PersonIcon from "@mui/icons-material/Person";
import KeyIcon from "@mui/icons-material/Key";

import hammershiftLogo from "../../../../../public/images/hammershift.svg";
import { Button } from "@mui/material";

const LoginPage = () => {
   const [errorMessage, dispatch] = useFormState(authenticate, undefined);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  return (
    <main className="section-container tw-flex tw-flex-col tw-items-center tw-justify-center tw-w-1/3 tw-h-2/3">
      <div className="tw-mt-4 tw-flex tw-flex-col tw-items-center tw-justify-center tw-m-8">
        <Image alt="hammershift-logo" src={hammershiftLogo} width={360} />
        <h1 className="tw-p-2">WELCOME</h1>
        <p className="tw-p-1">Please login to Admin Panel</p>
      </div>
      <form action={dispatch} className="tw-flex tw-flex-col">
        <div className="tw-m-1">
          <label>
            <PersonIcon className="tw-mx-1" />
          </label>
          <input
            type="text"
            placeholder=" Username"
            className="tw-rounded-full tw-p-1"
            style={{ color: "black" }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="tw-m-1">
          <label>
            <KeyIcon className="tw-mx-1" />
          </label>
          <input
            type="password"
            placeholder=" Password"
            className="tw-rounded-full tw-p-1"
            style={{ color: "black" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="tw-flex tw-justify-between tw-my-2">
          <p className="tw-text-xs tw-my-3">
            Forgot password? Click{" "}
            <u className="hover: tw-cursor-pointer">Here</u>
          </p>
          <Button
            variant="contained"
            color="primary"
            style={{ backgroundColor: "#facc15", color: "black" }}
            className="tw-my-1"
          >
            Login
          </Button>
        </div>
      </form>
    </main>
  );
};

export default LoginPage;
