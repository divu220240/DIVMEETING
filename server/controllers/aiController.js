const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const emptyInsights = () => ({
  summary: '',
  agenda: [],
  keyTopics: [],
  decisions: [],
  actionItems: [],
  risks: [],
  followUps: [],
  questions: [],
  nextBestActions: [],
  highlights: [],
  sentiment: 'Neutral',
  confidence: 'Medium',
  meetingHealth: {
    status: 'Focused',
    score: 75,
    rationale: 'Enough signal was found to produce a basic meeting brief.',
  },
});

const pickImportantLines = (lines, patterns, limit = 4) => (
  lines
    .filter((line) => patterns.some((pattern) => pattern.test(line)))
    .slice(0, limit)
);

const uniqueCompact = (items, limit = 6) => {
  const seen = new Set();

  return items
    .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
};

const stripSpeaker = (line) => line.replace(/^[^:]{1,40}:\s*/, '').trim();

const extractTopicCandidates = (lines) => {
  const stopWords = new Set([
    'about', 'after', 'again', 'also', 'because', 'before', 'being', 'could', 'from', 'have',
    'into', 'meeting', 'need', 'next', 'notes', 'please', 'should', 'that', 'their', 'there',
    'this', 'today', 'with', 'would',
  ]);

  const counts = new Map();
  lines.forEach((line) => {
    stripSpeaker(line)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 6);
};

const inferMeetingHealth = ({ risks, decisions, actionItems, questions, allLines }) => {
  const signalCount = decisions.length + actionItems.length + questions.length;
  const riskPenalty = Math.min(risks.length * 12, 35);
  const signalBoost = Math.min(signalCount * 7, 30);
  const contentBoost = Math.min(Math.floor(allLines.length / 4) * 5, 20);
  const score = Math.max(25, Math.min(95, 55 + signalBoost + contentBoost - riskPenalty));

  if (score >= 80) {
    return {
      status: 'Strong alignment',
      score,
      rationale: 'The meeting has clear signals around decisions, owners, or next steps.',
    };
  }

  if (score >= 60) {
    return {
      status: risks.length ? 'Watch risks' : 'Focused',
      score,
      rationale: risks.length
        ? 'Useful progress was captured, with a few risks that need attention.'
        : 'The discussion has enough context for a useful working brief.',
    };
  }

  return {
    status: 'Needs structure',
    score,
    rationale: 'More explicit decisions, owners, and follow-ups would make this meeting easier to act on.',
  };
};

const buildLocalInsights = ({ notes = {}, messages = [] }) => {
  const noteLines = String(notes.content || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const chatLines = messages
    .map((message) => `${message.sender?.name || 'Participant'}: ${message.message || ''}`.trim())
    .filter((line) => line.length > 2);
  const allLines = [...noteLines, ...chatLines];
  const joined = allLines.join(' ');
  const explicitActionItems = Array.isArray(notes.actionItems)
    ? notes.actionItems.map((item) => item.text).filter(Boolean)
    : [];

  const summary = joined
    ? joined.split(/[.!?]\s+/).filter(Boolean).slice(0, 3).join('. ').slice(0, 420)
    : 'Not enough meeting content yet. Add notes or chat messages, then generate insights again.';

  const agenda = pickImportantLines(allLines, [
    /\b(agenda|goal|objective|plan|topic|cover|discuss)\b/i,
  ], 5).map(stripSpeaker);
  const highlights = allLines.slice(-3).map(stripSpeaker);
  const decisions = pickImportantLines(allLines, [
    /\b(decided|decision|approved|agreed|resolved|confirmed)\b/i,
  ]).map(stripSpeaker);
  const risks = pickImportantLines(allLines, [
    /\b(risk|blocked|blocker|issue|problem|concern|delay|dependency)\b/i,
  ]).map(stripSpeaker);
  const followUps = pickImportantLines(allLines, [
    /\b(follow up|next|later|check|confirm|review|sync)\b/i,
  ]).map(stripSpeaker);
  const questions = pickImportantLines(allLines, [
    /\?/,
    /\b(who|what|when|where|why|how|can we|should we|do we)\b/i,
  ], 6).map(stripSpeaker);
  const actionItems = uniqueCompact([
    ...explicitActionItems,
    ...pickImportantLines(allLines, [
      /\b(action|todo|to-do|owner|assign|send|ship|prepare|update|create|fix)\b/i,
    ], 8).map(stripSpeaker),
  ], 8);
  const nextBestActions = uniqueCompact([
    ...actionItems,
    ...followUps,
    risks.length ? `Resolve: ${stripSpeaker(risks[0])}` : '',
  ], 5);
  const keyTopics = extractTopicCandidates(allLines);
  const meetingHealth = inferMeetingHealth({ risks, decisions, actionItems, questions, allLines });

  return {
    ...emptyInsights(),
    summary,
    agenda: uniqueCompact(agenda, 5),
    keyTopics,
    decisions,
    actionItems,
    risks,
    followUps,
    questions: uniqueCompact(questions, 6),
    nextBestActions,
    highlights: uniqueCompact(highlights, 4),
    sentiment: risks.length ? 'Needs attention' : 'Focused',
    confidence: allLines.length > 8 ? 'High' : allLines.length > 3 ? 'Medium' : 'Low',
    meetingHealth,
  };
};

const extractResponseText = (data) => {
  if (data.output_text) return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n');
};

const normalizeInsights = (value) => ({
  ...emptyInsights(),
  ...value,
  agenda: Array.isArray(value?.agenda) ? value.agenda : [],
  keyTopics: Array.isArray(value?.keyTopics) ? value.keyTopics : [],
  decisions: Array.isArray(value?.decisions) ? value.decisions : [],
  actionItems: Array.isArray(value?.actionItems) ? value.actionItems : [],
  risks: Array.isArray(value?.risks) ? value.risks : [],
  followUps: Array.isArray(value?.followUps) ? value.followUps : [],
  questions: Array.isArray(value?.questions) ? value.questions : [],
  nextBestActions: Array.isArray(value?.nextBestActions) ? value.nextBestActions : [],
  highlights: Array.isArray(value?.highlights) ? value.highlights : [],
  meetingHealth: {
    ...emptyInsights().meetingHealth,
    ...(typeof value?.meetingHealth === 'object' && value.meetingHealth ? value.meetingHealth : {}),
  },
});

const parseInsightsJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not include valid JSON');
    return JSON.parse(match[0]);
  }
};

