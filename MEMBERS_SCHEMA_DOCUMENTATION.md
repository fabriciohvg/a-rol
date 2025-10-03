# Members Management System - Database Schema Documentation

## Overview

This document describes the comprehensive church members management system database schema, including personal data, ecclesiastical information, and family relationships.

## Database Schema

### Tables Created

1. **members** - Main table storing all member information
2. **member_family_relationships** - Many-to-many relationships between members

### Enums Created

- `sex_type`: 'Male', 'Female'
- `marital_status_type`: Single, Married, Separated, Divorced, Widowed, Common-law union
- `education_level_type`: Primary school, High school, Vocational/Technical, College/University, Master's, Doctorate, Post-doc, Illiterate, Literate, Not informed
- `member_status_type`: Communicant, Non-communicant, Not a member
- `office_type`: Not an officer, Deacon, Elder, Elder on availability
- `admission_method_type`: Baptism, Profession of faith, Baptism and Profession of faith, Transfer, Transfer of guardians, Restoration, Ex-officio jurisdiction, Jurisdiction on request, Jurisdiction over guardians, Presbytery designation
- `dismissal_method_type`: Disciplinary exclusion, Exclusion on request, Exclusion due to absence, Transfer, Transfer of guardians, Transfer by session/council, Jurisdiction assumed, Jurisdiction over guardians, Profession of faith, Deceased, Majority/coming of age, Guardians' request
- `situation_type`: Active, Inactive, Attends
- `family_relationship_type`: Father, Mother, Spouse, Brother/Sister, Son/Daughter

## Key Features

### 1. Automatic Membership Number Generation

The system automatically generates membership numbers in the format **YYYY####** where:
- **YYYY** = Admission year (e.g., 2025)
- **####** = Even sequence number starting at 0002 (0002, 0004, 0006, ..., 9998)

Examples: `20250002`, `20250004`, `20250006`

**How it works:**
- A trigger (`trigger_auto_membership_number`) runs before INSERT
- Calls `generate_membership_number(admission_year, church_id)` function
- Finds the highest membership number for that year and church
- Increments by 2 to generate the next even number
- Maximum 4999 members per church per year (0002 to 9998)

### 2. Family Relationships

The `member_family_relationships` table enables tracking family connections between members:
- Many-to-many relationships
- Bidirectional automatic linking for certain relationship types
- Prevents self-relationships and duplicates

**Bidirectional relationships:**
- Father → Son/Daughter (auto-creates inverse)
- Mother → Son/Daughter (auto-creates inverse)
- Spouse → Spouse (auto-creates inverse)
- Brother/Sister → Brother/Sister (auto-creates inverse)

### 3. Data Validation

**Format Constraints:**
- CPF: `XXX.XXX.XXX-XX` (e.g., `123.456.789-00`)
- Postal Code (CEP): `XXXXX-XXX` (e.g., `12345-678`)
- State: Exactly 2 characters (e.g., `SP`, `RJ`)
- Email: Valid email format
- Membership Number: 8 digits `YYYYYYYY`

**Business Logic Constraints:**
- If `disciplined = true`, `discipline_date` is required
- Cannot create self-relationships in family table
- Membership numbers are unique per church

### 4. Storage Bucket

**member-photos** bucket created with:
- Public read access
- Administrator-only upload/delete
- 5MB file size limit
- Allowed types: JPEG, JPG, PNG, WebP, GIF

### 5. Row Level Security (RLS)

**Members table:**
- Administrators: Full access (SELECT, INSERT, UPDATE, DELETE)
- Authenticated users: Read-only access (SELECT)

**Family Relationships table:**
- Administrators: Full access
- Authenticated users: Read-only access

### 6. Indexes for Performance

- `idx_members_church_id` - Foreign key lookup
- `idx_members_email` - Email searches
- `idx_members_name_lower` - Case-insensitive name search
- `idx_members_situation_status` - Filter active/communicant members
- `idx_members_church_admission` - Church reports by admission date
- `idx_members_cpf` - CPF lookup
- Family relationship indexes on both member IDs and relationship type

## Helper Functions

### 1. `generate_membership_number(admission_year, church_id)`

Generates the next available membership number for a church and year.

```sql
-- Example: Generate membership number for 2025 admission
SELECT generate_membership_number(2025, 'church-uuid-here');
-- Returns: '20250002' (or next available even number)
```

### 2. `add_family_relationship(member_id, related_member_id, relationship_type)`

Adds a family relationship with automatic bidirectional linking.

```sql
-- Example: Add spouse relationship
SELECT add_family_relationship(
  'member-uuid-1',
  'member-uuid-2',
  'Spouse'
);
-- Creates: Member 1 → Spouse → Member 2
-- AND automatically: Member 2 → Spouse → Member 1

-- Example: Add father relationship
SELECT add_family_relationship(
  'father-uuid',
  'child-uuid',
  'Father'
);
-- Creates: Father → Father → Child
-- AND automatically: Child → Son/Daughter → Father
```

