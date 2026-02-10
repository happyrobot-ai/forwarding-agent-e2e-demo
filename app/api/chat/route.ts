import { NextRequest } from "next/server";
import OpenAI from "openai";

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, customerContext } = await req.json();

    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful freight forwarding assistant embedded in a Customer Intelligence dashboard. You have access to the selected customer's full profile data below. Answer questions about this customer concisely and accurately based on the data provided. If the user asks something not covered by the data, say so honestly.

IMPORTANT: Do NOT use Markdown formatting in your responses. No bold (**), no italics (*), no headers (#), no bullet markers (- or *). Use plain text only. Use numbered lists (1. 2. 3.) or dashes for lists, and line breaks for structure.

CUSTOMER DATA:
${customerContext}`,
    };

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [systemMessage, ...messages],
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
