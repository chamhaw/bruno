import { safeParseJSON } from 'utils/common';

const EMPTY_VALUE = '(none)';
const DEFAULT_MAX_BODY_CHARS = 30000;

const formatTimestamp = (timestamp) => {
  if (!timestamp) return EMPTY_VALUE;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return date.toISOString();
};

const truncateText = (text, maxChars = DEFAULT_MAX_BODY_CHARS) => {
  const stringValue = String(text);
  if (stringValue.length <= maxChars) return stringValue;

  const headLength = Math.ceil(maxChars / 2);
  const tailLength = Math.floor(maxChars / 2);
  return [
    stringValue.slice(0, headLength),
    '',
    `[TRUNCATED: ${stringValue.length - maxChars} characters omitted]`,
    '',
    stringValue.slice(stringValue.length - tailLength)
  ].join('\n');
};

const normalizeHeaders = (headers) => {
  if (!headers) return [];
  if (Array.isArray(headers)) {
    return headers
      .filter((header) => header && header.name)
      .map(({ name, value }) => ({ name: String(name), value: value === null || value === undefined ? '' : String(value) }));
  }

  return Object.entries(headers).map(([name, value]) => ({
    name: String(name),
    value: value === null || value === undefined ? '' : String(value)
  }));
};

const formatHeaderLines = (headers) => {
  const normalizedHeaders = normalizeHeaders(headers);
  if (!normalizedHeaders.length) return EMPTY_VALUE;

  return normalizedHeaders
    .map(({ name, value }) => `- ${name}: ${value}`)
    .join('\n');
};

const stringifyBody = (body, options = {}) => {
  const { maxChars = DEFAULT_MAX_BODY_CHARS } = options;
  if (body === null || body === undefined || body === '') return EMPTY_VALUE;
  if (typeof body === 'string') {
    const parsedBody = safeParseJSON(body);
    if (parsedBody && typeof parsedBody === 'object') {
      return truncateText(JSON.stringify(parsedBody, null, 2), maxChars);
    }
    return truncateText(body, maxChars);
  }

  try {
    return truncateText(JSON.stringify(body, null, 2), maxChars);
  } catch {
    return truncateText(String(body), maxChars);
  }
};

