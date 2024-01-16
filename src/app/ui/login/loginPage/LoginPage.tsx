"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import PersonIcon from "@mui/icons-material/Person";
import KeyIcon from "@mui/icons-material/Key";
import hammershiftLogo from "../../../../../public/images/hammershift.svg";
import GreenCheck from "../../../../../public/images/check-green.svg";
import RedCancel from "../../../../../public/images/cancel-red.svg";
import { BounceLoader } from "react-spinners";

const LoginPage = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [alert, setAlert] = useState<boolean>(false);
    const [isUsernameValid, setIsUsernameValid] = useState<boolean>(false);
    const [isEmptyInput, setIsEmptyinput] = useState<boolean>(false);
    const [isPasswordValid, setIsPasswordValid] = useState<boolean | null>(
        null
    );

    const router = useRouter();

    const message = {
        username: {
            valid: "",
            invalid: "Please enter a valid username",
        },
        password: {
            valid: "",
            invalid: "Please enter password",
        },
        both: {
            valid: "",
            invalid: "Please enter valid username & password",
        },
    };

    //check if admin exists
    const checkAdminExistence = async () => {
        try {
            const response = await fetch("/api/checkAdmin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: username }),
            });

            const data = await response.json();

            if (data.usernameExists == true) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error("Error during user existence check:", error);
            return false;
        }
    };

    useEffect(() => {
        const checkAndSetUsername = async () => {
            const checkUsername = await checkAdminExistence();
            setIsEmptyinput(false);
            setIsUsernameValid(checkUsername);
        };

        checkAndSetUsername();
    }, [username]);

    // For checking only
    // useEffect(() => {
    //     console.log("username:", username);
    // }, [username]);

    // login function
    const handleSignIn = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        if (username == "" && password == "") {
            setIsEmptyinput(true);
            console.log("username and paswword cannot be empty");
            return;
        }
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
                setUsername("");
                setPassword("");
                setIsEmptyinput(false);
                setIsPasswordValid(false);
                setAlert(true);
                handleAlertTimer();
                setLoading(false);
            } else {
                router.push("/dashboard");
                console.log("Login successful");
                setTimeout(() => {
                    setLoading(false);
                }, 2500);
            }
        } catch (error) {
            console.error("An unexpected error occurred during login:", error);
        }
    };

    const handleAlertTimer = () => {
        setTimeout(() => {
            setAlert(false);
        }, 2000);
    };

    return (
        <main className="tw-relative section-container tw-flex tw-flex-col tw-items-center tw-justify-center tw-w-full tw-h-[360px] sm:tw-w-full  md:tw-w-2/3 lg:tw-w-1/3 lg:tw-h-2/3 xl:tw-w-1/3 xl:tw-h-2/3">
            {loading ? (
                <div className="tw-h-[360px] tw-w-full tw-flex tw-justify-center tw-items-center">
                    <BounceLoader color="#F2CA16" />
                </div>
            ) : (
                <>
                    <div className="tw-mt-4 tw-flex tw-flex-col tw-items-center tw-justify-center tw-m-8">
                        <Image
                            alt="hammershift-logo"
                            src={hammershiftLogo}
                            width={360}
                        />
                        <h1 className="tw-p-2">WELCOME</h1>
                        <p className="tw-p-1">Please login to Admin Panel</p>
                    </div>
                    {alert && (
                        <div className="tw-w-full tw-absolute tw-left-0 tw-top-0 tw-transform tw--translate-y-full">
                            <AlertMessage message="Login Unsuccesful. Invalid username or password" />
                        </div>
                    )}
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
                            {username.length > 3 &&
                                (isUsernameValid ? (
                                    <div className="tw-pl-1">
                                        <Image
                                            src={GreenCheck}
                                            alt="check"
                                            width={24}
                                            height={24}
                                            className="tw-w-[24px], tw-h-[24px]"
                                        />
                                    </div>
                                ) : (
                                    <div className="tw-flex tw-gap-1.5 tw-pt-2 tw-items-center tw-pl-2">
                                        <Image
                                            src={RedCancel}
                                            alt="check"
                                            width={16}
                                            height={16}
                                            className="tw-w-[16px], tw-h-[16px]"
                                        />
                                        <p className="tw-text-xs tw-text-red-500">
                                            {message.username.invalid}
                                        </p>
                                    </div>
                                ))}
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
                            {isEmptyInput == true && (
                                <div className="tw-flex tw-gap-1.5 tw-pt-2 tw-items-center tw-pl-2">
                                    <Image
                                        src={RedCancel}
                                        alt="check"
                                        width={16}
                                        height={16}
                                        className="tw-w-[16px], tw-h-[16px]"
                                    />
                                    <p className="tw-text-xs tw-text-red-500">
                                        {message.both.invalid}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="tw-flex tw-justify-between tw-my-2">
                            <p className="tw-text-xs tw-my-3">
                                Forgot password? Click{" "}
                                <u className="hover: tw-cursor-pointer">Here</u>
                            </p>
                            <button
                                className={`tw-my-1 tw-px-3 tw-py-2 tw-font-bold tw-text-black  tw-rounded ${
                                    !isUsernameValid
                                        ? "tw-bg-white/20"
                                        : "tw-bg-[#F2CA16]"
                                }`}
                                onClick={handleSignIn}
                            >
                                LOGIN
                            </button>
                        </div>
                    </form>
                </>
            )}
        </main>
    );
};

export default LoginPage;

const AlertMessage = ({ message }: { message: string }) => {
    return (
        <div className="tw-flex tw-justify-center tw-items-center tw-text-sm tw-text-black tw-bg-[#F2CA16] tw-py-2 tw-px-4 tw-rounded">
            <div className="tw-flex tw-gap-1.5 tw-items-center tw-pl-2">
                <Image
                    src={RedCancel}
                    alt="check"
                    width={16}
                    height={16}
                    className="tw-w-[16px], tw-h-[16px]"
                />
                <p>{message}</p>
            </div>
        </div>
    );
};
