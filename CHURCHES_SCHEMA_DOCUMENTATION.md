# Churches Management System - Database Schema Documentation

## Overview

This document describes the comprehensive PostgreSQL schema for the Churches Management System built on Supabase. The system provides secure, role-based access control for managing churches and their relationships with pastors.

## Schema Design Decisions

### 1. User Role Management

**Implementation:** Extended the existing `profiles` table with a `role` column instead of creating a separate `user_roles` table.

**Rationale:**
- Simplifies queries - no JOINs needed to check user permissions
- Better performance for RLS policies (direct column check vs. JOIN)
- Single source of truth for user data
- Follows Supabase best practices for simple role systems

**Roles:**
- `user` (default): Can view all churches (read-only access)
- `administrator`: Full CRUD access to churches and church photos

### 2. Church Type Enum

**Implementation:** Created `church_type` enum with single value 'Church'

**Rationale:**
- Provides extensibility for future church types (e.g., 'Mission', 'Branch', 'Satellite')
- Ensures data consistency through database-level constraints
- Type-safe with PostgreSQL enums

### 3. Pastor Relationships

**Implementation:**
- `lead_pastor_id`: Single UUID foreign key (NOT NULL)
- `assistant_pastor_ids`: Array of UUIDs (default empty array)

**Rationale:**
- **Lead Pastor**: Foreign key ensures referential integrity, prevents deletion of pastor if they lead a church
- **Assistant Pastors**: Array provides flexibility for variable number of assistants without separate junction table
- GIN index on array enables efficient queries for "which churches does pastor X assist?"
- Validation trigger prevents duplicate assistants and ensures lead pastor isn't in assistant list

**Trade-offs:**
- Arrays are less normalized but appropriate for this use case (typically < 10 assistants)
- Simpler queries and fewer JOINs vs. traditional many-to-many relationship
- Helper functions provided for safe array manipulation

### 4. Brazilian-Specific Validation

All Brazilian format fields use regex validation at database level:

- **CEP (postal_code)**: `^\d{5}-\d{3}$` (e.g., "12345-678")
- **CNPJ**: `^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$` (e.g., "12.345.678/9012-34")
- **State**: 2-character check (e.g., "SP", "RJ")
- **Email**: Standard email regex validation
- **Website**: HTTP/HTTPS URL validation (optional field)

### 5. Indexes Strategy

**Created Indexes:**
- `idx_churches_lead_pastor_id`: Foreign key lookups
- `idx_churches_presbytery`: Filter churches by presbytery
- `idx_churches_location`: Compound index for state/city queries
- `idx_churches_cnpj`: Unique identifier lookups
- `idx_churches_assistant_pastors`: GIN index for array containment queries
- `idx_churches_name_lower`: Case-insensitive name searches
- `idx_profiles_role`: Role-based authorization checks

**Rationale:**
- Optimizes common query patterns (location-based searches, pastor relationships)
- Supports RLS policy performance (role index critical)
- GIN index enables efficient "WHERE pastor_id = ANY(assistant_pastor_ids)" queries

### 6. Row Level Security (RLS) Design

**Security Model:**
- RLS enabled on `churches`, `profiles`, and `pastors` tables
- RLS enabled on `storage.objects` for church-photos bucket
- All policies check authenticated users only (no anonymous access)

**Church Table Policies:**
1. **SELECT**: All authenticated users can view churches
2. **INSERT**: Only administrators can create churches
3. **UPDATE**: Only administrators can modify churches
4. **DELETE**: Only administrators can delete churches

**Storage Policies (church-photos):**
1. **SELECT**: Anyone can view (public bucket)
2. **INSERT/UPDATE/DELETE**: Only administrators

**Performance Consideration:**
- Role check uses indexed column `profiles.role`
- Policies use `EXISTS` subquery for efficient role verification
- Single JOIN to profiles table per operation

### 7. Audit Triggers

**Implementation:** Reused existing `handle_updated_at()` function

**Features:**
- Automatically updates `updated_at` timestamp on every UPDATE
- Applied to both churches and pastors tables
- Prevents manual tampering with audit timestamps

### 8. Helper Functions

Created two SECURITY DEFINER functions for safe assistant pastor management:

**`add_assistant_pastor(church_id, pastor_id)`**
- Validates both church and pastor exist
- Prevents duplicate additions
- Prevents adding lead pastor as assistant
- Atomic operation with proper error handling

