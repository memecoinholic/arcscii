function normalizeUsername(name){
  return String(name || '').trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15).toLowerCase();
}

async function saveScore(username, score){
  const key = normalizeUsername(username);
  const value = Math.max(0, Number(score) || 0);
  if(!key) return false;
  try{
    const res = await fetch('api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: key, score: value })
    });
    return res.ok;
  }catch(err){
    return false;
  }
}

async function fetchLeaderboard(){
  try{
    const res=await fetch('api/leaderboard');
    if(!res.ok) return [];
    const data=await res.json();
    return (data && data.ok===true && Array.isArray(data.rows)) ? data.rows : [];
  }catch(err){
    return [];
  }
}

window.arcVercelApi = { saveScore, fetchLeaderboard };
export { saveScore, fetchLeaderboard, normalizeUsername };