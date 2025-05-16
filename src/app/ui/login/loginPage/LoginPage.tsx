"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import PersonIcon from "@mui/icons-material/Person";
import KeyIcon from "@mui/icons-material/Key";
import velocityMarketsLogo from "../../../../../public/images/velocity-markets-logo.png";
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
    <main className="relative section-container flex flex-col items-center justify-center w-full h-[360px] sm:w-full  md:w-2/3 lg:w-1/3 lg:h-2/3 xl:w-1/3 xl:h-2/3">
      {loading ? (
        <div className="h-[360px] w-full flex justify-center items-center">
          <BounceLoader color="#F2CA16" />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col items-center justify-center m-6">
            <Image
              alt="hammershift-logo"
              src={velocityMarketsLogo}
              width={360}
            />
            <h1 className="p-2 text-2xl font-bold text-yellow-400">WELCOME</h1>
            <p className="p-1">Please login to Admin Panel</p>
          </div>
          {alert && (
            <div className="w-full absolute left-0 top-0 transform -translate-y-full">
              <AlertMessage message="Login Unsuccesful. Invalid username or password" />
            </div>
          )}
          <form className="flex flex-col">
            <div className="m-1">
              <label>
                <PersonIcon className="mx-1" />
              </label>
              <input
                type="text"
                name="username"
                placeholder=" Username"
                className="rounded-full p-1 pl-2"
                style={{ color: "black" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {username.length > 3 &&
                (isUsernameValid ? (
                  <div className="pl-1">
                    <Image
                      src={GreenCheck}
                      alt="check"
                      width={24}
                      height={24}
                      className="w-[24px], h-[24px]"
                    />
                  </div>
                ) : (
                  <div className="flex gap-1.5 pt-2 items-center pl-2">
                    <Image
                      src={RedCancel}
                      alt="check"
                      width={16}
                      height={16}
                      className="w-[16px], h-[16px]"
                    />
                    <p className="text-xs text-red-500">
                      {message.username.invalid}
                    </p>
                  </div>
                ))}
            </div>
            <div className="m-1">
              <label>
                <KeyIcon className="mx-1" />
              </label>
              <input
                type="password"
                name="password"
                placeholder=" Password"
                className="rounded-full p-1 pl-2"
                style={{ color: "black" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isEmptyInput == true && (
                <div className="flex gap-1.5 pt-2 items-center pl-2">
                  <Image
                    src={RedCancel}
                    alt="check"
                    width={16}
                    height={16}
                    className="w-[16px], h-[16px]"
                  />
                  <p className="text-xs text-red-500">{message.both.invalid}</p>
                </div>
              )}
            </div>
            <div className="flex justify-between my-2">
              <p className="text-xs my-3">
                Forgot password? Click{" "}
                <u
                  className="hover: cursor-pointer"
                  onClick={(e) => setShowModal(true)}
                >
                  Here
                </u>
              </p>
              <button
                className={`my-1 px-3 py-2 font-bold text-black rounded ${
                  !isUsernameValid ? "bg-white/20" : "bg-[#F2CA16]"
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
    <div className="flex justify-center items-center text-sm text-black bg-[#F2CA16] py-2 px-4 rounded">
      <div className="flex gap-1.5 items-center pl-2">
        <Image
          src={RedCancel}
          alt="check"
          width={16}
          height={16}
          className="w-[16px], h-[16px]"
        />
        <p>{message}</p>
      </div>
    </div>
  );
};
