# Skill: Spec-Driven Development (amsterdam-to-vzla)

## Workflow

1. Read the spec from Plane.so issue or local `docs/specs/` file
2. Refine the spec with clarifying questions if needed
3. Write tests that validate the spec (Vitest)
4. Implement until all tests pass
5. Verify implementation matches spec
6. Mark complete

## Spec Template

Every spec must include:

```markdown
## Endpoint / Feature
**Method:** GET | POST | PUT | DELETE
**Path:** /api/v1/...

## Request
- Headers, body, params expected

## Response
- Status codes, response shape

## Behavior
- Business rules, edge cases

## Acceptance Criteria
- [ ] Checklist of verifiable items
```