const buildMeetingContextText = ({ title, notes = {}, messages = [] }) => {
  const noteText = String(notes.content || '').trim();
  const actionItems = Array.isArray(notes.actionItems)
    ? notes.actionItems
      .map((item) => `- ${item.text}${item.done ? ' (done)' : ''}`)
      .join('\n')
    : '';
  const chatText = messages
    .slice(-60)
    .map((message) => `${message.sender?.name || 'Participant'}: ${message.message || ''}`)
    .join('\n');

  return [
    `Meeting title: ${title || 'Untitled meeting'}`,
    noteText ? `Shared notes:\n${noteText}` : '',
    actionItems ? `Action items:\n${actionItems}` : '',
    chatText ? `Recent chat:\n${chatText}` : '',
  ].filter(Boolean).join('\n\n');
};

const buildAssistantHistoryText = (assistantMessages = []) => (
  assistantMessages
    .slice(-8)
    .map((message) => {
      const role = message.role === 'assistant' ? 'Assistant' : message.role === 'user' ? 'User' : '';
      const content = String(message.content || '').trim();
      return role && content ? `${role}: ${content}` : '';
    })
    .filter(Boolean)
    .join('\n')
);

const hasHostedAiProvider = () => Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

const generateGeminiText = async ({ system, prompt, maxOutputTokens = 900 }) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || 'Gemini request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
};

const generateOpenAIText = async ({ system, prompt, maxOutputTokens = 900 }) => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_output_tokens: maxOutputTokens,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || 'AI request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return extractResponseText(data).trim();
};

