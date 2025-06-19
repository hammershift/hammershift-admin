import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";

interface AlertModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  title?: string;
  message: string;
  buttonLabel?: string;
}

export default function AlertModal({
  open,
  setOpen,
  title = "Notice",
  message,
  buttonLabel = "OK",
}: AlertModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="bg-[#13202D] border-[#1E2A36] max-w-md w-[80%] rounded-xl"
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="text-white text-center">{title}</DialogTitle>
          <DialogDescription className="text-gray-300 max-md:text-sm text-center">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="items-center !flex !justify-center sm:!justify-center">
          <Button
            onClick={() => setOpen(false)}
            className="w-24 bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
          >
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
