const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'Data');
const LOGIN_FILE = path.join(DATA_DIR, 'LoginData.xlsx');

const romanToNum = {
    'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12',
    'viii': '8', 'ix': '9', 'x': '10', 'xi': '11', 'xii': '12',
};

// 1. Rename Folders
const folders = fs.readdirSync(DATA_DIR);
for (const folder of folders) {
    if (folder.startsWith('Class_')) {
        let suffix = folder.replace('Class_', '');
        if (romanToNum[suffix]) {
            const newFolderName = 'Class_' + romanToNum[suffix];
            console.log(`Renaming ${folder} -> ${newFolderName}`);
            fs.renameSync(path.join(DATA_DIR, folder), path.join(DATA_DIR, newFolderName));
        }
    }
}

// 2. Update LoginData.xlsx
if (fs.existsSync(LOGIN_FILE)) {
    const wb = XLSX.readFile(LOGIN_FILE);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    let updated = false;
    for (const row of data) {
        // Update class column
        if (row.class) {
            const clsString = String(row.class);
            if (romanToNum[clsString]) {
                row.class = romanToNum[clsString];
                updated = true;
                console.log(`Updated class ${clsString} to ${row.class}`);
            }
        }

        // Update Roll No column
        const rollKey = 'Roll No'; // check case
        let rollVal = row[rollKey] || row['RollNo'] || row['rollNo'];
        if (rollVal && typeof rollVal === 'string') {
            let replaced = false;
            for (const [roman, num] of Object.entries(romanToNum)) {
                if (rollVal.startsWith(roman)) {
                    rollVal = rollVal.replace(roman, num);
                    replaced = true;
                    // Only match one prefix
                    break;
                }
            }
            if (replaced) {
                if (row[rollKey] !== undefined) row[rollKey] = rollVal;
                else if (row['RollNo'] !== undefined) row['RollNo'] = rollVal;
                else row['rollNo'] = rollVal;
                updated = true;
                console.log(`Updated Roll No to ${rollVal}`);
            }
        }
    }

    if (updated) {
        const newSheet = XLSX.utils.json_to_sheet(data);
        wb.Sheets[sheetName] = newSheet;
        XLSX.writeFile(wb, LOGIN_FILE);
        console.log('LoginData.xlsx updated successfully.');
    } else {
        console.log('No changes needed in LoginData.xlsx.');
    }
}
