fetch('https://groove-journal.vercel.app/api/memories', { headers: { 'x-user-id': 'spotify' } }).then(r => r.text()).then(t => console.log("RESPONSE:", t)).catch(e => console.log("ERROR:", e))