**`remove_assistant_pastor(church_id, pastor_id)`**
- Safe removal from array
- Graceful handling of non-existent entries
- No cascade effects (removal doesn't delete pastor record)

**Security:** Functions use `SECURITY DEFINER` with locked `search_path` to prevent SQL injection attacks.

### 9. Helper View

**`churches_with_pastors` View:**
- Denormalizes pastor information for easier querying
- Returns lead pastor as JSONB object
- Returns assistant pastors as JSONB array
- Uses `security_invoker = true` to respect RLS of querying user

## Database Schema

### Churches Table

```sql
CREATE TABLE public.churches (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url             text,
  type                  church_type NOT NULL DEFAULT 'Church',
  name                  text NOT NULL,
  address               text NOT NULL,
  neighborhood          text NOT NULL,
  city                  text NOT NULL,
  state                 text NOT NULL CHECK (char_length(state) = 2),
  country               text NOT NULL DEFAULT 'Brazil',
  postal_code           text NOT NULL CHECK (postal_code ~ '^\d{5}-\d{3}$'),
  phone                 text NOT NULL,
  website               text CHECK (website IS NULL OR website ~* '^https?://...'),
  email                 text NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@...'),
  cnpj                  text NOT NULL UNIQUE CHECK (cnpj ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$'),
  lead_pastor_id        uuid NOT NULL REFERENCES pastors(id) ON DELETE RESTRICT,
  assistant_pastor_ids  uuid[] NOT NULL DEFAULT '{}',
  organization_date     date NOT NULL,
  presbytery            presbytery_type NOT NULL DEFAULT 'PANA',
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
```

### Profiles Table (Extended)

```sql
-- Added column:
role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'administrator'))
```

## Usage Examples

### TypeScript Type Definitions

Located in `/Users/fabricioguimaraes/Documents/Dev/a-rol/src/types/database.ts`:

```typescript
export interface Church {
  id: string
  photo_url: string | null
  type: ChurchType
  name: string
  address: string
  neighborhood: string
  city: string
  state: string
  country: string
  postal_code: string
  phone: string
  website: string | null
  email: string
  cnpj: string
  lead_pastor_id: string
  assistant_pastor_ids: string[]
  organization_date: string
  presbytery: Presbytery
  notes: string | null
  created_at: string
  updated_at: string
}

export type ChurchInsert = Omit<Church, 'id' | 'created_at' | 'updated_at'>
export type ChurchUpdate = Partial<Omit<Church, 'id' | 'created_at' | 'updated_at'>>
```

### Query Examples

#### 1. Create a New Church (Administrator Only)

```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('churches')
  .insert({
    name: 'First Presbyterian Church',
    type: 'Church',
    address: 'Rua das Flores, 123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brazil',
    postal_code: '01234-567',
    phone: '+55 11 1234-5678',
    email: 'contato@firstpres.com.br',
    cnpj: '12.345.678/0001-90',
    lead_pastor_id: 'pastor-uuid-here',
    assistant_pastor_ids: [], // Empty array initially
    organization_date: '1950-01-15',
    presbytery: 'PANA',
    notes: 'Founded in 1950'
  })
  .select()
  .single()
```

#### 2. Get All Churches with Pastor Details

```typescript
// Using the helper view
const { data, error } = await supabase
  .from('churches_with_pastors')
  .select('*')
  .order('name')

// Result includes denormalized pastor data:
// {
//   id: '...',
//   name: 'First Presbyterian Church',
//   lead_pastor: { id: '...', name: 'John Doe', email: '...', phone: '...' },
//   assistant_pastors: [
//     { id: '...', name: 'Jane Smith', email: '...', phone: '...' },
//     { id: '...', name: 'Bob Johnson', email: '...', phone: '...' }
//   ],
//   ...
// }
```

#### 3. Search Churches by Location

```typescript
const { data, error } = await supabase
  .from('churches')
  .select('*')
  .eq('state', 'SP')
  .eq('city', 'São Paulo')
  .order('name')
```

#### 4. Find Churches by Presbytery

```typescript
const { data, error } = await supabase
  .from('churches')
  .select('*')
  .eq('presbytery', 'PANA')
```

#### 5. Find All Churches Where a Pastor is Involved

```typescript
// As lead pastor
const { data: asLead } = await supabase
  .from('churches')
  .select('*')
  .eq('lead_pastor_id', pastorId)

// As assistant pastor
const { data: asAssistant } = await supabase
  .from('churches')
  .select('*')
  .contains('assistant_pastor_ids', [pastorId])
```

#### 6. Add Assistant Pastor (Safe Method)

```typescript
// Using helper function
const { error } = await supabase.rpc('add_assistant_pastor', {
  church_id: 'church-uuid',
  pastor_id: 'pastor-uuid'
})

// Or direct array manipulation (requires proper validation)
const { data: church } = await supabase
  .from('churches')
  .select('assistant_pastor_ids')
  .eq('id', churchId)
  .single()

await supabase
  .from('churches')
  .update({
    assistant_pastor_ids: [...church.assistant_pastor_ids, newPastorId]
  })
  .eq('id', churchId)
```

#### 7. Remove Assistant Pastor

```typescript
const { error } = await supabase.rpc('remove_assistant_pastor', {
  church_id: 'church-uuid',
  pastor_id: 'pastor-uuid'
})
```

#### 8. Upload Church Photo

```typescript
// Upload to church-photos bucket (administrators only)
const file = event.target.files[0]
const fileExt = file.name.split('.').pop()
const fileName = `${churchId}.${fileExt}`
const filePath = `${fileName}`

const { error: uploadError } = await supabase.storage
  .from('church-photos')
  .upload(filePath, file, { upsert: true })

if (!uploadError) {
  // Update church record with photo URL
  const { error: updateError } = await supabase
    .from('churches')
    .update({ photo_url: filePath })
    .eq('id', churchId)
}

// Get public URL
const { data } = supabase.storage
  .from('church-photos')
  .getPublicUrl(filePath)
```

### SQL Query Examples

#### Check if User is Administrator

```sql
SELECT role FROM profiles WHERE id = auth.uid();
```

#### Get Churches with Full Pastor Details

```sql
SELECT * FROM churches_with_pastors
WHERE state = 'SP'
ORDER BY name;
```

#### Find Churches Without Assistant Pastors

```sql
SELECT * FROM churches
WHERE array_length(assistant_pastor_ids, 1) IS NULL
   OR array_length(assistant_pastor_ids, 1) = 0;
```

#### Count Churches by Presbytery

```sql
SELECT
  presbytery,
  COUNT(*) as church_count
FROM churches
GROUP BY presbytery;
```

## Storage Buckets

### church-photos Bucket

- **ID**: `church-photos`
- **Public**: Yes (readable by anyone)
- **File Size Limit**: 5MB
- **Allowed MIME Types**: image/jpeg, image/jpg, image/png, image/webp, image/gif
- **RLS Policies**:
  - SELECT: Public access
  - INSERT/UPDATE/DELETE: Administrators only

## Migrations Applied

1. **`create_churches_management_system`**: Main schema creation
   - Extended profiles table with role column
   - Created church_type enum
   - Created churches table with all constraints
   - Created indexes
   - Created validation triggers
   - Created helper functions
   - Created RLS policies
   - Created churches_with_pastors view

2. **`create_church_photos_storage_policies`**: Storage security
   - Created RLS policies for church-photos bucket

3. **`fix_security_advisors_for_churches`**: Security hardening
   - Fixed SECURITY DEFINER view warning
   - Added search_path to all functions

## Security Considerations

### RLS Policy Performance
- All policies are indexed-optimized
- Role checks use `idx_profiles_role` index
- Foreign key checks use existing indexes

### Data Validation
- All Brazilian formats validated at database level
- Email and URL format validation
- State code length validation (2 chars)
- CNPJ uniqueness enforced
- No orphaned records (foreign key constraints)

### Function Security
- All SECURITY DEFINER functions have locked search_path
- Functions validate inputs before operations
- Proper error messages for debugging
- No SQL injection vulnerabilities

### Storage Security
- Public read access for church photos
- Administrator-only write access
- File size limits enforced (5MB)
- MIME type restrictions (images only)

## Testing Checklist

- [ ] Verify administrator user can create churches
- [ ] Verify regular user cannot create churches
- [ ] Test CEP format validation (should accept 12345-678)
- [ ] Test CNPJ format validation (should accept 12.345.678/9012-34)
- [ ] Test CNPJ uniqueness constraint
- [ ] Test email format validation
- [ ] Test website URL validation
- [ ] Test state code validation (should accept only 2 chars)
- [ ] Verify lead_pastor_id foreign key prevents deletion
- [ ] Test add_assistant_pastor function
- [ ] Test remove_assistant_pastor function
- [ ] Verify lead pastor cannot be added as assistant
- [ ] Verify duplicate assistant pastors are prevented
- [ ] Test updated_at trigger on UPDATE
- [ ] Test church photo upload (administrator)
- [ ] Test church photo upload fails (regular user)
- [ ] Query churches_with_pastors view
- [ ] Test search by location (state, city)
- [ ] Test filter by presbytery
- [ ] Test array query for assistant pastors

## Future Enhancements

1. **Soft Deletes**: Add `deleted_at` timestamp for churches
2. **Church History**: Track changes to church leadership
3. **Multiple Locations**: Support for multi-site churches
4. **Church Relationships**: Parent/child church relationships
5. **Membership Tracking**: Add members table linked to churches
6. **Activity Logs**: Audit trail for church record changes
7. **Additional Church Types**: Extend enum for missions, branches, etc.

## Support

For issues or questions about the churches schema:
- Check Supabase dashboard for RLS policy execution
- Review migration logs for any errors
- Use `EXPLAIN ANALYZE` for query performance issues
- Check security advisors regularly: [https://supabase.com/docs/guides/database/database-linter](https://supabase.com/docs/guides/database/database-linter)
