import re

with open('C:/Users/techn/OneDrive/Documents/Default Project/.git/config', 'r') as f:
    content = f.read()

# Remove submodule section
lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if 'submodule "pbrforge"' in line:
        skip = True
        continue
    if skip and line.startswith('['):
        skip = False
    if not skip:
        new_lines.append(line)

with open('C:/Users/techn/OneDrive/Documents/Default Project/.git/config', 'w') as f:
    f.write('\n'.join(new_lines))

print('Removed submodule from config')