# Authentication & Authorization SOP

## Overview
Authentication is credential-based, querying the Neon PostgreSQL `users` table directly. The system supports three roles: Students (represented as Parents/Students), Teachers (regular teachers), and Admin (`srsma` account).

## Identity Source
- **Source**: PostgreSQL Database (`users` table).
- **Credentials**: Username and password (with bcrypt hashing if configured, or plain text comparison as supported by the schema).
- **Session Management**: Standard NextAuth.js JWT session containing `name`, `username` (roll number or login name), and `role`.

## Authorization Rules

1. **Student / Parent**:
   - `Role`: "student"
   - `Access`: Isolation enforced. Users can only view their own student performance records. The system blocks attempts to access batch, class, or other students' dashboards.

2. **Teacher**:
   - `Role`: "teacher" (where username !== 'srsma')
   - `Access`: Regular teachers can view only the classes assigned to them in the `teacher_mappings` table. Within those classes, they can view all subjects for comprehensive analysis but can only edit (create topics, update details, save marks, and bulk edit) subjects they are explicitly mapped to teach. Additionally, if a teacher is mapped to any subject in Class 11 or Class 12 (including Class 12+), they automatically have edit/upload access to the "Combined" subject for that class without needing an explicit mapping.

3. **Admin**:
   - `Username`: `srsma`
   - `Role`: "teacher" / "admin"
   - `Access`: Complete system control. Admin can manage all classes, subjects, student records, and teacher accounts, including adding/editing/deleting teachers and mapping their class/subject permissions under the "Manage Teachers" dashboard module.

## Session Data Schema
```json
{
  "user": {
    "name": "Ravi Kumar",
    "username": "2601",
    "role": "student"
  }
}
```

## Security Invariants
- **Database-Only Auth**: No credentials spreadsheet reading or fallbacks.
- **Cross-Student Access Prevention**: All data endpoints check that student queries match the authenticated session's user records.
- **Teacher Permission Verification**: All writing API actions (bulk edits, detail updates, Excel uploads) invoke `isTeacherMapped` to block unauthorized edits by regular teachers. For Class 11/12/12+ "Combined" subject, access is automatically granted if the teacher is mapped to any subject in that class.

