/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { GroundedResponse, GroundingChunk, Guest, TurnLength } from '../types';
import { logger } from '../utils/logger';

export type ModelType = 'flash' | 'pro';

const getModelName = (type: ModelType) => {
  return type === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
};

if (!process.env.API_KEY) {
  logger.log("API_KEY environment variable not set. Application may not function correctly.", "error");
  console.warn(
    "API_KEY environment variable not set. Application may not function correctly."
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * A helper function to wrap an API call with retry logic and exponential backoff.
 * @param apiCall The function that makes the API call.
 * @param maxRetries The maximum number of retries.
 * @param initialDelay The initial delay in ms before the first retry.
 * @returns The result of the API call.
 */
const withRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> => {
    let attempt = 0;
    while (true) {
        try {
            return await apiCall();
        } catch (error: any) {
            attempt++;
            const errorMessage = (error?.message || '').toLowerCase();
            const isRetryable = errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('overloaded');

            if (!isRetryable || attempt >= maxRetries) {
                logger.log(`API call failed. Not retrying. Error: ${error.message}`, 'error');
                throw error;
            }

            const delay = initialDelay * Math.pow(2, attempt - 1);
            logger.log(`API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms... Error: ${error.message}`, 'error');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

export interface ConvertedScript {
  script: string;
  title: string;
}

export const convertTranscriptToScript = async (
  input: string, 
  hostPersona: string, 
  guests: Guest[], 
  currentTitle?: string,
  modelType: ModelType = 'flash'
): Promise<ConvertedScript> => {
  if (!input) {
    throw new Error("Input cannot be empty.");
  }

  const guestDescriptions = guests.map((g, i) => `- **Guest ${i + 1} (${g.role})**: ${g.persona}`).join('\n');

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const systemInstruction = `Today's date is ${today}. Use this as a reference for searching for fresh news and events.

  You are a script writer and formatter. I will provide you with a raw text transcript or notes. Your task is to convert it into a conversational talk show script between a "Host" and ${guests.length} Guest(s).

  Personas:
  - **Host**: ${hostPersona}
  ${guestDescriptions}

  **MANDATORY: Use Google Search:** You MUST use the Google Search tool to verify facts in the transcript, find missing details, and add relevant context or recent data that enriches the discussion while maintaining the original intent. Prioritize finding the most fresh and up-to-date information available on the web.

  Rules for the Script:
  - **MANDATORY: Speaker Alternation:** Every consecutive turn MUST be from a different speaker. Never have "Host:" followed by "Host:", or "Guest 1:" followed by "Guest 1:". The conversation must always flow from one person to another.
  - Each line MUST be prefixed by "Host:", "Guest 1:", "Guest 2:", etc. (depending on which guest is speaking).
  - Maintain the original information but make it sound like a natural back-and-forth conversation.
  - Add conversational fillers (um, uh, you know) where appropriate to make it sound natural.
  - If the input is just notes, expand them into a full conversational script based on the panelist personas.
  - If the input is a transcript, clean it up and format it correctly while preserving the core content.
  - The script should feel like a real, unscripted conversation.
  - **MANDATORY**: If a title is provided in the "Suggested Title" field (and it's not "None"), the Host MUST introduce the show by saying "Welcome to [EXACT SUGGESTED TITLE]" in the very first turn. Do NOT paraphrase, shorten, or "improve" the title in the dialogue.
  
  Rules for the Title:
  - **CRITICAL**: If a title is provided in the "Suggested Title" field (and it's not "None"), you MUST return that EXACT title in the "title" field of your JSON response. Do NOT change, refine, or shorten it. Even if you think it's a bad title, you MUST use it.
  - Only if the "Suggested Title" is "None" or empty, you should generate a catchy, professional title for this panel discussion.

  Output Format:
  The output MUST be in JSON format with the following structure:
  {
    "title": "The Panel Title",
    "script": "Host: ...\nGuest 1: ...\n..."
  }
  
  ONLY return the JSON object. No other comments.`;

  logger.log(`Calling Gemini API (${modelType}) to convert input to script...`);
  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: getModelName(modelType),
      contents: `Input Data:\n${input}\n\nSuggested Title: ${currentTitle && currentTitle.trim() ? currentTitle : 'None'}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    }));

    const result = JSON.parse(response.text || '{}');
    logger.log('Successfully converted input to script.');
    return {
      script: result.script || '',
      title: result.title || currentTitle || 'Untitled Panel'
    };
  } catch (error) {
    logger.log('Input conversion failed.', 'error');
    throw error;
  }
};

export const getGroundedResponse = async (
  prompt: string, 
  hostPersona: string, 
  guests: Guest[], 
  turnLength: TurnLength = 'short',
  modelType: ModelType = 'flash'
): Promise<GroundedResponse> => {
  if (!prompt) {
    throw new Error("Prompt cannot be empty.");
  }

  const guestDescriptions = guests.map((g, i) => `- **Guest ${i + 1} (${g.role})**: ${g.persona}`).join('\n');

  const turnLengthInstruction = turnLength === 'short'
    ? "- **MANDATORY: Very Short Turns:** Every single turn MUST be extremely brief (maximum 1-2 short sentences). Keep the conversation moving at a lightning-fast, snappy pace. Absolutely NO long explanations or monologues."
    : "- **Longer, Detailed Turns:** Allow speakers to provide comprehensive, in-depth explanations (5-8 sentences). This is a deep-dive format where guests have the space to fully explore complex ideas.";

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const systemInstruction = `Today's date is ${today}. Use this as a reference for searching for fresh news and events.

You are a world-class research-driven script writer for a conversational Q&A talk show. 

**CRITICAL: SEARCH GROUNDING IS MANDATORY**
You MUST use the Google Search tool for EVERY script. Even if you think you know the topic, you must search to find:
1. Recent news or data from the last 6-12 months. Prioritize fresh, up-to-the-minute information whenever appropriate.
2. Specific names, dates, and locations to add "texture" to the dialogue.
3. Contrasting opinions found on the web.
Failure to use the search tool will result in a generic, low-quality script.

The show features a Host and ${guests.length} guest(s).

Personas:
- **Host**: ${hostPersona}
${guestDescriptions}

Key characteristics of the conversation:
- **Good Banter:** The Host and Guests should have great chemistry, with a friendly and engaging back-and-forth. The conversation should feel dynamic and spontaneous.
${turnLengthInstruction}
- **Natural Disfluencies:** Incorporate natural-sounding disfluencies like 'um,' 'uh,' 'you know,' 'I mean,' and conversational filler to make the dialogue feel authentic.
- **Journalistic but Casual:** The Host should ask insightful questions, but the overall tone should be accessible and conversational, not overly formal. The guests are panelists but should explain things simply.
- **Deep Persona Integration:** Each guest MUST speak exclusively from their assigned persona. 
    - A **Technical Panelist** should focus on mechanics, data, and "how" things work.
    - A **Philosopher** should focus on meaning, ethics, "why" things matter, and existential implications.
    - Use vocabulary, metaphors, and rhetorical styles that match the persona (e.g., a "journalist" uses punchy, descriptive language; a "professor" uses structured, analytical language).
- **Contrasting Perspectives:** Guests should not just agree with each other. They should offer different, sometimes conflicting, viewpoints based on their unique backgrounds.
- **Guest Panelists:** The Guests are unaffiliated panelists on the topic; do not assume they have any affiliation with any company or product discussed.

The output must adhere to these rules:
- **MANDATORY: Speaker Alternation:** Every consecutive turn MUST be from a different speaker. Never have "Host:" followed by "Host:", or "Guest 1:" followed by "Guest 1:". The conversation must always flow from one person to another.
- ONLY contain the text of their spoken conversation.
- Each line MUST be prefixed by "Host:", "Guest 1:", "Guest 2:", etc. (depending on which guest is speaking).
- Do NOT include any other comments, annotations, or stage directions.
- Do NOT invent a name for the show.
- The host and guests should NOT refer to each other by name or by role (e.g., "Guest 1").
- **CRITICAL:** Speakers must NEVER refer to each other directly. Do not say "Guest 1, what do you think?" or "Host, that's a great point." The targets for questions and responses must always be implicit.
- The Host's first turn must start with a creative and engaging hook that varies based on the topic. **MANDATORY**: The Host MUST introduce the discussion using the user's provided topic as the EXACT title of the panel. Do NOT paraphrase, shorten, or "improve" the title in the dialogue. Examples of styles:
    - Intriguing question: "Ever wonder why...?"
    - Provocative statement: "Most people think X, but the reality is..."
    - Direct invitation: "If you've ever wanted to get to the bottom of..."
    - Narrative start: "Picture this: You're standing in..."
    - Bold claim: "We're living in an era where..."
    - Mystery: "There's a secret hiding in plain sight when it comes to..."
    - Relatable scenario: "You know that feeling when...?"
    - Avoid repeating the same opening style for every generation.
- **Natural Conclusion:** The script MUST conclude with the Host providing a brief summary and a natural closing statement. The Host should NOT thank the guests or refer to them directly in this conclusion; it should be a direct address to the audience to wrap up the topic.

At the VERY END of the script, after all dialogue, add a section for follow-on topics.
Format:
[FOLLOW_ON_TOPICS]
- Topic 1
- Topic 2
- Topic 3

These topics should be interesting follow-up subjects for someone who just listened to this discussion.`;

  logger.log(`Calling Gemini API (${modelType}) to generate script with retry logic...`);
  try {
    // FIX: Explicitly type the response to resolve type inference issues.
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: getModelName(modelType),
      contents: `Please research the following topic thoroughly and write a conversational script: ${prompt}`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    }));

    logger.log('Successfully received script from Gemini API.');
    let fullText = response.text ?? '';
    
    // Parse follow-on topics
    let text = fullText;
    let followOnTopics: string[] = [];
    
    const topicsMarker = '[FOLLOW_ON_TOPICS]';
    if (fullText.includes(topicsMarker)) {
        const parts = fullText.split(topicsMarker);
        text = parts[0].trim();
        const topicsSection = parts[1];
        followOnTopics = topicsSection
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => line.substring(1).trim())
            .filter(line => line.length > 0);
    }

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const allChunks = groundingMetadata?.groundingChunks || [];
    const sources = (allChunks as any[]).filter(chunk => chunk.web) as GroundingChunk[];
    
    logger.log(`Grounding metadata found: ${!!groundingMetadata}. Total chunks: ${allChunks.length}. Web chunks: ${sources.length}`);
    if (sources.length > 0) {
      logger.log(`First source: ${sources[0].web?.title} (${sources[0].web?.uri})`);
    }

    return { text, sources, followOnTopics };
  } catch (error) {
    logger.log('Gemini API call for script generation failed after all retries.', 'error');
    console.error("Error fetching grounded response:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get response from Gemini: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching the grounded response.");
  }
};

export interface PanelistSubmission {
  guestId: string;
  guestName: string;
  perspective: string;
  text: string;
}

export interface HostReviewDecision {
  selectedSpeakerKey: string; // 'host' or 'guest1' or 'guest2' etc.
  reasoning: string;
  text: string;
}

export const getLiveSearchContext = async (
  topic: string,
  modelType: ModelType = 'flash'
): Promise<{ text: string; sources: GroundingChunk[] }> => {
  try {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemInstruction = `Today's date is ${today}. Use this to search for fresh, current news, data, and contrasting perspectives on the user's topic: "${topic}".
Generate a structured, summarized research briefing (2-3 paragraphs max) documenting key facts, recent developments from the last 12 months, and contrasting perspectives or debates.`;
    
    logger.log(`Performing live mode initial search grounding for topic: "${topic}"...`);
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: getModelName(modelType),
      contents: `Search for deep and fresh context about: ${topic}`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    }));

    const fullText = response.text ?? '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const allChunks = groundingMetadata?.groundingChunks || [];
    const sources = (allChunks as any[]).filter(chunk => chunk.web) as GroundingChunk[];

    return { text: fullText, sources };
  } catch (error) {
    logger.log(`Initial search context gathering failed: ${error}`, 'error');
    return { text: `No external search context found for ${topic}. Please proceed with general knowledge.`, sources: [] };
  }
};

export const generateHostIntro = async (
  topic: string,
  hostPersona: string,
  turnLength: TurnLength = 'short',
  modelType: ModelType = 'flash'
): Promise<string> => {
  const turnLengthInstruction = turnLength === 'short'
    ? "Your introduction MUST be brief (maximum 2-3 short, engaging sentences)."
    : "Your introduction can be detailed and set the stage comprehensively (4-6 sentences).";

  const systemInstruction = `You are playing the role of host for a live panel discussion.
Your persona: ${hostPersona}

The topic of the panel is: "${topic}"

You are creating the open intro for the panel discussion.
${turnLengthInstruction}

Rules:
- Write in your exact persona style.
- You must introduce the discussion using the provided topic: "${topic}" as the title.
- Incorporate natural disfluencies (um, uh, you know) where appropriate to make it sound conversational.
- Direct this at the audience/viewers.
- ONLY output your introduction dialogue text, nothing else.`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: getModelName(modelType),
      contents: "Generate host introduction.",
      config: {
        systemInstruction,
      },
    }));

    return response.text || '';
  } catch (error) {
    logger.log(`Failed to generate host intro: ${error}`, 'error');
    throw error;
  }
};

export const generatePanelistSubmission = async (
  topic: string,
  guest: Guest,
  guestIndex: number,
  searchContext: string,
  history: { speaker: string; text: string }[],
  turnLength: TurnLength = 'short',
  modelType: ModelType = 'flash'
): Promise<PanelistSubmission> => {
  const historyText = history.map(item => `${item.speaker}: ${item.text}`).join('\n');
  const turnLengthInstruction = turnLength === 'short'
    ? "Your spoken submission MUST be extremely brief—strictly 1-2 sentences maximum. Keep it snappy and punchy."
    : "Your spoken submission can be a deep-dive, fully detailed point matching your persona—approx 3-5 sentences.";

  const systemInstruction = `You are playing the role of Guest ${guestIndex} (${guest.role}) in an interactive panel discussion.
Your persona configuration: ${guest.persona}

The topic of the panel is: "${topic}"

Here is a researched briefing with fresh facts and context you gathered at the beginning:
${searchContext}

Rule 3: Panelists can hold completely opposite perspectives on any topic. You must establish a unique, clear stance or point-of-view, which can be fully opposite to other panelists or conversational threads to make the debate engaging.
You will write a submission of what you would say next if you are invited to speak.
${turnLengthInstruction}

Rules for your line:
- Deliver your line EXCLUSIVELY in your persona's unique style, vocabulary, and perspective.
- You are speaking directly to the host and audience, but rules dictate that speakers must NEVER refer to each other or the host directly by name or index (do NOT say 'Guest 1' or 'Host' or 'Bob'). Keep references implicit.
- Incorporate natural disfluencies (um, uh, you know) to sound authentic and unscripted.
- Respond to or build on the discussion history provided below. Do NOT ignore the flow of conversation, but don't repeat what has already been said.

Discussion history so far:
${historyText || "(The host has just started the panel/invited comments)"}

Output format:
You MUST respond with a JSON object containing:
{
  "perspective": "A short summary of your specific stance or viewpoint for this turn",
  "text": "Your spoken contribution (exactly what you would say if selected)"
}`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: getModelName(modelType),
      contents: "Draft your panel submission.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    }));

    const result = JSON.parse(response.text || '{}');
    return {
      guestId: guest.id,
      guestName: guest.role,
      perspective: result.perspective || 'Constructive perspective',
      text: result.text || ''
    };
  } catch (error) {
    logger.log(`Failed to generate panelist submission for ${guest.role}: ${error}`, 'error');
    throw error;
  }
};

export const evaluatePanelSubmissions = async (
  topic: string,
  hostPersona: string,
  history: { speaker: string; text: string }[],
  submissions: PanelistSubmission[],
  lastSpeakerKey: string,
  turnLength: TurnLength = 'short',
  modelType: ModelType = 'flash'
): Promise<HostReviewDecision> => {
  const historyText = history.map(item => `${item.speaker}: ${item.text}`).join('\n');
  const submissionsText = submissions.map((sub, idx) => `GuestKey: guest${idx + 1} (${sub.guestName})\nStance: ${sub.perspective}\nProposed Speech: "${sub.text}"`).join('\n\n');

  const turnLengthInstruction = turnLength === 'short'
    ? "If you (the Host) decide to speak next, your speech MUST be extremely brief—strictly 1-2 short, snappy sentences to steer them."
    : "If you decide to speak next, your speech can be a comprehensive, insightful point of 3-5 sentences to guide them.";

  const systemInstruction = `You are playing the role of the Host of a panel discussion.
Your persona: ${hostPersona}

The topic of the panel is: "${topic}"

You are given:
1. The discussion history so far.
2. Formulated candidate submissions from all scheduled panelists (guests) for the next turn.

Your job is to act as the Host, review all submissions, and elect the next turn of the transcript based on these strict guidelines:

Rule 1 (The Steering Rule): If NO panelist submission is relevant, engaging, or exciting enough, you (the Host) can choose to speak next yourself (selectedSpeakerKey = 'host'). If you speak, your dialogue ("text") should steer, challenge, or refocus the panelists so they can formulate better submissions next.
Rule 2 (Alternation Rule): A panelist CANNOT be selected twice in a row (meaning they cannot be chosen if they were the last speaker: "${lastSpeakerKey}") UNLESS all other panelist submissions are viewed by you as significantly less relevant and engaging. By default, prefer to alternate speakers.
Wait for all inputs: You must review all submissions carefully.

In your evaluation reasoning, provide an insightful, conversational "Review Decision" note explaining your choice. E.g. "Guest 1 holds a fantastic contrasting view that adds spice to our debate. I am choosing them next!" or "None of the guests are addressing the crux of our topic. I will step in to steer us on course."

${turnLengthInstruction}

Output format:
You MUST respond with a JSON object containing:
{
  "selectedSpeakerKey": "host" or "guest1" or "guest2" (the chosen speaker key matching the inputs),
  "reasoning": "A highly engaging conversational review paragraph explaining your evaluation of each panelist's submission, what Stance won you over, and why (or why you stepped in)",
  "text": "If you selected 'host', this is your exact spoken dialogue to steer them. If you selected 'guestX', set this EXACTLY to that guest's 'Proposed Speech' text (do not modify it)."
}`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: getModelName(modelType),
      contents: `Discussion History:\n${historyText}\n\nLast Speaker Key: ${lastSpeakerKey}\n\nPanelist Submissions:\n${submissionsText}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    }));

    const result = JSON.parse(response.text || '{}');
    return {
      selectedSpeakerKey: result.selectedSpeakerKey || 'host',
      reasoning: result.reasoning || 'Evaluating show flow...',
      text: result.text || ''
    };
  } catch (error) {
    logger.log(`Failed host evaluation of panelist submissions: ${error}`, 'error');
    throw error;
  }
};