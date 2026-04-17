fetch('https://groove-journal.vercel.app/api/memories', { headers: { 'x-user-id': 'spotify' } })
    .then(r => r.text())
    .then(t => console.log(t))
    .catch(e => console.error(e));
