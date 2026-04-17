import urllib.request
req = urllib.request.Request('https://groove-journal.vercel.app/api/memories')
req.add_header('x-user-id', 'spotify')
try:
    with urllib.request.urlopen(req) as resp:
        print(resp.read().decode('utf-8'))
except Exception as e:
    print(e.read().decode('utf-8') if hasattr(e, 'read') else str(e))
