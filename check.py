import re
html = open('s:/Programming/Projects/vinyl/index.html').read()
ids = set(re.findall(r'id="([^"]+)"', html))
js = open('s:/Programming/Projects/vinyl/app.js').read()
js_ids = set(re.findall(r"\$\(['\"]([^'\"]+)['\"]\)", js))
print('Missing in HTML:', js_ids - ids)
