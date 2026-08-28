import axios from "axios";

export interface LinkValidationResult {
  url: string;
  isValid: boolean;
  statusCode?: number;
  finalUrl?: string;
  error?: string;
}

const USER_AGENT =
  "PathCraftAI/1.0 (+https://github.com/kanak28T/AI-RoadMap)";

const REQUEST_TIMEOUT = 10000;

export async function validateLink(
  url: string
): Promise<LinkValidationResult> {
  try {
    // First try HEAD because it is faster and does not download the page body.
    const headResponse = await axios.head(url, {
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (headResponse.status >= 200 && headResponse.status < 300) {
      return {
        url,
        isValid: true,
        statusCode: headResponse.status,
        finalUrl: headResponse.request?.res?.responseUrl ?? url,
      };
    }

    // Some servers do not support HEAD properly.
    // Fall back to GET in that case.
    if (
      headResponse.status === 405 ||
      headResponse.status === 403 ||
      headResponse.status === 501
    ) {
      const getResponse = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          "User-Agent": USER_AGENT,
        },
        responseType: "stream",
      });

      const isValid =
        getResponse.status >= 200 && getResponse.status < 300;

      getResponse.data.destroy();

      return {
        url,
        isValid,
        statusCode: getResponse.status,
        finalUrl: getResponse.request?.res?.responseUrl ?? url,
        ...(isValid ? {} : { error: `HTTP ${getResponse.status}` }),
      };
    }

    return {
      url,
      isValid: false,
      statusCode: headResponse.status,
      finalUrl: headResponse.request?.res?.responseUrl ?? url,
      error: `HTTP ${headResponse.status}`,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        url,
        isValid: false,
        ...(error.response?.status !== undefined
            ? { statusCode: error.response.status }
            : {}),
        error: error.code
            ? `${error.code}: ${error.message}`
            : error.message,
        };
    }

    return {
      url,
      isValid: false,
      error: "Unknown validation error",
    };
  }
}

