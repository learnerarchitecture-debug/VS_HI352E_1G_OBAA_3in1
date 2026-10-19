import re
with open('C:/Users/techn/OneDrive/Documents/Default Project/obaa-launcher/java/com/obaa/system/UpdateManager.java', 'r') as f:
    content = f.read()
content = content.replace('\\\\"', '"')
with open('C:/Users/techn/OneDrive/Documents/Default Project/obaa-launcher/java/com/obaa/system/UpdateManager.java', 'w') as f:
    f.write(content)
print('Fixed UpdateManager.java')