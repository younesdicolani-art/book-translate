import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Translates a PDF document from English to Arabic using Gemini 3 Pro (Preview)
 * for handling complex text tasks and large contexts.
 */
export const translateDocumentStream = async (
  base64Data: string,
  mimeType: string,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  // Gemini 3 Pro Preview is recommended for Complex Text Tasks per guidelines.
  // It also has a larger context window suitable for "big books".
  const modelId = 'gemini-3-pro-preview';

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `
              You are an expert translator specializing in translating complete books from English to Arabic.
              
              **CRITICAL INSTRUCTION**: 
              Do not delete or summarize any content. Translate EVERYTHING.
              
              Task:
              Translate the attached PDF document into fluent, literary Arabic (Standard Arabic).
              
              Detailed Guidelines:
              1. **Complete Translation**: Translate every sentence, paragraph, and chapter. Do not summarize.
              2. **Structure Preservation**: You must use Markdown to exactly match the structure of the book:
                 - Use # for Book Title
                 - Use ## for Chapter Titles
                 - Use ### for Subsections
                 - Preserve lists, tables, and bold text.
              3. **Images & Diagrams**: **DO NOT IGNORE IMAGES.** 
                 - Since you cannot generate the image file itself, you MUST insert a descriptive placeholder in the exact location of the image.
                 - Format: \`> **[صورة: وصف دقيق للصورة هنا]**\` (Image: Detailed description here).
                 - If the image contains text, translate that text inside the placeholder description.
              4. **Formatting**: Ensure the output is formatted for Right-to-Left (RTL) reading.
              5. **Tone**: Maintain the original tone of the book (academic, narrative, technical, etc.).
              
              Output only the Arabic Markdown translation. Start translating immediately.
            `,
          },
        ],
      },
      config: {
        // Standard generation configuration
      },
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        onChunk(chunkText);
      }
    }
    return fullText;

  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    throw new Error(error.message || "Failed to translate document.");
  }
};