const localAssistantReply = ({ prompt, notes = {}, messages = [] }) => {
  const insights = buildLocalInsights({ notes, messages });
  const lowerPrompt = String(prompt || '').toLowerCase();
  const contextLines = [
    ...String(notes.content || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean),
    ...(Array.isArray(notes.actionItems)
      ? notes.actionItems.map((item) => `${item.done ? 'Done' : 'Open'} action: ${item.text || ''}`.trim())
      : []),
    ...messages
      .map((message) => `${message.sender?.name || 'Participant'}: ${message.message || ''}`.trim())
      .filter((line) => line.length > 2),
  ];
  const promptTerms = uniqueCompact(
    lowerPrompt
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && ![
        'about', 'answer', 'assistant', 'from', 'have', 'meeting', 'please', 'tell',
        'that', 'this', 'what', 'when', 'where', 'which', 'with',
      ].includes(word)),
    12
  );
  const relevantLines = contextLines
    .map((line) => ({
      line: stripSpeaker(line),
      score: promptTerms.reduce((total, term) => (
        line.toLowerCase().includes(term) ? total + 1 : total
      ), 0),
    }))
    .filter((item) => item.score > 0 && item.line)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.line);

  if (lowerPrompt.includes('action') || lowerPrompt.includes('todo') || lowerPrompt.includes('next')) {
    const actions = insights.nextBestActions.length ? insights.nextBestActions : insights.actionItems;
    return actions.length
      ? `Here are the strongest next actions:\n${actions.map((item) => `- ${item}`).join('\n')}`
      : 'I do not see clear next actions yet. Add owners, deadlines, or action items in notes and I can tighten this up.';
  }

  if (lowerPrompt.includes('risk') || lowerPrompt.includes('block')) {
    return insights.risks.length
      ? `Risks or blockers I found:\n${insights.risks.map((item) => `- ${item}`).join('\n')}`
      : 'I do not see explicit risks in the current notes or chat.';
  }

  if (lowerPrompt.includes('question')) {
    return insights.questions.length
      ? `Open questions:\n${insights.questions.map((item) => `- ${item}`).join('\n')}`
      : 'No open questions were obvious from the current meeting context.';
  }

  if (lowerPrompt.includes('summary') || lowerPrompt.includes('summarize') || lowerPrompt.includes('recap')) {
    return [
      insights.summary,
      insights.highlights.length ? `\nHighlights:\n${insights.highlights.map((item) => `- ${item}`).join('\n')}` : '',
      insights.nextBestActions.length ? `\nNext best actions:\n${insights.nextBestActions.map((item) => `- ${item}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
  }

  if (relevantLines.length) {
    return [
      'Based on the meeting context, this is the most relevant information I found:',
      uniqueCompact(relevantLines, 5).map((item) => `- ${item}`).join('\n'),
      insights.nextBestActions.length ? `\nPossible next step: ${insights.nextBestActions[0]}` : '',
    ].filter(Boolean).join('\n');
  }

  if (!contextLines.length) {
    return hasHostedAiProvider()
      ? 'I can answer general questions with the configured AI provider, but I do not have meeting notes or chat context yet for meeting-specific questions.'
      : 'General AI answers need a Gemini or OpenAI API key on the server. Right now I can only answer from meeting notes and chat, and there is no meeting context yet.';
  }

  return [
    'I do not see direct evidence for that exact question in the current meeting context.',
    `Here is the closest useful context:\n${insights.summary}`,
    insights.questions.length ? `\nOpen questions:\n${insights.questions.map((item) => `- ${item}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
};

exports.generateMeetingInsights = async (req, res, next) => {
  try {
    const context = {
      title: req.body.title || 'Untitled meeting',
      roomId: req.body.roomId || '',
      briefType: req.body.briefType || 'full',
      notes: req.body.notes || {},
      messages: Array.isArray(req.body.messages) ? req.body.messages.slice(-80) : [],
    };

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return res.json({
        provider: 'local',
        model: 'local-meeting-analyzer',
        insights: buildLocalInsights(context),
      });
    }

    if (process.env.GEMINI_API_KEY) {
      const system = [
        'You are an expert meeting copilot for live video meetings.',
        'Return only compact JSON with keys: summary, agenda, keyTopics, highlights, decisions, actionItems, risks, followUps, questions, nextBestActions, sentiment, confidence, meetingHealth.',
        'meetingHealth must be an object with status, score, and rationale. Score is 0-100.',
        'Arrays should contain concise, specific strings. If a field has no evidence, return an empty array.',
        'Adapt depth to briefType: executive is concise, action emphasizes owners and next steps, risk emphasizes blockers, full is balanced.',
      ].join(' ');
      const text = await generateGeminiText({
        system,
        prompt: JSON.stringify(context),
        maxOutputTokens: 900,
      });
      const parsed = parseInsightsJson(text);

      return res.json({
        provider: 'gemini',
        model: GEMINI_MODEL,
        insights: normalizeInsights(parsed),
      });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        input: [
          {
            role: 'system',
            content: [
              'You are an expert meeting copilot for live video meetings.',
              'Return only compact JSON with keys: summary, agenda, keyTopics, highlights, decisions, actionItems, risks, followUps, questions, nextBestActions, sentiment, confidence, meetingHealth.',
              'meetingHealth must be an object with status, score, and rationale. Score is 0-100.',
              'Arrays should contain concise, specific strings. If a field has no evidence, return an empty array.',
              'Adapt depth to briefType: executive is concise, action emphasizes owners and next steps, risk emphasizes blockers, full is balanced.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify(context),
          },
        ],
        max_output_tokens: 900,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        message: data.error?.message || 'AI insights request failed',
      });
    }

    const text = extractResponseText(data);
    const parsed = parseInsightsJson(text);

    res.json({
      provider: 'openai',
      model: DEFAULT_MODEL,
      insights: normalizeInsights(parsed),
    });
  } catch (error) {
    next(error);
  }
};

