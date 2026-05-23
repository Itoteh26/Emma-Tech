export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { skill } = req.body;

  if (!skill || typeof skill !== 'string') {
    return res.status(400).json({ error: 'Skill is required' });
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    console.error('API key not configured');
    return res.status(500).json({ error: 'API not configured' });
  }

  try {
    const prompt = `You are an expert educational curriculum designer. Create a learning roadmap for: "${skill}"

Generate ONLY valid JSON (no markdown, no explanations):
{
  "modules": [
    {
      "title": "string",
      "lessons": number,
      "estimatedHours": number
    }
  ],
  "totalHours": number,
  "difficulty": "Beginner|Intermediate|Advanced"
}

Create 4-5 modules progressing from fundamentals to advanced.`;

    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HF API Error:', error);
      
      // Return fallback
      return res.status(200).json({
        modules: [
          { title: `${skill} Fundamentals`, lessons: 8, estimatedHours: 12 },
          { title: 'Core Concepts', lessons: 10, estimatedHours: 15 },
          { title: 'Hands-On Projects', lessons: 6, estimatedHours: 20 },
          { title: 'Advanced Topics', lessons: 7, estimatedHours: 18 }
        ],
        totalHours: 65,
        difficulty: 'Intermediate',
        isFallback: true
      });
    }

    const data = await response.json();
    let text = data[0]?.generated_text || '';

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json(parsed);
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }

    // Return fallback if parsing fails
    return res.status(200).json({
      modules: [
        { title: `${skill} Fundamentals`, lessons: 8, estimatedHours: 12 },
        { title: 'Core Concepts', lessons: 10, estimatedHours: 15 },
        { title: 'Hands-On Projects', lessons: 6, estimatedHours: 20 },
        { title: 'Advanced Topics', lessons: 7, estimatedHours: 18 }
      ],
      totalHours: 65,
      difficulty: 'Intermediate',
      isFallback: true
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Return fallback on any error
    return res.status(200).json({
      modules: [
        { title: `${skill} Fundamentals`, lessons: 8, estimatedHours: 12 },
        { title: 'Core Concepts', lessons: 10, estimatedHours: 15 },
        { title: 'Hands-On Projects', lessons: 6, estimatedHours: 20 },
        { title: 'Advanced Topics', lessons: 7, estimatedHours: 18 }
      ],
      totalHours: 65,
      difficulty: 'Intermediate',
      isFallback: true,
      error: error.message
    });
  }
}
