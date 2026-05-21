// Temporary debug route — visit /api/instagram-collab-debug to diagnose incoming collab fetching
export default async function handler(req, res) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const IG_ID = process.env.META_INSTAGRAM_ID;
  if (!token || !IG_ID) return res.status(500).json({ error: 'Missing env vars' });

  const base        = `https://graph.facebook.com/v21.0`;
  const JOSH_FB_ID  = '379215606172427';
  const out         = { IG_ID, JOSH_FB_ID, steps: {} };

  // Step 1: Look up the Instagram Business account connected to Josh's Facebook Page
  try {
    const r = await fetch(
      `${base}/${JOSH_FB_ID}?fields=name,instagram_business_account&access_token=${token}`
    );
    out.steps.fbPageLookup = await r.json();
  } catch (e) {
    out.steps.fbPageLookup = { fetchError: e.message };
  }

  const joshIgId = out.steps.fbPageLookup?.instagram_business_account?.id;
  out.joshIgId = joshIgId || null;

  if (!joshIgId) {
    return res.json({
      ...out,
      note: 'No Instagram Business account found on that Facebook Page. Either the FB ID is a personal profile (not a Page), or Josh\'s Instagram is not connected to this Page.',
    });
  }

  // Step 2: Fetch Josh's recent media WITH collaborators field
  try {
    const r = await fetch(
      `${base}/${joshIgId}/media?fields=id,caption,media_type,permalink,timestamp,collaborators&limit=20&access_token=${token}`
    );
    out.steps.joshMedia = await r.json();
  } catch (e) {
    out.steps.joshMedia = { fetchError: e.message };
  }

  // Step 3: Check which posts have Lakepointe as collaborator
  const posts = out.steps.joshMedia?.data || [];
  out.steps.collabMatches = posts.map(m => ({
    id:                    m.id,
    media_type:            m.media_type,
    timestamp:             m.timestamp,
    collaborators:         m.collaborators,
    lpconnectIsCollab:     (m.collaborators?.data || []).some(c => c.id === IG_ID),
  }));

  const matches = out.steps.collabMatches.filter(m => m.lpconnectIsCollab);
  out.matchCount = matches.length;

  // Step 4: Try fetching insights on matched posts using LP's token
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