const quoteShellArg = (value) => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  return `'${stringValue.replace(/'/g, `'\\''`)}'`;
};

const buildCurl = (request) => {
  if (!request?.url) return EMPTY_VALUE;

  const method = (request.method || 'GET').toUpperCase();
  const segments = ['curl', '-X', method, quoteShellArg(request.url)];

  normalizeHeaders(request.headers).forEach(({ name, value }) => {
    segments.push('-H', quoteShellArg(`${name}: ${value}`));
  });

  if (request.data !== null && request.data !== undefined && request.data !== '') {
    segments.push('--data-raw', quoteShellArg(stringifyBody(request.data)));
  }

  return segments.join(' ');
};

const extractAssertionDiff = (item) => {
  const assertionResults = Array.isArray(item?.assertionResults) ? item.assertionResults : [];
  const failedAssertionResults = assertionResults.filter((result) => result?.status === 'fail');
  const enabledAssertions = Array.isArray(item?.request?.assertions)
    ? item.request.assertions.filter((assertion) => assertion?.enabled !== false)
    : [];

  if (failedAssertionResults.length) {
    return failedAssertionResults.map((result, index) => {
      const title = result?.name || result?.message || `Assertion ${index + 1}`;
      const detail = result?.error || result?.expected || result?.actual || result?.message || EMPTY_VALUE;
      return `- Assertion mismatch: ${title}: ${detail}`;
    }).join('\n');
  }

  if (assertionResults.length) {
    return assertionResults.map((result, index) => {
      const title = result?.name || result?.message || `Assertion ${index + 1}`;
      return `- ${title}: ${result?.status || 'pass'}`;
    }).join('\n');
  }

  if (enabledAssertions.length) {
    return enabledAssertions.map((assertion, index) => {
      const name = assertion?.name || `Assertion ${index + 1}`;
      const operator = assertion?.operator || 'eq';
      const value = assertion?.value ?? EMPTY_VALUE;
      return `- ${name}: operator=${operator}, expected=${value}`;
    }).join('\n');
  }

  return EMPTY_VALUE;
};

const parseTimeline = (timeline = []) => {
  const parsed = {
    requestLine: null,
    requestHeaders: [],
    requestBodyLines: [],
    responseLine: null,
    responseHeaders: [],
    responseBodyLines: [],
    info: [],
    errors: []
  };

  let section = null;
  for (const entry of timeline) {
    const type = entry?.type;
    const message = entry?.message;
    if (!message || typeof message !== 'string') {
      continue;
    }

    if (type === 'request') {
      parsed.requestLine = parsed.requestLine || message;
      section = 'request';
      continue;
    }

    if (type === 'requestHeader') {
      parsed.requestHeaders.push(message);
      section = 'requestHeaders';
      continue;
    }

    if (type === 'requestData') {
      parsed.requestBodyLines.push(message);
      section = 'requestBody';
      continue;
    }

    if (type === 'response') {
      parsed.responseLine = parsed.responseLine || message;
      section = 'response';
      continue;
    }

    if (type === 'responseHeader') {
      parsed.responseHeaders.push(message);
      section = 'responseHeaders';
      continue;
    }

    if (type === 'info') {
      parsed.info.push(message);
      if (/Request completed in/i.test(message)) {
        section = 'responseBody';
      }
      continue;
    }

    if (type === 'error') {
      parsed.errors.push(message);
      if (section === 'responseHeaders' || section === 'response') {
        parsed.responseBodyLines.push(message);
      }
      continue;
    }

    if (section === 'requestBody') {
      parsed.requestBodyLines.push(message);
      continue;
    }

    if (section === 'responseHeaders' || section === 'responseBody') {
      parsed.responseBodyLines.push(message);
    }
  }

  return parsed;
};

const parseRequestLine = (requestLine) => {
  if (!requestLine || typeof requestLine !== 'string') return {};
  const match = requestLine.match(/^([A-Z]+)\s+(.+)$/);
  if (!match) return {};
  return {
    method: match[1],
    url: match[2]
  };
};

const parseResponseLine = (responseLine) => {
  if (!responseLine || typeof responseLine !== 'string') return {};
  const match = responseLine.match(/^HTTP\/([0-9.]+)\s+(\d+)(?:\s+(.*))?$/i);
  if (!match) return {};
  return {
    httpVersion: match[1],
    statusCode: Number(match[2]),
    statusText: match[3] || ''
  };
};

const headerLinesToObject = (headerLines = []) => {
  const headers = {};
  headerLines.forEach((line) => {
    const idx = line.indexOf(':');
    if (idx <= 0) return;
    const name = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (name) {
      headers[name] = value;
    }
  });
  return headers;
};

const tryParseStructuredText = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  const parsedJson = safeParseJSON(trimmed);
  if (typeof parsedJson === 'object') {
    return parsedJson;
  }

  return trimmed;
};

const parseStructuredFallback = ({ request, response, timeline }) => {
  const parsedTimeline = parseTimeline(timeline);
  const fallbackRequest = parseRequestLine(parsedTimeline.requestLine);
  const fallbackResponse = parseResponseLine(parsedTimeline.responseLine);

  return {
    request: {
      method: fallbackRequest.method || request?.method,
      url: fallbackRequest.url || request?.url,
      headers: parsedTimeline.requestHeaders.length
        ? headerLinesToObject(parsedTimeline.requestHeaders)
        : request?.headers,
      data: parsedTimeline.requestBodyLines.length
        ? tryParseStructuredText(parsedTimeline.requestBodyLines.join('\n'))
        : request?.data
    },
    response: {
      status: response?.status ?? fallbackResponse.statusCode,
      statusCode: response?.statusCode ?? fallbackResponse.statusCode,
      statusText: response?.statusText || fallbackResponse.statusText,
      headers: response?.headers || headerLinesToObject(parsedTimeline.responseHeaders),
      data: response?.data ?? tryParseStructuredText(parsedTimeline.responseBodyLines.join('\n')),
      duration: response?.duration,
      error: response?.error,
      isError: response?.isError
    },
    parsedTimeline
  };
};

const formatContextSection = ({ selectedRequest, request, response, collection, item }) => {
  const lines = [
    `- Collection: ${collection?.name || EMPTY_VALUE}`,
    `- Request: ${item?.name || selectedRequest?.itemUid || EMPTY_VALUE}`,
    `- Timestamp: ${formatTimestamp(selectedRequest?.timestamp || request?.timestamp)}`
  ];

  if (request?.url) {
    lines.push(`- URL: ${request.url}`);
  }

  if (response?.statusCode || response?.status) {
    lines.push(`- HTTP Status: ${response.statusCode || response.status}`);
  }

  if (response?.duration !== null && response?.duration !== undefined) {
    lines.push(`- Duration: ${response.duration} ms`);
  }

  if (item?.request?.docs) {
    lines.push(`- Request Docs: ${String(item.request.docs)}`);
  }

  return lines.join('\n');
};

const formatResponseStatus = (response, parsedTimeline) => {
  const status = response?.statusCode || response?.status || EMPTY_VALUE;
  const statusText = response?.statusText || parsedTimeline?.responseLine || '';
  const duration = response?.duration !== null && response?.duration !== undefined ? `${response.duration} ms` : EMPTY_VALUE;

  return [
    `- Status: ${status}`,
    `- Status Text: ${statusText || EMPTY_VALUE}`,
    `- Duration: ${duration}`
  ].join('\n');
};

const formatErrorSection = (response, parsedTimeline) => {
  const messages = [];

  if (response?.error) {
    messages.push(`- Response Error: ${response.error}`);
  }

  parsedTimeline?.errors?.forEach((message) => {
    messages.push(`- ${message}`);
  });

  return messages.length ? messages.join('\n') : EMPTY_VALUE;
};

const formatInstructionsSection = (response) => {
  const status = Number(response?.statusCode || response?.status);
  if (status >= 200 && status < 300) {
    return [
      '1. Review the API Debug Context and confirm the request target and response result.',
      '2. Reproduce the request with cURL, then compare the response headers/body with the network log.',
      '3. Verify the response contract, including expected fields, values, pagination, and data consistency.'
    ].join('\n');
  }

  return [
    '1. Review the API Debug Context and confirm the request target and failure symptoms.',
    '2. Reproduce the request with cURL, then troubleshoot using the response headers/body and network errors.',
    '3. Identify the most likely root cause, supporting evidence, and the next validation action.'
  ].join('\n');
};

export const buildResponseDebugMarkdown = ({ selectedRequest, collection, item, maxBodyChars = DEFAULT_MAX_BODY_CHARS }) => {
  const rawRequest = selectedRequest?.data?.request || {};
  const rawResponse = selectedRequest?.data?.response || {};
  const timeline = Array.isArray(rawResponse?.timeline) ? rawResponse.timeline : [];
  const { request, response, parsedTimeline } = parseStructuredFallback({
    request: rawRequest,
    response: rawResponse,
    timeline
  });

  return [
    '# API Debug Context',
    formatContextSection({ selectedRequest, request, response, collection, item }),
    '',
    '# Request (cURL)',
    '```bash',
    buildCurl(request),
    '```',
    '',
    '## Request Headers',
    formatHeaderLines(request.headers),
    '',
    '## Request Body',
    '```',
    stringifyBody(request.data, { maxChars: maxBodyChars }),
    '```',
    '',
    '# Response',
    formatResponseStatus(response, parsedTimeline),
    '',
    '## Response Headers',
    formatHeaderLines(response.headers),
    '',
    '## Response Body',
    '```',
    stringifyBody(response.data, { maxChars: maxBodyChars }),
    '```',
    '',
    '# Network / System Errors',
    formatErrorSection(response, parsedTimeline),
    '',
    '# Response Validation',
    extractAssertionDiff(item),
    '',
    '# Instructions',
    formatInstructionsSection(response)
  ].join('\n');
};

export const __testUtils__ = {
  buildCurl,
  extractAssertionDiff,
  parseStructuredFallback,
  stringifyBody
};
