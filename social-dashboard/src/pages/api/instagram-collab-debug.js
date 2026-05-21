// Temporary debug route — visit /api/instagram-collab-debug to diagnose incoming collab fetching
export default async function handler(req, res) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const IG_ID = process.env.META_INSTAGRAM_ID;
  if (!token || !IG_ID) return res.status(500).json({ error: 'Missing env vars' });

  const base = `https://graph.facebook.com/v21.0`;
  const out  = { IG_ID, steps: {} };

  // Fetch Lakepointe's own media WITH the collaborators field.
  // Collab posts accepted by Lakepointe appear on their own profile grid,
  // so they should already be in /media — we just need to surface the collaborators field.
  try {
    const r = await fetch(
      `${base}/${IG_ID}/media?fields=id,caption,media_type,permalink,timestamp,collaborators&limit=50&access_token=${token}`
    );
    const data = await r.json();
    out.steps.lpMedia = {
      error: data.error || null,
      totalCount: data.data?.length || 0,
      postsWithCollaborators: (data.data || [])
        .filter(m => m.collaborators?.data?.length > 0)
        .map(m => ({
          id:            m.id,
          media_type:    m.media_type,
          timestamp:     m.timestamp,
          permalink:     m.permalink,
          collaborators: m.collaborators?.data,
          captionSnippet: (m.caption || '').slice(0, 100),
        })),
      // Also show a sample of posts with NO collaborators field to confirm field is being returned
      sampleNoCollab: (data.data || [])
        .filter(m => !m.collaborators?.data?.length)
        .slice(0, 3)
        .map(m => ({ id: m.id, media_type: m.media_type, collaborators: m.collaborators })),
    };
  } catch (e) {
    out.steps.lpMedia = { fetchError: e.message };
  }

  return res.json(out);
}
