import os
import json
import datetime
import openpyxl

# Configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Data')
TMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.tmp')
OUTPUT_FILE = os.path.join(TMP_DIR, 'debug_data.json')

def parse_header(ws):
    """
    Validates Row 1 and Row 2 headers.
    Returns True if valid, raises error otherwise.
    """
    # check Row 1: A1=Date, C1=Total Marks
    r1 = [c.value for c in ws[1]]
    if len(r1) < 4:
        raise ValueError("Row 1 must have at least 4 columns")
    
    if r1[0] != 'Date':
        raise ValueError(f"Cell A1 should be 'Date', found '{r1[0]}'")
    if r1[2] != 'Total Marks':
        raise ValueError(f"Cell C1 should be 'Total Marks', found '{r1[2]}'")
        
    # check Row 2: A2=Name, B2=Marks
    r2 = [c.value for c in ws[2]]
    if r2[0] != 'Name':
        raise ValueError(f"Cell A2 should be 'Name', found '{r2[0]}'")
    if r2[1] != 'Marks':
        raise ValueError(f"Cell B2 should be 'Marks', found '{r2[1]}'")
        
    return {
        'date': r1[1],
        'total_marks': r1[3]
    }

def parse_sheet(ws, sheet_name):
    try:
        meta = parse_header(ws)
    except Exception as e:
        print(f"  [WARN] Skipping sheet '{sheet_name}': {e}")
        return None

    students = []
    # Iterate from row 3
    for row in ws.iter_rows(min_row=3, values_only=True):
        if not row or not row[0]: # Stop at empty row
            continue
            
        name = row[0]
        raw_marks = row[1]
        comments = row[2] if len(row) > 2 else None
        
        # Handle AB/ABS
        marks = None
        if raw_marks in ['AB', 'ABS', 'ab', 'abs']:
            marks = None
        elif isinstance(raw_marks, (int, float)):
            marks = float(raw_marks)
        else:
            # Try to convert string to number, otherwise None
            try:
                marks = float(raw_marks)
            except:
                marks = None
        
        students.append({
            'name': name,
            'marks': marks,
            'comments': comments
        })
        
    return {
        'topicName': sheet_name,
        'date': meta['date'].isoformat() if isinstance(meta['date'], datetime.date) else str(meta['date']),
        'totalMarks': meta['total_marks'],
        'students': students
    }

def main():
    if not os.path.exists(TMP_DIR):
        os.makedirs(TMP_DIR)
        
    print(f"Scanning Data Directory: {DATA_DIR}")
    
    all_data = {}
    
    # Traverse Data directory
    for root, dirs, files in os.walk(DATA_DIR):
        for file in files:
            if file.endswith('.xlsx') and not file.startswith('LoginData') and not file.startswith('~$'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(root, DATA_DIR)
                subject_name = os.path.splitext(file)[0]
                
                # Assume folder structure Data/{ClassName}/{Subject}.xlsx
                # rel_path is likely {ClassName}
                class_name = rel_path
                
                print(f"Processing: {class_name} / {subject_name}")
                
                try:
                    wb = openpyxl.load_workbook(full_path, data_only=True)
                    subject_data = {
                        'subjectName': subject_name,
                        'className': class_name,
                        'topics': []
                    }
                    
                    for sheet_name in wb.sheetnames:
                        topic = parse_sheet(wb[sheet_name], sheet_name)
                        if topic:
                            subject_data['topics'].append(topic)
                            
                    # Store in structure
                    if class_name not in all_data:
                        all_data[class_name] = {}
                    all_data[class_name][subject_name] = subject_data
                    
                except Exception as e:
                    print(f"  [ERROR] Failed to read {file}: {e}")

    # Output results
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(all_data, f, indent=2)
        
    print(f"Done. Parsed data saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
