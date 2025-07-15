"use client";

import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "./dialog";
import { cn } from "@/app/helpers/utils";

interface LoadingModalProps {
  show: boolean;
  message?: string;
}

export default function LoadingModal({
  show,
  message = "Loading...",
}: LoadingModalProps) {
  return (
    <Dialog open={show}>
      <DialogContent
        className={cn(
          "bg-[#13202D] border-[#1E2A36] rounded-xl max-w-sm w-full py-8 flex flex-col items-center justify-center gap-4",
          "pointer-events-none" // Prevent clicks
        )}
        hideClose
      >
        <Loader2 className="animate-spin text-yellow-400 w-10 h-10" />
        <p className="text-white text-center text-base">{message}</p>
      </DialogContent>
    </Dialog>
  );
}
