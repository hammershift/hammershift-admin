"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import PersonIcon from "@mui/icons-material/Person";
import KeyIcon from "@mui/icons-material/Key";
import hammershiftLogo from "../../../../../public/images/hammershift.svg";
import { Button } from "@mui/material";

const LoginPage = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const router = useRouter();
  // login function
  const handleSignIn = async () => {
    try {
      console.log(`Attempting to sign in with: ${username}`);
      const result = await signIn("credentials", {
        redirect: false,
        username: username,
        password: password,
      });

      console.log("signIn result:", result);

      if (result?.error) {
        console.log({ message: "unable to sign in" });
      } else {
        console.log("Login successful");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("An unexpected error occurred during login:", error);
    }
  };

  return (
    <main className="section-container tw-flex tw-flex-col tw-items-center tw-justify-center tw-w-1/3 tw-h-2/3">
      <div className="tw-mt-4 tw-flex tw-flex-col tw-items-center tw-justify-center tw-m-8">
        <Image alt="hammershift-logo" src={hammershiftLogo} width={360} />
        <h1 className="tw-p-2">WELCOME</h1>
        <p className="tw-p-1">Please login to Admin Panel</p>
      </div>
      <form className="tw-flex tw-flex-col">
        <div className="tw-m-1">
          <label>
            <PersonIcon className="tw-mx-1" />
          </label>
          <input
            type="text"
            name="username"
            placeholder=" Username"
            className="tw-rounded-full tw-p-1 tw-pl-2"
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
            name="password"
            placeholder=" Password"
            className="tw-rounded-full tw-p-1 tw-pl-2"
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
            onClick={handleSignIn}
          >
            Login
          </Button>
        </div>
      </form>
    </main>
  );
};

export default LoginPage;
