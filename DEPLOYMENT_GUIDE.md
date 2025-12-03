# Deployment Guide - High-Priority Security Fixes

**Branch**: `feature/high-priority-security-fixes`
**Target**: Production
**Risk Level**: Medium (backward compatible, requires testing)

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] Review [SECURITY_FIXES.md](SECURITY_FIXES.md) for all changes
- [ ] Review modified API routes
- [ ] Review new middleware and utilities
- [ ] Review test coverage

### 2. Testing
```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch
```

### 3. Environment Preparation
No new environment variables required. Verify existing:
- [ ] `MONGODB_URI` is set
- [ ] `DB_NAME` is set
- [ ] `AUTH_SECRET` is set
- [ ] `NEXTAUTH_URL` is set

---

## Deployment Steps

### Step 1: Deploy Code

#### Option A: Manual Deployment
```bash
# Pull latest code
git checkout main
git pull origin main
git merge feature/high-priority-security-fixes

# Install dependencies
npm install

# Build application
npm run build

# Restart application
pm2 restart all
# OR
systemctl restart hammershift-admin
```

#### Option B: CI/CD Pipeline
```bash
# Push to main branch
git push origin feature/high-priority-security-fixes

# Create pull request
# Wait for CI/CD pipeline to run tests
# Merge after approval
```

### Step 2: Database Index Creation

**IMPORTANT**: Run this script after deployment to create indexes.

#### Option A: MongoDB Shell
```javascript
// Connect to your MongoDB
use hammershift_admin

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ isActive: 1, isBanned: 1 })
db.users.createIndex({ createdAt: -1 })

// Wagers indexes
db.wagers.createIndex({ auctionID: 1 })
db.wagers.createIndex({ "user._id": 1 })
db.wagers.createIndex({ auctionID: 1, "user._id": 1 }, { unique: true })
db.wagers.createIndex({ isActive: 1 })
db.wagers.createIndex({ createdAt: -1 })

// Auctions indexes
db.auctions.createIndex({ auction_id: 1 }, { unique: true })
db.auctions.createIndex({ isActive: 1 })
db.auctions.createIndex({ ended: 1 })
db.auctions.createIndex({ isActive: 1, ended: 1 })
db.auctions.createIndex({ statusAndPriceChecked: 1 })
db.auctions.createIndex({ createdAt: -1 })

// Predictions indexes
db.predictions.createIndex({ auction_id: 1 })
db.predictions.createIndex({ tournament_id: 1 })
db.predictions.createIndex({ auction_id: 1, tournament_id: 1 })
db.predictions.createIndex({ "user.userId": 1 })
db.predictions.createIndex({ auction_id: 1, "user.userId": 1 })
db.predictions.createIndex({ isActive: 1 })
db.predictions.createIndex({ "user.role": 1 })
db.predictions.createIndex({ createdAt: -1 })

// Tournaments indexes
db.tournaments.createIndex({ tournament_id: 1 }, { unique: true })
db.tournaments.createIndex({ isActive: 1 })
db.tournaments.createIndex({ haveWinners: 1 })
db.tournaments.createIndex({ startTime: 1 })
db.tournaments.createIndex({ endTime: 1 })
db.tournaments.createIndex({ "users.userId": 1 })
db.tournaments.createIndex({ createdAt: -1 })

// Transactions indexes
db.transactions.createIndex({ userID: 1 })
db.transactions.createIndex({ transactionType: 1 })
db.transactions.createIndex({ transactionType: 1, status: 1 })
db.transactions.createIndex({ status: 1 })
db.transactions.createIndex({ transactionDate: -1 })
db.transactions.createIndex({ userID: 1, transactionDate: -1 })

print("All indexes created successfully!")
```

#### Option B: Node.js Script
Create and run `scripts/createIndexes.js`:
```javascript
const mongoose = require('mongoose');

async function createIndexes() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME,
  });

  const db = mongoose.connection.db;

  console.log('Creating indexes...');

  // Users
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });
  // ... (rest of indexes)

  console.log('Indexes created successfully!');
  await mongoose.connection.close();
}

createIndexes().catch(console.error);
```

Run with:
```bash
node scripts/createIndexes.js
```

### Step 3: Smoke Tests

#### Test Critical Endpoints

```bash
# Set your API URL
API_URL="https://your-domain.com"
TOKEN="your-admin-jwt-token"

# Test transactions API (should return 401 without auth)
curl -X GET "$API_URL/api/transactions"

# Test transactions API (should return 200 with auth)
curl -X GET "$API_URL/api/transactions" \
  -H "Cookie: next-auth.session-token=$TOKEN"

# Test refund API (should return 401 without auth)
curl -X POST "$API_URL/api/refundAuctionWagers" \
  -H "Content-Type: application/json" \
  -d '{"wager_id":"507f1f77bcf86cd799439011"}'

# Test wagers API (should return data with pagination)
curl -X GET "$API_URL/api/wagers?limit=10&offset=0" \
  -H "Cookie: next-auth.session-token=$TOKEN"
```

### Step 4: Monitor

#### Immediately After Deployment (First Hour)
- [ ] Check application logs for errors
- [ ] Monitor error rate in APM tools
- [ ] Check response times
- [ ] Verify no 500 errors
- [ ] Check database connection pool usage

