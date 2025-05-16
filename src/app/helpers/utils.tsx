import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
