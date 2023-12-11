import Image from "next/image";
import LoginPage from "./ui/login/loginPage/LoginPage";

export default function Home() {
  return (
    <div className="tw-flex tw-justify-center tw-items-center tw-pt-64">
      <LoginPage />
    </div>
  );
}
