# Testing Guide for HammerShift Admin

This directory contains comprehensive tests for the HammerShift admin backend.

## Test Structure

```
__tests__/
├── helpers/           # Test utilities and fixtures
│   ├── testDb.ts      # In-memory MongoDB setup
│   └── testFixtures.ts # Factory functions for test data
├── integration/       # API route integration tests
│   └── api/
│       ├── transactions.test.ts
│       ├── refundAuctionWagers.test.ts
│       └── withdrawRequest.test.ts
└── unit/              # Unit tests for utilities
    └── lib/
        ├── validation.test.ts
        ├── dbHelpers.test.ts
        └── authMiddleware.test.ts
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run only integration tests
```bash
npm run test:integration
```

### Run only unit tests
```bash
npm run test:unit
```

### Run with coverage report
```bash
npm test -- --coverage
```

## Test Coverage

Current coverage targets (defined in jest.config.js):
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Writing Tests

### Integration Tests

Integration tests verify that API routes work correctly end-to-end:

```typescript
import { NextRequest } from "next/server";
import { GET } from "@/app/api/your-route/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createMockSession } from "../../helpers/testFixtures";

describe("Your API Route", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  it("should do something", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

    const req = new NextRequest("http://localhost:3000/api/your-route");
    const response = await GET(req);

    expect(response.status).toBe(200);
  });
});
```

### Unit Tests

Unit tests verify individual functions work correctly:

```typescript
import { yourFunction } from "@/app/lib/yourModule";

describe("yourFunction", () => {
  it("should return expected result", () => {
    const result = yourFunction("input");
    expect(result).toBe("expected");
  });
});
```

## Test Helpers

### Database Helpers

- `setupTestDb()` - Set up in-memory MongoDB before all tests
- `teardownTestDb()` - Clean up after all tests
- `resetTestDb()` - Clear data between tests

### Fixture Helpers

- `createTestUser()` - Create test user
- `createTestAgent()` - Create test AI agent
- `createTestAuction()` - Create test auction
- `createTestWager()` - Create test wager
- `createTestTournament()` - Create test tournament
- `createTestPrediction()` - Create test prediction
- `createTestTransaction()` - Create test transaction
- `createTestAdmin()` - Create test admin
- `createMockSession()` - Create mock NextAuth session

All fixtures accept an `overrides` object to customize data.

## Test Data

Tests use the in-memory MongoDB database provided by `mongodb-memory-server`. This means:
- Tests are fast
- Tests are isolated
- No external database required
- Data is automatically cleaned up

## Mocking

### NextAuth

NextAuth is mocked in all tests. To set up authentication:

```typescript
import { getServerSession } from "next-auth";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// In your test:
mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);
```

### Next.js Navigation

Next.js navigation is mocked in `jest.setup.js`:
- `redirect`
- `useRouter`
- `usePathname`
- `useSearchParams`

## Best Practices

1. **Isolate tests** - Use `resetTestDb()` between tests
2. **Test error cases** - Always test both success and failure paths
3. **Test authorization** - Verify role-based access control
4. **Test validation** - Verify input validation works
5. **Test transactions** - Verify atomic operations rollback on error
6. **Use fixtures** - Use helper functions to create test data
7. **Mock external services** - Mock Firebase, email, etc.
8. **Clear mocks** - Call `jest.clearAllMocks()` in `beforeEach`

## Continuous Integration

Tests should run automatically in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests timing out
- Increase timeout in `jest.config.js` or individual tests
- Check for unhandled promises
- Ensure database connections are properly closed

### Tests failing randomly
- Check for shared state between tests
- Ensure `resetTestDb()` is called in `beforeEach`
- Look for timing issues with async operations

### Database connection errors
- Ensure MongoDB Memory Server is properly installed
- Check that ports are not already in use
- Verify Node.js version compatibility

## Future Improvements

- [ ] Add tests for remaining API routes
- [ ] Add E2E tests with Playwright
- [ ] Add performance tests
- [ ] Add load tests
- [ ] Increase coverage to 80%
- [ ] Add mutation testing
- [ ] Add visual regression tests
