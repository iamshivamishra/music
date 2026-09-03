import { logger } from "@/lib/logger";
import { maskPhone } from "@/lib/utils/whatsapp";

type WhatsAppProvider = "gupshup" | "interakt" | "meta";

interface SendTemplateParams {
  to: string;
  templateName: string;
  bodyParams: string[];
}

interface SendTemplateResult {
  success: true;
  messageId: string;
}

interface SendTemplateError {
  success: false;
  error: string;
}

function getConfig() {
  const provider = (process.env.WHATSAPP_PROVIDER ?? "gupshup") as WhatsAppProvider;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const apiUrl = process.env.WHATSAPP_API_URL;
  const sender = process.env.WHATSAPP_SENDER;

  if (!apiKey || !apiUrl || !sender) {
    return null;
  }

  return { provider, apiKey, apiUrl, sender };
}

async function sendViaGupshup(
  config: NonNullable<ReturnType<typeof getConfig>>,
  params: SendTemplateParams
): Promise<SendTemplateResult | SendTemplateError> {
  const destination = params.to.startsWith("91") ? params.to : `91${params.to}`;

  const body = new URLSearchParams({
    channel: "whatsapp",
    source: config.sender,
    destination,
    "src.name": params.templateName,
    template: JSON.stringify({
      id: params.templateName,
      params: params.bodyParams,
    }),
  });

  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: config.apiKey,
    },
    body: body.toString(),
  });

  const data = await res.json();

  if (!res.ok || data.status === "error") {
    return {
      success: false,
      error: data.message ?? `Gupshup API error: ${res.status}`,
    };
  }

  return { success: true, messageId: data.messageId ?? data.id ?? "unknown" };
}

async function sendViaMeta(
  config: NonNullable<ReturnType<typeof getConfig>>,
  params: SendTemplateParams
): Promise<SendTemplateResult | SendTemplateError> {
  const destination = params.to.startsWith("91") ? params.to : `91${params.to}`;

  const res = await fetch(`${config.apiUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: destination,
      type: "template",
      template: {
        name: params.templateName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: params.bodyParams.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    return {
      success: false,
      error: data.error?.message ?? `Meta API error: ${res.status}`,
    };
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id ?? "unknown",
  };
}

async function sendViaInterakt(
  config: NonNullable<ReturnType<typeof getConfig>>,
  params: SendTemplateParams
): Promise<SendTemplateResult | SendTemplateError> {
  const destination = params.to.startsWith("91") ? params.to : `91${params.to}`;

  const res = await fetch(`${config.apiUrl}/message/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${config.apiKey}`,
    },
    body: JSON.stringify({
      countryCode: "+91",
      phoneNumber: destination.replace(/^91/, ""),
      type: "Template",
      template: {
        name: params.templateName,
        languageCode: "en",
        bodyValues: params.bodyParams,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.result === false) {
    return {
      success: false,
      error: data.message ?? `Interakt API error: ${res.status}`,
    };
  }

  return { success: true, messageId: data.id ?? "unknown" };
}

export const whatsappClient = {
  isConfigured(): boolean {
    return getConfig() !== null;
  },

  async sendTemplate(
    params: SendTemplateParams
  ): Promise<SendTemplateResult | SendTemplateError> {
    const config = getConfig();
    if (!config) {
      return { success: false, error: "WhatsApp provider not configured" };
    }

    logger.info("WhatsApp: sending template", {
      template: params.templateName,
      to: maskPhone(params.to),
    });

    try {
      let result: SendTemplateResult | SendTemplateError;

      switch (config.provider) {
        case "gupshup":
          result = await sendViaGupshup(config, params);
          break;
        case "meta":
          result = await sendViaMeta(config, params);
          break;
        case "interakt":
          result = await sendViaInterakt(config, params);
          break;
        default:
          return { success: false, error: `Unknown provider: ${config.provider}` };
      }

      if (result.success) {
        logger.info("WhatsApp: template sent", {
          template: params.templateName,
          to: maskPhone(params.to),
          messageId: result.messageId,
        });
      } else {
        logger.warn("WhatsApp: template send failed", {
          template: params.templateName,
          to: maskPhone(params.to),
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("WhatsApp: unexpected error sending template", {
        template: params.templateName,
        to: maskPhone(params.to),
        error: msg,
      });
      return { success: false, error: msg };
    }
  },
};
