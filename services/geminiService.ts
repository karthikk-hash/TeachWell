
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ActivityGenerationResponse, StudySession } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateActivitiesFromPdf = async (base64Data: string, focusMode: string = "Curriculum Mastery"): Promise<ActivityGenerationResponse> => {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          },
          {
            text: `SYSTEM INSTRUCTION: 
            You are the core intelligence of 'TeachWell', an app for intentional parents.
            Your goal: Transform this document into shared learning 'Missions'.
            Focus Mode: ${focusMode}.
            
            1. Detect the primary language of the PDF.
            2. For every text field, provide 'original' (detected language) and 'english'.
            3. Create 3 interactive home learning activities.
            4. For EACH instruction step, provide a 'stepImagePrompt' that is highly descriptive (e.g., 'A professional watercolor illustration of a child and parent looking at a magnifying glass in a garden').
            5. Add 'parentKnowledge' (2-3 sentences) explaining the 'Why' behind the topic to empower the parent.
            6. Extract 'overallTopics' as clean, short strings.
            7. Ensure the response matches the schema exactly.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["original", "english"] },
                topic: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["original", "english"] },
                objective: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["original", "english"] },
                materials: { type: Type.OBJECT, properties: { original: { type: Type.ARRAY, items: { type: Type.STRING } }, english: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["original", "english"] },
                instructions: { type: Type.OBJECT, properties: { original: { type: Type.ARRAY, items: { type: Type.STRING } }, english: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["original", "english"] },
                stepImagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                parentKnowledge: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["original", "english"] },
                duration: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["original", "english"] },
                ageAppropriateness: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["original", "english"] }
              },
              required: ["title", "topic", "objective", "materials", "instructions", "stepImagePrompts", "parentKnowledge", "duration", "ageAppropriateness"]
            }
          },
          overallTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["activities", "overallTopics"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("TeachWell engine failed to generate content.");
  return JSON.parse(text) as ActivityGenerationResponse;
};

export const getStudyMaterials = async (topics: string[]): Promise<StudySession> => {
  const model = "gemini-3-flash-preview";
  const topicString = topics.join(", ");
  
  const response = await ai.models.generateContent({
    model,
    contents: `You are the Lead Educator for TeachWell. Summarize these topics for a busy parent: ${topicString}. 
               
               RULES FOR SUMMARY:
               1. Point-wise summary, no markdown, no asterisks.
               2. Clean, plain text only. 
               
               RULES FOR RESOURCES:
               1. Ground your answer with Google Search. 
               2. Find Video (YouTube/TED) and Audio (Podcasts/Spotify) links.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const rawText = response.text || "";
  const summaryPoints = rawText
    .split('\n')
    .map(line => line.replace(/[#*•\-–—>]/g, '').trim())
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 20 && !line.includes('http'));

  const materials: any[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  chunks.forEach((chunk: any) => {
    if (chunk.web) {
      const url = chunk.web.uri;
      const title = chunk.web.title || "TeachWell Resource";
      const isVideo = /youtube|vimeo|ted|video|youtu\.be/.test(url);
      const isAudio = /spotify|podcast|soundcloud|apple|audio/.test(url);
      if (isVideo) materials.push({ title, url, type: 'video' });
      else if (isAudio) materials.push({ title, url, type: 'audio' });
    }
  });

  return { summary: summaryPoints, materials: materials.slice(0, 10) };
};

export const generateStepImage = async (prompt: string): Promise<string> => {
  const model = 'gemini-2.5-flash-image';
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: `Watercolor art style: ${prompt}` }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Image generation failed");
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<Uint8Array> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say with a warm, encouraging parent voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No narration generated");
  
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const suggestMaterialAlternative = async (missingItem: string, activityContext: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parent is missing: "${missingItem}" for a TeachWell mission about "${activityContext}". What's 1 simple household alternative? (Under 8 words)`
  });
  return response.text?.trim() || "A similar household item";
};
