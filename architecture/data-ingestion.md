# Data Ingestion SOP

## Overview
The system ingests data from local Excel files mimicking a potential Google Drive structure. The "Source of Truth" is the `Data/` directory.

## File Structure
- **Root**: `Data/`
- **Class Folder**: `{ClassName}/` (e.g., `Class_XI`)
- **Subject File**: `{SubjectName}.xlsx` (e.g., `Maths.xlsx`)
- **Tabs**: Each tab represents a specific **Topic**.

## Schema Validation
Before processing, every sheet must be validated against the following rules:

### Row 1 (Header 1)
- **Cell A1**: Must be strictly `"Date"`.
- **Cell B1**: Contains the date value (datetime).
- **Cell C1**: Must be strictly `"Total Marks"`.
- **Cell D1**: Contains the integer value of total marks.

### Row 2 (Header 2)
- **Cell A2**: Must be strictly `"Name"`.
- **Cell B2**: Must be strictly `"Marks"`.
- **Cell C2**: `"Comments"` (Optional).

### Row 3+ (Data)
- **Column A**: Student Name (string). identifier.
- **Column B**: Marks.
  - Integer/Float: valid score.
  - `"AB"`, `"ABS"`, or Empty: **Absent** (value = `null`).
- **Column C**: Comments (string). Nullable.

## Error Handling
- **Missing File**: Log error, skip subject.
- **Corrupt Header**: Log specific error (e.g., "Sheet 'Circles' in 'Maths.xlsx' missing Date in A1"). Skip sheet.
- **Invalid Data Row**: If name is missing, skip row. If marks are invalid (non-numeric and not AB), treat as null/0 or log warning? -> **Treat as null**.

## Output Data Shape
The parser transforms Excel data into the `SubjectData` JSON object defined in `gemini.md`.
