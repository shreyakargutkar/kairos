import { EDGE_FUNCTION_URL, authHeaders, type Profile, type Questions, type ChatMessage } from "./supabase";

const LOCAL_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const LOCAL_OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

async function postJson(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function callGeminiDirect(systemInstruction: string, prompt: string, jsonMode = false): Promise<any> {
  const models = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${LOCAL_GEMINI_KEY}`;
    
    const body: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    };

    if (jsonMode) {
      body.generationConfig = {
        responseMimeType: "application/json"
      };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Gemini error (${res.status})`);
      }
      return data;
    } catch (err) {
      console.warn(`Gemini model ${model} failed, trying next... Error:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

async function callOpenAiDirect(messages: any[], jsonMode = false): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${LOCAL_OPENAI_KEY}`,
  };

  const body: any = {
    model: "gpt-4o-mini",
    messages,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI error (${res.status})`);
  }

  return data;
}

export async function extractProfile(resume_text: string, job_description?: string): Promise<Profile> {
  if (LOCAL_GEMINI_KEY) {
    const systemPrompt = `You are an AI assistant specialized in parsing professional résumés. Your task is to extract information and return a structured JSON profile. Compare the resume to the job description if provided to identify gaps. You must respond with a JSON object matching this structure:
{
  "hard_skills": string[],
  "soft_skills": string[],
  "experience_years": number,
  "summary": "brief summary",
  "gaps": string[]
}`;
    const userPrompt = `Résumé text:\n${resume_text}\n\nJob Description (optional):\n${job_description || "Not provided"}`;
    const data = await callGeminiDirect(systemPrompt, userPrompt, true);
    const text = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(text);
    return parsed as Profile;
  }

  if (LOCAL_OPENAI_KEY) {
    const systemPrompt = `You are an AI assistant specialized in parsing professional résumés. Your task is to extract information and return a structured JSON profile. Compare the resume to the job description if provided to identify gaps. You must respond with a JSON object matching this structure:
{
  "hard_skills": string[],
  "soft_skills": string[],
  "experience_years": number,
  "summary": "brief summary",
  "gaps": string[]
}`;
    const userPrompt = `Résumé text:\n${resume_text}\n\nJob Description (optional):\n${job_description || "Not provided"}`;
    const data = await callOpenAiDirect([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], true);
    
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed as Profile;
  }

  const d = await postJson("/extract", { resume_text, job_description });
  return d.profile as Profile;
}

export async function generateQuestions(profile: Profile, job_description?: string): Promise<Questions> {
  if (LOCAL_GEMINI_KEY) {
    const systemPrompt = `You are an expert technical recruiter and hiring manager. Your task is to generate exactly 5 behavioral questions (based on the STAR methodology: Situation, Task, Action, Result) and exactly 5 technical/role-specific questions. Return a JSON object matching this structure:
{
  "behavioral": [
    { "question": string, "rationale": string, "target_skill": string }
  ],
  "technical": [
    { "question": string, "rationale": string, "target_skill": string }
  ]
}`;
    const userPrompt = `Candidate Profile:\n${JSON.stringify(profile)}\n\nJob Description (optional):\n${job_description || "Not provided"}`;
    const data = await callGeminiDirect(systemPrompt, userPrompt, true);
    const text = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(text);
    return parsed as Questions;
  }

  if (LOCAL_OPENAI_KEY) {
    const systemPrompt = `You are an expert technical recruiter and hiring manager. Your task is to generate exactly 5 behavioral questions (based on the STAR methodology: Situation, Task, Action, Result) and exactly 5 technical/role-specific questions. Return a JSON object matching this structure:
{
  "behavioral": [
    { "question": string, "rationale": string, "target_skill": string }
  ],
  "technical": [
    { "question": string, "rationale": string, "target_skill": string }
  ]
}`;
    const userPrompt = `Candidate Profile:\n${JSON.stringify(profile)}\n\nJob Description (optional):\n${job_description || "Not provided"}`;
    const data = await callOpenAiDirect([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], true);

    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed as Questions;
  }

  const d = await postJson("/generate-questions", { profile, job_description });
  return d.questions as Questions;
}

export type StreamHandlers = {
  onStart?: () => void;
  onToken: (chunk: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
};

export async function streamInterview(
  profile: Profile,
  questions: Questions,
  history: ChatMessage[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (LOCAL_GEMINI_KEY) {
    const models = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-1.5-flash"];
    let streamStarted = false;
    let lastError = null;

    const systemPrompt = `You are Kairós, a professional, constructive, and encouraging AI Hiring Manager conducting a live mock interview.
Here is the candidate's profile:
${JSON.stringify(profile)}

Here are the predicted interview questions for this session:
${JSON.stringify(questions)}

Conduct the interview step-by-step:
1. Introduce yourself and set the stage based on the candidate's profile. Ask the first question.
2. In subsequent turns, review the candidate's response. Provide extremely brief, encouraging, and constructive feedback (highlighting strong points or key missing terms/concepts), and then transition to the next question.
3. Ask exactly one question at a time. Keep your messages professional, concise, and conversational.`;

    const contents = history.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    for (const model of models) {
      if (streamStarted) break;
      
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${LOCAL_GEMINI_KEY}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            }
          }),
          signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error?.message || `Stream failed (${res.status})`);
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        streamStarted = true;
        handlers.onStart?.();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleaned = line.trim();
            if (!cleaned) continue;
            if (cleaned.startsWith("data: ")) {
              const dataStr = cleaned.slice(6).trim();
              try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.candidates[0]?.content?.parts[0]?.text || "";
                if (content) {
                  handlers.onToken(content);
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
        handlers.onDone?.();
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          throw err;
        }
        console.warn(`Gemini stream model ${model} failed, trying next... Error:`, err);
        lastError = err;
      }
    }

    if (!streamStarted) {
      handlers.onError?.(lastError?.message || "All Gemini models failed to stream.");
    }
    return;
  }

  if (LOCAL_OPENAI_KEY) {
    handlers.onStart?.();
    try {
      const systemPrompt = `You are Kairós, a professional, constructive, and encouraging AI Hiring Manager conducting a live mock interview.
Here is the candidate's profile:
${JSON.stringify(profile)}

Here are the predicted interview questions for this session:
${JSON.stringify(questions)}

Conduct the interview step-by-step:
1. Introduce yourself and set the stage based on the candidate's profile. Ask the first question.
2. In subsequent turns, review the candidate's response. Provide extremely brief, encouraging, and constructive feedback (highlighting strong points or key missing terms/concepts), and then transition to the next question.
3. Ask exactly one question at a time. Keep your messages professional, concise, and conversational.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOCAL_OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          stream: true,
        }),
        signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        handlers.onError?.(data.error?.message || `Stream failed (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned) continue;
          if (cleaned.startsWith("data: ")) {
            const dataStr = cleaned.slice(6).trim();
            if (dataStr === "[DONE]") {
              handlers.onDone?.();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                handlers.onToken(content);
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
      handlers.onDone?.();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handlers.onError?.(String((err as Error).message || err));
      }
    }
    return;
  }

  // Fallback to Supabase Edge Function
  const res = await fetch(`${EDGE_FUNCTION_URL}/interview/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ profile, questions, messages: history }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    handlers.onError?.(data.error || `Stream failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const evt of events) {
        const lines = evt.split("\n");
        let event = "message";
        let dataLine = "";
        for (const l of lines) {
          if (l.startsWith("event:")) event = l.slice(6).trim();
          else if (l.startsWith("data:")) dataLine = l.slice(5).trim();
        }
        if (!dataLine) continue;
        let payload: { content?: string } = {};
        try {
          payload = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (event === "start") handlers.onStart?.();
        else if (event === "token") handlers.onToken(payload.content || "");
        else if (event === "error") handlers.onError?.(payload.content || "Unknown error");
        else if (event === "done") handlers.onDone?.();
      }
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      handlers.onError?.(String((err as Error).message || err));
    }
  }
}
