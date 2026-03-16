import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

const client = new Anthropic();

export async function generateOutput(
  outputType: string,
  projectData: Parameters<typeof buildUserPrompt>[0]
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = buildSystemPrompt(outputType);
  const userPrompt = buildUserPrompt(projectData);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
