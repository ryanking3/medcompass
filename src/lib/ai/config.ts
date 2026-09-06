export type AiProviderStatus = {
  mode: "fake" | "openai";
  requestedProvider: "fake" | "openai";
  configured: boolean;
  missing: string[];
  label: string;
  detail: string;
};

function providerFromEnv(): "fake" | "openai" {
  const requested = process.env.MEDCOMPASS_AI_PROVIDER ?? process.env.AI_PROVIDER ?? "fake";
  return requested.toLowerCase() === "openai" ? "openai" : "fake";
}

export function getAiProviderStatus(): AiProviderStatus {
  const requestedProvider = providerFromEnv();
  const missing = requestedProvider === "openai" && !process.env.OPENAI_API_KEY ? ["OPENAI_API_KEY"] : [];
  const configured = missing.length === 0;
  const mode = requestedProvider === "openai" && configured ? "openai" : "fake";

  return {
    mode,
    requestedProvider,
    configured,
    missing,
    label: mode === "openai" ? "OpenAI ready" : "Fake AI mode",
    detail: mode === "openai"
      ? "Server environment is ready for the real AI provider."
      : requestedProvider === "openai"
        ? "OpenAI was requested, but required server-only environment is missing."
        : "MedCompass is using deterministic placeholder responses until a real provider is enabled.",
  };
}
