# <Feature Name>

## Requirement

### Problem
<What user problem this feature solves>

### User Story
As a <user>, I want to <action>, so that <outcome>.

### Scope
- In scope:
  - <item>
- Out of scope:
  - <item>

## Analysis

### Domain Notes
- Entities involved:
  - <entity>
- Business rules:
  - <rule>

### Data and State
- Inputs:
  - <input>
- Outputs:
  - <output>
- Query keys:
  - <query-key>

### Route and UX Impact
- Routes:
  - <route>
- UI states:
  - loading
  - error
  - empty
  - success

### UI Components (shadcn)
- New components required:
  - <component>
- Install command(s):
  - `pnpm dlx shadcn@latest add <component>`
- Theme alignment:
  - Use warm palette tokens from `src/styles.css`

### Risks and Constraints
- <risk>

## Implementation Plan

### Step 1: Schema and Validation
- [ ] Add/update zod schemas
- [ ] Add/update DB schema if needed

### Step 2: Server Layer
- [ ] Add/update server function(s)
- [ ] Keep response DTO typed and minimal

### Step 3: Query and Client Layer
- [ ] Add/update query keys
- [ ] Add/update query/mutation hooks
- [ ] Add invalidation strategy

### Step 4: Route and UI Layer
- [ ] Add/update route loader
- [ ] Install missing shadcn components for this requirement
- [ ] Add/update page and components
- [ ] Implement loading/error/empty/success states

### Step 5: Testing
- [ ] Unit tests for helpers/schemas
- [ ] Integration test for feature flow

## Acceptance Criteria
- [ ] <criterion>
- [ ] <criterion>
- [ ] <criterion>

## Task Checklist
- [ ] Requirement finalized
- [ ] Analysis finalized
- [ ] Implementation merged
- [ ] Basic regression checks passed
