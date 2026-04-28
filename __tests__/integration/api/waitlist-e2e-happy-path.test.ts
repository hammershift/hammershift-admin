import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createMockSession } from "../../helpers/testFixtures";
import { getServerSession } from "next-auth";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

const mockInternal = jest.fn();
jest.mock("@/app/lib/frontendInternal", () => ({
  ...jest.requireActual("@/app/lib/frontendInternal"),
  callFrontendInternal: (...args: unknown[]) => mockInternal(...args),
}));

jest.mock("@/app/lib/auditLogger", () => ({ createAuditLog: jest.fn() }));

import { GET as listGet } from "@/app/api/waitlist/route";
import { POST as approvePost } from "@/app/api/waitlist/approve/route";
import { POST as resendPost } from "@/app/api/waitlist/resend/route";

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
beforeEach(async () => {
  await resetTestDb();
  mockInternal.mockReset();
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession("admin") as never);
});

function listReq(qs: string) {
  return new NextRequest(`http://localhost/api/waitlist${qs}`);
}
function postReq(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("waitlist E2E happy path", () => {
  it("list (unapproved) → approve → list (approved) → resend", async () => {
    const db = mongoose.connection.db!;
    const sentTimestamps: Record<string, Date> = {};
    mockInternal.mockImplementation(
      async (_path: string, payload: { email: string }) => {
        const now = new Date();
        sentTimestamps[payload.email] = now;
        await db
          .collection("waitlist_entries")
          .updateOne(
            { email: payload.email },
            { $set: { inviteEmailSentAt: now } }
          );
        return { ok: true, status: 200, body: { ok: true } };
      }
    );

    await db.collection("waitlist_entries").insertMany([
      {
        email: "alice@example.com",
        referralCode: "AAA111",
        referredByCode: null,
        invitedAt: null,
        flaggedAt: null,
        verifiedAt: null,
        inviteEmailSentAt: null,
        userId: null,
        utm: { source: "twitter" },
        ipHash: "h1",
        createdAt: new Date("2026-04-20"),
      },
      {
        email: "bob@example.com",
        referralCode: "BBB222",
        referredByCode: null,
        invitedAt: null,
        flaggedAt: null,
        verifiedAt: null,
        inviteEmailSentAt: null,
        userId: null,
        utm: {},
        ipHash: "h2",
        createdAt: new Date("2026-04-21"),
      },
    ]);

    // 1. List unapproved — both entries present
    const listRes = await listGet(listReq("?filter=unapproved"));
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      data: Array<{ email: string; ipHash?: string }>;
    };
    expect(listBody.data.map((d) => d.email).sort()).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
    listBody.data.forEach((row) => expect(row.ipHash).toBeUndefined());

    // 2. Approve alice
    const approveRes = await approvePost(
      postReq("/api/waitlist/approve", { email: "alice@example.com" })
    );
    expect(approveRes.status).toBe(200);
    const approveBody = (await approveRes.json()) as {
      inviteSent: boolean;
      alreadyApproved: boolean;
    };
    expect(approveBody.inviteSent).toBe(true);
    expect(approveBody.alreadyApproved).toBe(false);
    expect(mockInternal).toHaveBeenCalledWith(
      "/api/waitlist/issue-magic-link",
      { email: "alice@example.com" }
    );

    // 3. List approved — alice present, bob excluded
    const approvedRes = await listGet(listReq("?filter=approved"));
    const approvedBody = (await approvedRes.json()) as {
      data: Array<{ email: string }>;
    };
    expect(approvedBody.data.map((d) => d.email)).toEqual([
      "alice@example.com",
    ]);

    // 4. Resend alice's invite — re-reads inviteEmailSentAt after frontend bumps it
    mockInternal.mockClear();
    const resendRes = await resendPost(
      postReq("/api/waitlist/resend", { email: "alice@example.com" })
    );
    expect(resendRes.status).toBe(200);
    const resendBody = (await resendRes.json()) as {
      inviteSent: boolean;
      inviteEmailSentAt: string | null;
    };
    expect(resendBody.inviteSent).toBe(true);
    expect(resendBody.inviteEmailSentAt).not.toBeNull();
    expect(mockInternal).toHaveBeenCalledTimes(1);
  });
});
