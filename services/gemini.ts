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
              You are an expert translator specializing in literary and technical book translations.
              
              Task:
              Translate the attached English document into high-quality, fluent Arabic. 
              
              Guidelines:
              1. **Complete Translation**: Translate the entire text content found in the document. Do not summarize.
              2. **Structure**: Maintain the original structure (chapters, headings, bullet points) using Markdown.
              3. **Images/Diagrams**: If you encounter images, diagrams, or charts, do not delete them. Instead, insert a placeholder description in Arabic like: "[صورة: وصف قصير]" (Image: Short description) in the correct location so the reader knows something is there.
              4. **Formatting**: Use Markdown headers (#, ##, ###) for titles.
              5. **Direction**: Ensure the output text flows naturally for Arabic readers (RTL context).
              
              Output only the Arabic Markdown translation.
            `,
          },
        ],
      },
      config: {
        // Thinking budget can be helpful for very complex translations, but for a whole book streaming, 
        // we might just want to let the model decide or standard generation. 
        // Let's use standard generation for speed in streaming.
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
