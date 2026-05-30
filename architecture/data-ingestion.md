# Data Ingestion SOP

## Overview
The primary "Source of Truth" is the PostgreSQL database. All performance logs, classes, subjects, and topics are read and written directly to the database. Local file system reads (`Data/` directory) are deprecated.

To ingest new performance data, teachers upload Excel files via the "Upload Marks" tab. The system parses these uploads, validates their schemas, and saves the data directly to the database.

## Excel Import Validation Rules
When an Excel file is uploaded for a specific Class and Subject, the first sheet is parsed and validated against the following structure:

### Row 1 (Header Metadata)
- **Cell A1**: Must be strictly `"Date"`.
- **Cell B1**: Contains the test date value.
- **Cell C1**: Must be strictly `"Total Marks"`.
- **Cell D1**: Contains the numeric value of total marks for the test.

### Row 2 (Column Headers)
- **Cell A2**: Must be strictly `"Name"`.
- **Cell B2**: Must be strictly `"Marks"`.
- **Cell C2**: `"Comments"` (Optional).

### Row 3+ (Student Performance Records)
- **Column A**: Student name (string, matches user record).
- **Column B**: Numeric marks or `"AB"`/`"ABS"` to represent an Absent student.
- **Column C**: Remarks/Comments (string, optional).

## Data Processing Rules
1. **Absent Mapping**: Any mark of `"AB"` or `"ABS"` (case-insensitive) is converted to `null` in the database.
2. **Virtual Subject "Combined"**: The virtual subject `"Combined"` (previously named `"Total"`) is dynamically calculated from other subjects in the class. Uploading/modifying data directly for `"Combined"` is forbidden.
3. **Database Write**: Parsed records are upserted into the database. If a student's record for a topic already exists, it is overwritten with the new upload.

## Error Handling
- **Invalid Header Schema**: If Row 1 or Row 2 fails validation, the parser rejects the upload, reporting the specific cell mismatch.
- **Invalid Marks**: If marks are non-numeric and not `"AB"`, the row is treated as absent (`null`) or rejected with a validation toast on the client side.
