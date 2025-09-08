# Database Schema Updates

## 001 - Increase Payment Amount Precision

### Problem
The `payments` table `amount` column has a `NUMERIC(10,2)` constraint that limits payment amounts to a maximum of 99,999,999.99. When trying to register larger amounts (like 117,000,000.00 COP), the system throws a "numeric field overflow" error.

### Solution
Update the `amount` column to `NUMERIC(15,2)` which will allow amounts up to 999,999,999,999.99.

### How to Execute

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `001_increase_payment_amount_precision.sql`
4. Execute the SQL commands one by one or all at once

#### Option 2: Supabase CLI (if installed)
```bash
supabase db push
```

#### Option 3: Direct SQL Connection
If you have direct access to your PostgreSQL database:
```bash
psql "your-connection-string" -f 001_increase_payment_amount_precision.sql
```

### Verification Steps
1. After running the migration, verify the column was updated:
   ```sql
   SELECT 
       column_name,
       data_type,
       numeric_precision,
       numeric_scale
   FROM information_schema.columns 
   WHERE table_name = 'payments' AND column_name = 'amount';
   ```
   
2. Expected result:
   - `column_name`: amount
   - `data_type`: numeric
   - `numeric_precision`: 15
   - `numeric_scale`: 2

3. Test with a large payment amount in your application to ensure the error is resolved.

### Rollback (if needed)
If you need to rollback this change:
```sql
-- WARNING: This will fail if you have amounts > 99,999,999.99
ALTER TABLE payments 
ALTER COLUMN amount TYPE NUMERIC(10,2);
```

### Impact
- **Breaking changes**: None
- **Data loss risk**: None (we're increasing precision, not decreasing)
- **Downtime**: Minimal (schema update is usually quick)
- **Application changes**: None required

### Notes
- This change is backward compatible
- Existing payment data will remain unchanged
- The frontend application will now be able to handle larger payment amounts without modification
- Consider updating any business logic or UI that might have hardcoded limits based on the old constraint