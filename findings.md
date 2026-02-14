# 🔍 Findings — SRSMA Dashboard

## Workspace Discovery (2026-02-14)

### File Structure
```
SRSMADashBoard/
├── branding/
│   └── SRSMALogo.jpeg    (Lord Ram with bow, blue/gold/orange theme)
├── Data/
│   ├── LoginData.xlsx     (15 users, all password "12345")
│   └── Class_XI/
│       ├── Maths.xlsx     (5 tabs: Circles, Parabola, Ellipse, Hyperbola, GrandTest)
│       └── Physics.xlsx   (5 tabs: ElectroStatics1-3, GrandTest, Current Electricity)
```

### Excel Schema Confirmed
- **Row 1**: `Date | {date} | Total Marks | {number}`
- **Row 2**: `Name | Marks | Comments` (column headers)
- **Row 3+**: Student data (~15 students per tab)
- **AB/ABS handling**: Physics has `"AB"` or `"ABS"` values = absent students
- **Comments**: Optional, some tabs have all nulls (Physics)

### Brand Colors (from logo)
- Deep Navy Blue: `#1a365d`
- Gold/Saffron: `#d4942a`
- Orange accent: `#e8913a`
- White background

### Tech Stack Research
- **Next.js 14** recommended for SSR + API routes + deployability
- **Recharts** best balance of simplicity + aesthetics for line charts
- **SheetJS (xlsx)** industry standard for Excel parsing
- **NextAuth.js** for credential-based auth with bcrypt hashing
