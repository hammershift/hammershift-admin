"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import PersonIcon from "@mui/icons-material/Person";
import KeyIcon from "@mui/icons-material/Key";
import hammershiftLogo from "../../../../../public/images/hammershift.svg";
import GreenCheck from "../../../../../public/images/check-green.svg";
import RedCancel from "../../../../../public/images/cancel-red.svg";
import { BounceLoader } from "react-spinners";
import ForgotPasswordModal from "../../dashboard/modals/forgot_password_modal";

const LoginPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [alert, setAlert] = useState<boolean>(false);
  const [isUsernameValid, setIsUsernameValid] = useState<boolean>(false);
  const [isEmptyInput, setIsEmptyinput] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [modalOnDisplay, setModalOnDisplay] = useState<
    "enter email" | "enter otp" | "reset password" | "success"
  >("enter email");

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

  // login function
  const handleSignIn = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    if (username == "" && password == "") {
      setIsEmptyinput(true);
      console.log("username and password cannot be empty");
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
        setUsername(""); // clear username field
        setPassword(""); // clear password field
        setIsEmptyinput(false); // close alert message for empty input
        setLoading(false); // close loading spinner
        setAlert(true); // open alert message for wrong username or password
        handleAlertTimer(); // close alert message after 2 seconds
      } else {
        router.push("/dashboard");
        console.log("Login successful");
        setTimeout(() => {
          setLoading(false);
        }, 5000);
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

  // Forgot/Reset Password
  const [resetEmail, setResetEmail] = useState("");

  const handleResetPassword = async () => {
    // Check if resetEmail is empty
    if (!resetEmail) {
      setError("Please enter your email.");
      console.log(error);
      setModalOnDisplay("enter email");
      return; // Exit the function early to prevent further execution
    }

    try {
      const response = await fetch("/api/forgotPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("passwordResetEmail", resetEmail); // store the email in local storage
        localStorage.setItem("isNewPasswordResetProcess", "true"); // set the flag for password reset flow process
        setModalOnDisplay("enter otp");
        setError("");
      } else {
        setError(data.message);
        console.log(data.message);
      }
    } catch (error) {
      console.error("Error during password reset request:", error);
      setError(
        "An error occurred while processing the password reset request."
      );
    }
  };

  // OTP verification
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState<number | null>(60);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();

  // handle password matching
  const passwordMatch = newPassword === confirmPassword && newPassword !== "";

  // handle timer expiration
  const timerExpired = timer === 0;

  // handle OTP expiration
  const otpExpired = timerExpired && modalOnDisplay === "enter otp";

  // handle OTP entry completion
  const otpEntryCompleted = modalOnDisplay === "reset password" || otpExpired;

  // handle otp/code input validation
  const isOtpLengthValid = otp.length === 6;

  // format time remaining for display
  const formatTime = () => {
    const minutes = Math.floor((timer || 0) / 60);
    const seconds = (timer || 0) % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // common error handling function
  const handleCommonError = (error: string) => {
    console.error("Error:", error);
    setError("An error occurred.");
  };

  useEffect(() => {
    const startCountdown = (startTime: number) => {
      intervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000);
        const remainingTime = 60 - elapsedTime;

        if (remainingTime <= 0) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
          setTimer(0);
        } else {
          setTimer(remainingTime);
        }
      }, 1000);
    };

    const handleNewProcess = () => {
      const newStartTime = Date.now();
      const newSessionId = newStartTime.toString();
      localStorage.setItem("timerStartTime", newSessionId);
      localStorage.setItem("passwordResetSessionId", newSessionId);
      setTimerStartTime(newStartTime);
      startCountdown(newStartTime);
    };

    const handleExistingProcess = (startTime: number) => {
      const currentTime = Date.now();
      const timeElapsed = currentTime - startTime;

      if (timeElapsed < 60000) {
        setTimerStartTime(startTime);
        startCountdown(startTime);
      } else {
        localStorage.removeItem("timerStartTime");
      }
    };

    // retrieve the email from localStorage
    const storedEmail = localStorage.getItem("passwordResetEmail");
    if (!storedEmail) {
      router.push("/");
      return;
    }
    setEmail(storedEmail);

    // retrieve the session state (or flag) from localStorage
    const isNewProcess =
      localStorage.getItem("isNewPasswordResetProcess") === "true";

    localStorage.removeItem("isNewPasswordResetProcess"); // clear the flag for a new process

    const storedStartTime = localStorage.getItem("timerStartTime");
    if (isNewProcess || !storedStartTime) {
      handleNewProcess();
    } else {
      handleExistingProcess(parseInt(storedStartTime, 10));
    }

    // Cleanup function to clear the interval
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [modalOnDisplay, otpExpired, otpEntryCompleted]);

  const handleOtpVerification = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/verifyOtpCode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp }),
      });

      const data = await response.json();
      if (response.ok) {
        setModalOnDisplay("reset password");
        setError("");
      } else {
        setError("Invalid OTP. Please try again");
      }
    } catch (error: any) {
      handleCommonError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordMatch) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/resetPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        setModalOnDisplay("success");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowModal(false);
        }, 3000);
      } else {
        setError(data.message);
      }
    } catch (error: any) {
      handleCommonError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const response = await fetch("/api/resendOtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        setTimer(60);
        // Store the current time as the timer start time
        setTimerStartTime(Date.now());
      } else {
        setError(data.message);
      }
    } catch (error: any) {
      handleCommonError(error);
    }
  };

  return (
    <main className="tw-relative section-container tw-flex tw-flex-col tw-items-center tw-justify-center tw-w-full tw-h-[360px] sm:tw-w-full  md:tw-w-2/3 lg:tw-w-1/3 lg:tw-h-2/3 xl:tw-w-1/3 xl:tw-h-2/3">
      {loading ? (
        <div className="tw-h-[360px] tw-w-full tw-flex tw-justify-center tw-items-center">
          <BounceLoader color="#F2CA16" />
        </div>
      ) : (
        <>
          <div className="tw-mt-4 tw-flex tw-flex-col tw-items-center tw-justify-center tw-m-6">
            <Image alt="hammershift-logo" src={hammershiftLogo} width={360} />
            <h1 className="tw-p-2 tw-text-2xl tw-font-bold tw-text-yellow-400">
              WELCOME
            </h1>
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
                <u
                  className="hover: tw-cursor-pointer"
                  onClick={(e) => setShowModal(true)}
                >
                  Here
                </u>
              </p>
              <button
                className={`tw-my-1 tw-px-3 tw-py-2 tw-font-bold tw-text-black tw-rounded ${
                  !isUsernameValid ? "tw-bg-white/20" : "tw-bg-[#F2CA16]"
                }`}
                onClick={handleSignIn}
              >
                LOGIN
              </button>
            </div>
          </form>
        </>
      )}
      {showModal && (
        <ForgotPasswordModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setModalOnDisplay("enter email");
            setError("");
          }}
          handleResetPassword={handleResetPassword}
          resetEmail={resetEmail}
          setResetEmail={setResetEmail}
          modalOnDisplay={modalOnDisplay}
          error={error}
          handleOtpVerification={handleOtpVerification}
          otp={otp}
          setOtp={setOtp}
          handlePasswordReset={handlePasswordReset}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          otpExpired={otpExpired}
          formatTime={formatTime}
          handleResendOtp={handleResendOtp}
        />
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