### 3. `get_member_family(member_id)`

Returns all family members with relationship details, ordered by relationship priority.

```sql
-- Example: Get all family members of a specific member
SELECT * FROM get_member_family('member-uuid-here');

-- Returns:
-- relationship_id | related_member_id | related_member_name | relationship_type | related_member_photo_url
```

## Useful Views

### 1. `members_with_church`

Members joined with church information.

```sql
SELECT * FROM members_with_church
WHERE church_city = 'São Paulo';
```

### 2. `active_members`

Filtered view of only active members.

```sql
SELECT * FROM active_members
WHERE church_id = 'church-uuid';
```

### 3. `members_with_families`

Aggregated view with family member counts and details.

```sql
SELECT
  name,
  family_members_count,
  family_members
FROM members_with_families
WHERE id = 'member-uuid';
```

## TypeScript Integration

### Basic Member Operations

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabase = createClient<Database>(url, key)

// Insert a new member (membership_number auto-generated)
const { data, error } = await supabase
  .from('members')
  .insert({
    name: 'João Silva',
    cpf: '123.456.789-00',
    email: 'joao@example.com',
    phone: '(11) 98765-4321',
    mobile: '(11) 98765-4321',
    address: 'Rua Example, 123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    postal_code: '01234-567',
    country: 'Brazil',
    date_of_birth: '1990-01-15',
    place_of_birth: 'São Paulo',
    sex: 'Male',
    marital_status: 'Married',
    church_id: 'church-uuid',
    admission_date: '2025-01-01',
    admission_method: 'Baptism',
    member_status: 'Communicant',
    office: 'Not an officer',
    situation: 'Active',
    disciplined: false,
    pending_transfer: false
  })
  .select()
  .single()

// Query active members with church info
const { data: activeMembers } = await supabase
  .from('members_with_church')
  .select('*')
  .eq('situation', 'Active')
  .eq('church_id', 'church-uuid')

// Get member with family relationships
const { data: memberFamily } = await supabase
  .rpc('get_member_family', { p_member_id: 'member-uuid' })
```

### Family Relationship Operations

```typescript
// Add a family relationship (bidirectional)
const { error } = await supabase.rpc('add_family_relationship', {
  p_member_id: 'member-uuid-1',
  p_related_member_id: 'member-uuid-2',
  p_relationship_type: 'Spouse'
})

// Manual insert (for more control)
const { error } = await supabase
  .from('member_family_relationships')
  .insert({
    member_id: 'member-uuid',
    related_member_id: 'related-member-uuid',
    relationship_type: 'Father'
  })

// Get all family members
const { data: family } = await supabase
  .from('member_family_relationships')
  .select(`
    id,
    relationship_type,
    related_member:members!related_member_id (
      id,
      name,
      photo_url,
      date_of_birth
    )
  `)
  .eq('member_id', 'member-uuid')
```

### Upload Member Photo

```typescript
// Upload photo to storage
const file = event.target.files[0]
const fileExt = file.name.split('.').pop()
const fileName = `${memberId}.${fileExt}`
const filePath = `${fileName}`

const { error: uploadError } = await supabase.storage
  .from('member-photos')
  .upload(filePath, file, { upsert: true })

if (!uploadError) {
  // Update member record with photo URL
  const { error: updateError } = await supabase
    .from('members')
    .update({ photo_url: filePath })
    .eq('id', memberId)
}

// Get public URL for display
const { data } = supabase.storage
  .from('member-photos')
  .getPublicUrl(filePath)

console.log(data.publicUrl)
```

## Common Queries

### Search Members

```typescript
// Search by name (case-insensitive)
const { data } = await supabase
  .from('members')
  .select('*')
  .ilike('name', '%silva%')

// Search by CPF
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('cpf', '123.456.789-00')

// Filter by multiple criteria
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('church_id', 'church-uuid')
  .eq('situation', 'Active')
  .eq('member_status', 'Communicant')
  .order('name')
```

### Reports and Statistics

```typescript
// Count members by church
const { count } = await supabase
  .from('members')
  .select('*', { count: 'exact', head: true })
  .eq('church_id', 'church-uuid')

// Get members admitted in a specific year
const { data } = await supabase
  .from('members')
  .select('*')
  .gte('admission_date', '2025-01-01')
  .lt('admission_date', '2026-01-01')
  .eq('church_id', 'church-uuid')

// Members with discipline records
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('disciplined', true)
  .not('discipline_date', 'is', null)
```

### Update Operations

```typescript
// Update member status
const { error } = await supabase
  .from('members')
  .update({
    situation: 'Inactive',
    dismissal_date: '2025-12-31',
    dismissal_method: 'Transfer'
  })
  .eq('id', 'member-uuid')

// Apply discipline
const { error } = await supabase
  .from('members')
  .update({
    disciplined: true,
    discipline_date: '2025-06-15',
    discipline_notes: 'Details of disciplinary action...'
  })
  .eq('id', 'member-uuid')
