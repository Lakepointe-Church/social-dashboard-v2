// Temporary debug route — visit /api/instagram-collab-debug to diagnose incoming collab fetching
export default async function handler(req, res) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const IG_ID = process.env.META_INSTAGRAM_ID;
  if (!token || !IG_ID) return res.status(500).json({ error: 'Missing env vars' });

  const base = `https://graph.facebook.com/v21.0`;
  const out  = { IG_ID, steps: {} };

  // Step 1: Business Discovery lookup for joshhowerton
  try {
    const r = await fetch(
      `${base}/${IG_ID}?fields=business_discovery.fields(id,username,name)&username=joshhowerton&access_token=${token}`
    );
    out.steps.businessDiscovery = await r.json();
  } catch (e) {
    out.steps.businessDiscovery = { fetchError: e.message };
  }

  const joshId = out.steps.businessDiscovery?.business_discovery?.id;

  if (!joshId) {
    return res.json({ ...out, note: 'Business Discovery failed — cannot proceed to media fetch' });
  }

  out.joshId = joshId;

  // Step 2: Fetch Josh's recent media WITH collaborators field
  try {
    const r = await fetch(
      `${base}/${joshId}/media?fields=id,caption,media_type,permalink,timestamp,collaborators&limit=10&access_token=${token}`
    );
    out.steps.joshMedia = await r.json();
  } catch (e) {
    out.steps.joshMedia = { fetchError: e.message };
  }

  // Step 3: Check which posts have Lakepointe as collaborator
  const posts = out.steps.joshMedia?.data || [];
  out.steps.collabMatches = posts
    .map(m => ({
      id:          m.id,
      media_type:  m.media_type,
      timestamp:   m.timestamp,
      collaborators: m.collaborators,
      lpconnectIsCollaborator: (m.collaborators?.data || []).some(c => c.id === IG_ID),
    }));

  // Step 4: For any matches, try fetching insights with Lakepointe's token
  const matches = out.steps.collabMatches.filter(m => m.lpconnectIsCollaborator);
  out.steps.insightAttempts = {};
  for (const m of matches.slice(0, 3)) {
    try {
      const r = await fetch(
        `${base}/${m.id}/insights?metric=views,reach,saved,total_interactions,shares&access_token=${token}`
      );
      out.steps.insightAttempts[m.id] = await r.json();
    } catch (e) {
      out.steps.insightAttempts[m.id] = { fetchError: e.message };
    }
  }

  return res.json(out);
}
