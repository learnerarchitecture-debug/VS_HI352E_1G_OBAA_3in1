with open('C:/Users/techn/OneDrive/Documents/Default Project/obaa-launcher/java/com/obaa/system/UpdateManager.java', 'r') as f:
    lines = f.readlines()

# Remove lines 49-52 (indices 48-51) - orphan interface methods
del lines[48:52]

# Add checkForUpdates and installLocalPackage methods before the closing brace
for i, line in enumerate(lines):
    if line.strip() == '}' and i > 50:
        insert_idx = i
        break

insert_lines = [
    '    public void checkForUpdates() {\n',
    '        Log.i("ObaaUpdateManager", "checkForUpdates called");\n',
    '    }\n',
    '\n',
    '    public void installLocalPackage(String apkPath) {\n',
    '        Log.i("ObaaUpdateManager", "installLocalPackage: " + apkPath);\n',
    '    }\n',
    '\n'
]

for i, line in enumerate(insert_lines):
    lines.insert(insert_idx + i, line)

with open('C:/Users/techn/OneDrive/Documents/Default Project/obaa-launcher/java/com/obaa/system/UpdateManager.java', 'w') as f:
    f.writelines(lines)
print('Fixed')