with open('C:/Users/techn/OneDrive/Documents/Default Project/obaa-launcher/java/com/obaa/system/UpdateManager.java', 'rb') as f:
    content = f.read()
content = content.replace(b'\\"', b'"')
with open('C:/Users/techn/OneDrive/Documents/Default Project/obaa-launcher/java/com/obaa/system/UpdateManager.java', 'wb') as f:
    f.write(content)
print('Fixed')