#### First 24 Hours
- [ ] Monitor transaction success rate
- [ ] Check for any rollback errors
- [ ] Verify pagination is working
- [ ] Check authorization is blocking unauthorized requests
- [ ] Monitor database query performance

---

## Rollback Plan

If critical issues are detected:

### Step 1: Revert Code
```bash
# Find the commit before the merge
git log --oneline -5

# Revert to previous version
git revert HEAD
npm install
npm run build
pm2 restart all
```

### Step 2: Verify Rollback
```bash
# Check application is running
curl https://your-domain.com/api/health

# Verify critical endpoints work
curl https://your-domain.com/api/wagers
```

### Step 3: Investigate
- Check application logs
- Review error reports
- Identify root cause
- Fix in development
- Re-deploy after thorough testing

---

## Post-Deployment Tasks

### Immediate (Within 24 Hours)
- [ ] Verify all smoke tests pass
- [ ] Check error logs for any issues
- [ ] Monitor performance metrics
- [ ] Update team on deployment status

### Short Term (Within 1 Week)
- [ ] Review application performance
- [ ] Analyze query performance improvements
- [ ] Check test coverage reports
- [ ] Document any issues found
- [ ] Plan next iteration improvements

### Medium Term (Within 1 Month)
- [ ] Add remaining API route tests
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Setup alerting
- [ ] Performance benchmarking

---

## Testing Scenarios

### Scenario 1: Transaction Viewing
1. Login as admin
2. Navigate to transactions page
3. Verify transactions load with pagination
4. Try to access as non-admin (should fail)

### Scenario 2: Refund Processing
1. Login as admin
2. Find an active wager
3. Process refund
4. Verify balance updated
5. Verify transaction created
6. Verify wager marked as refunded
7. Try to refund again (should fail)

### Scenario 3: Withdrawal Approval
1. Login as owner/admin
2. Find pending withdrawal
3. Approve withdrawal
4. Verify balance deducted
5. Verify status updated
6. Try to approve again (should fail)
7. Try with insufficient balance (should fail)

### Scenario 4: Error Handling
1. Submit invalid data
2. Verify proper error message returned
3. Verify 400 status code
4. Verify no data corruption

### Scenario 5: Transaction Rollback
1. Simulate error during transaction
2. Verify all changes rolled back
3. Verify database consistency
4. Verify proper error reported

---

## Performance Metrics to Track

### Before Deployment
Run baseline metrics:
```bash
# Query performance
time mongo --eval "db.users.find({email: 'test@test.com'}).explain()"
time mongo --eval "db.wagers.find({auctionID: ObjectId()}).explain()"
```

### After Deployment
Compare metrics:
```bash
# Should show index usage
time mongo --eval "db.users.find({email: 'test@test.com'}).explain()"
time mongo --eval "db.wagers.find({auctionID: ObjectId()}).explain()"
```

Expected improvements:
- Query time: 10-100x faster
- Full table scans: Eliminated
- Index usage: 100%

---

## Troubleshooting

### Issue: Tests Failing
**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Jest cache
npm test -- --clearCache

# Run tests again
npm test
```

### Issue: Indexes Not Created
**Solution**:
```bash
# Connect to MongoDB and check indexes
mongo
use hammershift_admin
db.users.getIndexes()

# If missing, run index creation script again
```

### Issue: Authorization Errors
**Solution**:
- Verify `AUTH_SECRET` environment variable is set
- Check NextAuth configuration
- Verify JWT token is valid
- Check admin role in database

### Issue: Transaction Errors
**Solution**:
- Verify MongoDB replica set is configured
- Check MongoDB version (needs 4.0+)
- Review transaction error logs
- Test with single operation first

### Issue: Performance Degradation
**Solution**:
- Verify indexes were created successfully
- Check slow query log
- Review connection pool settings
- Monitor memory usage

---

## Success Criteria

### Deployment is successful if:
- [x] All smoke tests pass
- [x] No critical errors in logs
- [x] Authorization blocks unauthorized access
- [x] Refunds complete successfully
- [x] Withdrawals process correctly
- [x] Transactions rollback on errors
- [x] Query performance improved
- [x] Test coverage at 70%+

### Deployment needs investigation if:
- [ ] 5xx error rate > 0.1%
- [ ] Response time > 2x baseline
- [ ] Transaction failure rate > 0%
- [ ] Authorization bypass detected
- [ ] Data inconsistencies found

---

## Support Contacts

- **Backend Lead**: [Name]
- **DevOps**: [Name]
- **DBA**: [Name]
- **Security**: [Name]
- **On-Call**: [Phone/Slack]

---

## Additional Resources

- [SECURITY_FIXES.md](SECURITY_FIXES.md) - Detailed change documentation
- [__tests__/README.md](__tests__/README.md) - Testing guide
- [Next.js Docs](https://nextjs.org/docs) - Framework documentation
- [Mongoose Docs](https://mongoosejs.com/) - ORM documentation
- [Jest Docs](https://jestjs.io/) - Testing framework

---

**Deployment Window**: Off-peak hours recommended
**Estimated Downtime**: None (rolling deployment)
**Rollback Time**: < 5 minutes if needed
**Risk Level**: Medium (backward compatible but critical changes)

Good luck with the deployment! 🚀