exports.chatWithMeetingAssistant = async (req, res, next) => {
  try {
    const context = {
      title: req.body.title || 'Untitled meeting',
      roomId: req.body.roomId || '',
      notes: req.body.notes || {},
      messages: Array.isArray(req.body.messages) ? req.body.messages.slice(-80) : [],
      assistantMessages: Array.isArray(req.body.assistantMessages) ? req.body.assistantMessages.slice(-12) : [],
    };
    const prompt = String(req.body.prompt || '').trim();

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const system = [
      'You are a Google-like AI assistant inside a video meeting app.',
      'Answer any reasonable user prompt directly, clearly, and accurately.',
      'Use meeting notes and chat as priority context only when the user asks about this meeting, its decisions, risks, notes, participants, or follow-ups.',
      'For general questions that are not about the meeting, answer from your general knowledge and do not force the response back to meeting context.',
      'Do not invent meeting facts, owners, dates, or decisions. If a meeting-specific answer is not supported by the provided context, say what is missing.',
      'If the user asks for live news, current prices, search results, or anything that requires real-time web lookup, say you do not have live web search in this app unless that data is provided.',
      'Keep answers useful and concise, with bullets or steps when they improve readability.',
    ].join(' ');
    const meetingContext = buildMeetingContextText(context);
    const assistantHistory = buildAssistantHistoryText(context.assistantMessages);
    const fullPrompt = [
      meetingContext ? `Meeting context:\n${meetingContext}` : 'Meeting context is sparse.',
      assistantHistory ? `Recent assistant conversation:\n${assistantHistory}` : '',
      `User question:\n${prompt}`,
    ].filter(Boolean).join('\n\n');

    if (process.env.GEMINI_API_KEY) {
      const answer = await generateGeminiText({
        system,
        prompt: fullPrompt,
        maxOutputTokens: 700,
      });

      return res.json({
        provider: 'gemini',
        model: GEMINI_MODEL,
        answer,
      });
    }

    if (process.env.OPENAI_API_KEY) {
      const answer = await generateOpenAIText({
        system,
        prompt: fullPrompt,
        maxOutputTokens: 700,
      });

      return res.json({
        provider: 'openai',
        model: DEFAULT_MODEL,
        answer,
      });
    }

    return res.json({
      provider: 'local',
      model: 'local-meeting-assistant',
      answer: localAssistantReply({ prompt, notes: context.notes, messages: context.messages }),
    });
  } catch (error) {
    next(error);
  }
};