```

## Database Migrations

The schema was created using three migrations:

1. **create_members_management_system** - Creates tables, enums, indexes, functions, views, and RLS policies
2. **create_member_photos_storage** - Creates storage bucket and policies
3. **fix_members_security_advisors** - Fixes security issues (views and function search_path)

## Security Considerations

### Current RLS Configuration

**Limitations:**
- Currently, all authenticated users can view all members
- Only administrators can modify member data

**Future Enhancement:**
To restrict members to specific churches, you could add a `church_id` column to the `profiles` table and update the RLS policies:

```sql
-- Example: Users can only view members from their assigned church
CREATE POLICY "Users can view members from their church"
  ON members
  FOR SELECT
  TO authenticated
  USING (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### Data Privacy

Consider implementing additional privacy controls:
- Limit sensitive fields (CPF, address, phone) to administrators only
- Create separate views for different user roles
- Implement field-level RLS for sensitive columns

## Testing the Schema

### Test Membership Number Generation

```sql
-- Insert test member (membership number auto-generated)
INSERT INTO members (
  name, cpf, email, phone, mobile, address, neighborhood,
  city, state, postal_code, date_of_birth, place_of_birth,
  sex, marital_status, church_id, admission_date, admission_method
) VALUES (
  'Test Member 1',
  '111.111.111-11',
  'test1@example.com',
  '(11) 1111-1111',
  '(11) 11111-1111',
  'Test Address',
  'Test Neighborhood',
  'São Paulo',
  'SP',
  '01234-567',
  '1990-01-01',
  'São Paulo',
  'Male',
  'Single',
  'your-church-uuid-here',
  '2025-01-15',
  'Baptism'
) RETURNING membership_number;

-- Should return: 20250002

-- Insert another member for same church/year
INSERT INTO members (
  name, cpf, email, phone, mobile, address, neighborhood,
  city, state, postal_code, date_of_birth, place_of_birth,
  sex, marital_status, church_id, admission_date, admission_method
) VALUES (
  'Test Member 2',
  '222.222.222-22',
  'test2@example.com',
  '(11) 2222-2222',
  '(11) 22222-2222',
  'Test Address 2',
  'Test Neighborhood',
  'São Paulo',
  'SP',
  '01234-567',
  '1991-01-01',
  'São Paulo',
  'Female',
  'Single',
  'your-church-uuid-here',
  '2025-02-20',
  'Profession of faith'
) RETURNING membership_number;

-- Should return: 20250004
```

### Test Family Relationships

```sql
-- Add spouse relationship (bidirectional)
SELECT add_family_relationship(
  (SELECT id FROM members WHERE cpf = '111.111.111-11'),
  (SELECT id FROM members WHERE cpf = '222.222.222-22'),
  'Spouse'
);

-- Verify both directions were created
SELECT
  m1.name as member_name,
  mfr.relationship_type,
  m2.name as related_member_name
FROM member_family_relationships mfr
JOIN members m1 ON m1.id = mfr.member_id
JOIN members m2 ON m2.id = mfr.related_member_id
ORDER BY m1.name;
```

## Design Decisions

### 1. Membership Number Format

**Decision:** YYYY#### with even numbers only
**Rationale:**
- Year prefix allows easy filtering by admission year
- Even numbers only might be a church tradition or allow odd numbers for special cases
- 4-digit sequence allows up to 4,999 members per church per year
- Auto-generation prevents duplicates and human error

### 2. Family Relationships Structure

**Decision:** Separate many-to-many table with bidirectional linking
**Rationale:**
- Flexible: Can represent any family structure
- Scalable: No limit on family size
- Bidirectional: Ensures consistency (if A is spouse of B, then B is spouse of A)
- Query-friendly: Easy to get all family members with a single query

### 3. Legacy Fields (wife, spouse)

**Decision:** Keep both `wife` and `spouse` fields
**Rationale:**
- `wife` is a legacy field that might contain historical data
- `spouse` is the modern, gender-neutral field
- Allows data migration without breaking existing systems
- Applications should use `spouse` for new data

### 4. Discipline Tracking

**Decision:** Boolean flag + date + notes
**Rationale:**
- Simple flag for quick filtering
- Date tracks when discipline was applied
- Notes provide context and details
- Constraint ensures date is set when disciplined = true

### 5. Soft Constraints

**Decision:** Some validations are database constraints, others are application-level
**Rationale:**
- Hard constraints: CPF format, postal code, email (prevent invalid data)
- Soft constraints: wedding_date for married members (warning, not error)
- Allows flexibility while maintaining data quality

## Conclusion

This schema provides a comprehensive, secure, and performant foundation for managing church members. The automatic membership number generation, family relationship tracking, and extensive validation ensure data integrity while the RLS policies protect sensitive information.

For questions or improvements, please refer to the Supabase documentation or consult with the database administrator.
