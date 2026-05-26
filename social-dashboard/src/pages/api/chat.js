// ─────────────────────────────────────────────────────────────────────────────
// /api/chat — AI Analyst endpoint
// Receives a user question, enriches with full analytics context, and returns
// a structured response with optional visualization data.
// ─────────────────────────────────────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk';
import { getDataContext } from '../../data/demoData';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `
You are a world-class social media analytics expert and strategic advisor for Lakepointe Church.
Your role is to analyze the church's social media data and deliver clear, actionable insights
that help leadership understand their digital reach and engagement.

You speak with authority but in plain English — no jargon. You understand the church context:
Sunday is the biggest content day, baptisms and community stories resonate deeply, and the
goal is to grow the Kingdom, not just follower counts.

ALWAYS respond with valid JSON in EXACTLY this format — no other text, no markdown:
{
  "message": "2-4 sentence clear insight. Be specific with numbers. Be actionable.",
  "highlights": ["Insight 1", "Insight 2", "Insight 3"],
  "visualization": {
    "type": "line" | "bar" | "pie" | "table" | null,
    "title": "Chart or table title",
    "description": "One sentence describing what this shows",
    "data": [...],
    "config": {}
  }
}

VISUALIZATION FORMATS:

Line chart config:
{
  "type": "line",
  "data": [{"date": "Jan 1", "Facebook": 46000, "YouTube": 82000}, ...],
  "config": {
    "xKey": "date",
    "series": [
      {"key": "Facebook",  "name": "Facebook",  "color": "#1877F2"},
      {"key": "Instagram", "name": "Instagram", "color": "#E1306C"},
      {"key": "YouTube",   "name": "YouTube",   "color": "#FF0000"},
      {"key": "TikTok",    "name": "TikTok",    "color": "#EE1D52"},
      {"key": "LinkedIn",  "name": "LinkedIn",  "color": "#0A66C2"}
    ]
  }
}

Bar chart config:
{
  "type": "bar",
  "data": [{"name": "Facebook", "value": 3.8}, ...],
  "config": {
    "xKey": "name",
    "bars": [{"key": "value", "name": "Metric Label", "color": "#3B82F6"}],
    "unit": "%"
  }
}

Pie chart config:
{
  "type": "pie",
  "data": [{"name": "YouTube", "value": 423891, "fill": "#FF0000"}, ...],
  "config": { "nameKey": "name", "valueKey": "value" }
}

Table config:
{
  "type": "table",
  "data": [{"Platform": "YouTube", "Followers": "89,234", "Growth": "+12.3%"}, ...],
  "config": { "columns": ["Platform", "Followers", "Growth"] }
}

Set visualization to null if a chart wouldn't add value to your answer.
When in doubt, include a visualization — executives love data visuals.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [], context } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    // Return a demo response so the UI works without a key configured
    return res.status(200).json({
      message: "⚠️ No ANTHROPIC_API_KEY found in your environment variables. Add your key to .env.local to enable the AI Analyst. In the meantime, here's a sample of what I can do: Your fastest-growing platform is TikTok at +34.2% in 90 days. YouTube is approaching 100K subscribers — you're about 10 days away at current growth.",
      highlights: [
        "TikTok is growing 4x faster than Facebook by percentage",
        "YouTube will hit 100K subscribers in ~10 days at current growth rate",
        "Easter content drove a 3x spike in engagement across all platforms"
      ],
      visualization: {
        type: "bar",
        title: "Engagement Rate by Platform",
        description: "TikTok leads all platforms with an 8.1% engagement rate",
        data: [
          { name: "TikTok",    value: 8.1,  fill: "#EE1D52" },
          { name: "Instagram", value: 5.2,  fill: "#E1306C" },
          { name: "YouTube",   value: 4.1,  fill: "#FF0000" },
          { name: "Facebook",  value: 3.8,  fill: "#1877F2" },
          { name: "LinkedIn",  value: 2.9,  fill: "#0A66C2" },
        ],
        config: { xKey: "name", bars: [{ key: "value", name: "Engagement Rate", color: "#6366F1" }], unit: "%" }
      }
    });
  }

  try {
    const dataContext = context || getDataContext();

    // Build message history for multi-turn
    const messages = [
      ...history.map(h => ({
        role:    h.role,
        content: h.content,
      })),
      {
        role:    'user',
        content: `Here is the current analytics data:\n\n${dataContext}\n\n---\n\nQuestion: ${message}`,
      },
    ];

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages,
    });

    const rawText = response.content[0]?.text || '{}';

    // Parse the JSON response — handle any wrapping markdown
    let parsed;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        message: rawText,
        highlights: [],
        visualization: null,
      };
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({
      error: 'Failed to get AI response',
      message: 'Sorry, something went wrong. Please try again.',
      highlights: [],
      visualization: null,
    });
  }
}
