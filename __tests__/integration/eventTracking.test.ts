import { trackEvent } from "@/app/lib/eventTracking";
import { trackCustomerIOEvent } from "@/app/lib/customerio";
import { capturePostHogEvent } from "@/app/lib/posthog";
import UserEvents from "@/app/models/userEvent.model";
import connectToDB from "@/app/lib/mongoose";
import { Types } from "mongoose";

// Mock external dependencies
jest.mock("@/app/lib/customerio");
jest.mock("@/app/lib/posthog");
jest.mock("@/app/lib/mongoose");

describe("Event Tracking Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  describe("trackEvent", () => {
    it("should create a UserEvent in database", async () => {
      const mockCreate = jest.spyOn(UserEvents, "create").mockResolvedValue({
        _id: new Types.ObjectId(),
        user_id: new Types.ObjectId("507f1f77bcf86cd799439011"),
        event_type: "prediction_made",
        event_data: { auction_id: "123" },
        created_at: new Date(),
      } as any);

      await trackEvent("507f1f77bcf86cd799439011", "prediction_made", {
        auction_id: "123",
      });

      expect(connectToDB).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        user_id: expect.any(Types.ObjectId),
        event_type: "prediction_made",
        event_data: { auction_id: "123" },
        created_at: expect.any(Date),
      });
    });

    it("should handle errors gracefully", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      jest.spyOn(UserEvents, "create").mockRejectedValue(new Error("DB error"));

      await trackEvent("507f1f77bcf86cd799439011", "prediction_made", {});

      expect(consoleError).toHaveBeenCalledWith(
        "Failed to track event:",
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });
});
