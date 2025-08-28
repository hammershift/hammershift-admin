import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Prediction } from "../models/prediction.model";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const USDollar = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatDate = (dateString: Date) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (error) {
    return "Invalid date";
  }
};

export const getDisplayName = (prediction: Prediction) => {
  if (prediction.user.role === "AGENT") {
    return `Agent ${prediction.user.fullName || ""}`;
  }

  if (prediction.user?.username) {
    return prediction.user.username;
  }

  // if (prediction.created_by) {
  //   const emailParts = prediction.created_by.split("@");
  //   if (emailParts.length > 0) {
  //     return emailParts[0];
  //   }
  // }
  return "Unknown Player";
};

export const getInitials = (name: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export const formatTimeDistance = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "soon"; // Invalid date
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "soon";
  }
};
