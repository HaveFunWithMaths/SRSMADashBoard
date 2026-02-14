# Authentication SOP

## Overview
Authentication is credential-based using `Data/LoginData.xlsx`. It restricts access so Parents only see their child's data.

## Identity Source
- **File**: `Data/LoginData.xlsx`
- **Schema**: `username`, `password` (plaintext initially).
- **Transformation**: On application start (or first access?), passwords should be hashed?
  - *Current constraint*: File is source of truth. We read from excel.
  - *Security*: We will hash the input password and compare? No, excel has plaintext.
  - **Decision**: For V1, we verify against plaintext in Excel (or hashed if we update Excel).
  - **Hybrid**: App reads Excel. Logic compares `bcrypt(input)` vs `hash`?
  - **Simplification for V1**: Read rows. Find user. Validate password.
  - **Session**: standard NextAuth JWT.

## Authorization Rules
1. **Student/Parent**:
   - `Role`: "student"
   - `Access`: Only data where `Student.Name === Session.Username`.
2. **Teacher** (Future/Mock):
   - `Role`: "teacher"
   - `Access`: All data for assigned Classes.
3. **Admin** (Future/Mock):
   - `Role`: "admin"
   - `Access`: Full system.

## Session Data
```json
{
  "user": {
    "name": "Sumedh",
    "role": "student"
  }
}
```

## Security Invariants
- **No Cross-Student Access**: API endpoints must verify `session.user.name` matches the requested student data.
