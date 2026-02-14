# Calculation Engine SOP

## Overview
The Calculation Engine transforms raw student marks into performance metrics (percentages, ranks, aggregates). It runs on-demand when data is fetched or synced.

## Core Metrics

### 1. Percentage
$$ \text{Percentage} = \left( \frac{\text{Marks}}{\text{Total Marks}} \right) \times 100 $$
- Round to 1 decimal place (e.g., 85.5%).
- If Marks is `null` (Absent), Percentage is `null`.

### 2. Ranks
- **Ranking Logic**: Sort students by Marks descending.
- **Tie-Breaking**: "Standard Competition Ranking" (1224).
  - If Student A = 90 (Rank 1)
  - Student B = 90 (Rank 1)
  - Student C = 80 (Rank 3)
- **Absent Handling**: Students with `null` marks are **Excluded** from ranking (assigned `null` rank).

### 3. Class Aggregates
- **Class Average**: Mean of all **Present** students' marks.
  $$ \text{Average} = \frac{\sum \text{Marks of Present Students}}{\text{Count of Present Students}} $$
  - Round to 1 decimal place.
  - Exclude Absentees from denomination.
- **Topper Marks**: Maximum mark achieved in the batch for that topic.
  - If multiple students tie for top, use that score.

## Data Structures
The Engine accepts `TopicData` with raw marks and returns enriched `TopicData` (or separate view model) containing `rank`, `percentage`, `classAverage`, `topperMarks`.
