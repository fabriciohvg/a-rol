# Church Hierarchy Documentation

## Overview

The churches table now supports a hierarchical structure where independent mother churches can have congregations. This allows tracking of church plants, mission congregations, and other dependent church organizations.

## Database Schema Changes

### 1. Church Types (Enum)

The `church_type` enum now includes four values:

- **Church**: Independent mother churches that can have congregations
- **Congregation**: A dependent church under a mother church
- **Presbyterial Congregation**: A dependent church with presbyterial oversight
- **Preaching Point**: A new church plant or mission point

### 2. New Column

**parent_church_id** (UUID, nullable)
- References `churches.id` (self-referencing foreign key)
- NULL for independent churches
- Required for congregations
- ON DELETE SET NULL (if parent is deleted, congregation remains but loses parent link)

### 3. Business Rules

The following constraints enforce data integrity:

#### Type-Parent Consistency
```sql
CHECK (
  (parent_church_id IS NULL AND type = 'Church') OR
  (parent_church_id IS NOT NULL AND type IN ('Congregation', 'Presbyterial Congregation', 'Preaching Point'))
)
```
- Independent churches (type='Church') must have parent_church_id = NULL
- Congregations must have a parent_church_id

#### No Self-Reference
```sql
CHECK (id != parent_church_id)
```
- A church cannot be its own parent

#### No Nested Congregations (Trigger)
- Only churches with type='Church' can be parent churches
- Congregations cannot have their own congregations
- Enforced by `validate_congregation_hierarchy()` trigger

## Helper Functions

### get_church_congregations(church_id UUID)
Returns all direct congregations under a mother church.

**Returns:**
- id, name, type, city, state, lead_pastor_id, organization_date, created_at

**Example:**
```sql
SELECT * FROM get_church_congregations('uuid-of-mother-church');
```

### get_church_hierarchy(church_id UUID)
Returns the complete hierarchy tree starting from a church (useful for future multi-level support).

**Returns:**
- id, name, type, parent_church_id, level, path

**Example:**
```sql
SELECT * FROM get_church_hierarchy('uuid-of-mother-church');
```

### can_delete_church(church_id UUID)
Returns TRUE if a church has no congregations and can be safely deleted.

**Example:**
```sql
SELECT can_delete_church('uuid-of-church');
```

### get_congregation_count(church_id UUID)
Returns the number of congregations under a church.

**Example:**
```sql
SELECT get_congregation_count('uuid-of-mother-church');
```

## Views

### independent_churches
Shows only independent (mother) churches.

**Usage:**
```sql
SELECT * FROM independent_churches ORDER BY name;
```

### churches_with_congregations
Shows all independent churches with their congregation counts.

**Columns:**
- All basic church info
- congregation_count (INTEGER)

**Usage:**
```sql
SELECT name, city, congregation_count 
FROM churches_with_congregations 
WHERE congregation_count > 0;
```

### all_congregations
Shows all congregations with parent church information.

**Columns:**
- All congregation info
- parent_church_name
- parent_church_city

**Usage:**
```sql
SELECT name, type, parent_church_name, city 
FROM all_congregations 
ORDER BY parent_church_name, name;
```

## TypeScript Types

The updated TypeScript types include:

```typescript
// Church type enum
type ChurchType = 'Church' | 'Congregation' | 'Presbyterial Congregation' | 'Preaching Point'

// Churches table now includes:
interface Church {
  // ... existing fields
  type: ChurchType
  parent_church_id: string | null
}

// Helper function types
type GetChurchCongregationsResult = {
  id: string
  name: string
  type: ChurchType
  city: string
  state: string
  lead_pastor_id: string
  organization_date: string
  created_at: string
}

type GetChurchHierarchyResult = {
  id: string
  name: string
  type: ChurchType
  parent_church_id: string
  level: number
  path: string
}
```

## Usage Examples

### Creating an Independent Church
```typescript
const { data, error } = await supabase
  .from('churches')
  .insert({
    type: 'Church',
    parent_church_id: null, // NULL for independent churches
    name: 'First Presbyterian Church',
    // ... other required fields
  })
```

### Creating a Congregation
```typescript
const { data, error } = await supabase
  .from('churches')
  .insert({
    type: 'Congregation',
    parent_church_id: 'uuid-of-mother-church', // Required for congregations
    name: 'Mission Congregation',
    // ... other required fields
  })
```

### Querying Congregations of a Church
```typescript
// Using the helper function
const { data, error } = await supabase
  .rpc('get_church_congregations', { church_id: 'uuid-of-mother-church' })

// Or using direct query
const { data, error } = await supabase
  .from('churches')
  .select('*')
  .eq('parent_church_id', 'uuid-of-mother-church')
  .order('name')
```

### Checking if a Church Can Be Deleted
```typescript
const { data: canDelete, error } = await supabase
  .rpc('can_delete_church', { church_id: 'uuid-of-church' })

if (canDelete) {
  // Safe to delete
  await supabase.from('churches').delete().eq('id', 'uuid-of-church')
} else {
  // Has congregations, show warning
  alert('Cannot delete church with congregations')
}
```

### Getting Church Statistics
```typescript
// Get all mother churches with congregation counts
const { data, error } = await supabase
  .from('churches_with_congregations')
  .select('*')
  .order('congregation_count', { ascending: false })
```

## Validation Rules

### Frontend Validation
When building forms, enforce:

1. **Type Selection**:
   - If creating a new independent church, automatically set `type = 'Church'` and `parent_church_id = null`
   - If creating a congregation, require parent church selection and offer congregation type options

2. **Parent Church Selection**:
   - Only show churches with `type = 'Church'` in parent selection dropdown
   - Disable parent selection when type is 'Church'
   - Require parent selection when type is a congregation type

3. **Before Deletion**:
   - Call `can_delete_church()` function
   - If returns false, show warning: "Cannot delete church with congregations"

## Performance Considerations

The following indexes optimize hierarchy queries:

- `idx_churches_parent_church_id`: Fast lookup of all congregations under a parent
- `idx_churches_parent_type`: Filtering congregations by type under a parent
- `idx_churches_independent`: Fast filtering of independent churches only

## Migration Files

This feature was implemented in two migrations:

1. **20251003XXXXXX_add_congregation_types_to_church_enum.sql**
   - Adds new church_type enum values

2. **20251003XXXXXX_add_congregation_hierarchy_to_churches.sql**
   - Adds parent_church_id column
   - Creates constraints, indexes, functions, and views

## Security Considerations

- All helper functions use `SECURITY INVOKER` (run with calling user's permissions)
- RLS policies on churches table apply to all hierarchy queries
- The validation trigger uses `SECURITY DEFINER` but only enforces business logic
- Views respect RLS policies of underlying tables

## Future Enhancements

The current design supports future multi-level hierarchies:

- The `get_church_hierarchy()` function already uses recursive CTEs
- Could potentially allow congregations to have their own sub-congregations
- Would require relaxing the `validate_congregation_hierarchy()` trigger
- Consider carefully the ecclesiastical structure before implementing

## Support

For questions or issues related to church hierarchy:
1. Check constraint violations indicate business rule violations
2. Trigger errors indicate invalid parent church selection
3. Use helper functions for safe operations
4. Consult views for pre-filtered data
