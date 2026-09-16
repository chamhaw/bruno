export const MCP_METHODS = {
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call'
};

const MCP_PROTOCOL_VERSION = '2026-07-28';

export const isValidToolArguments = (toolArguments) => {
  try {
    const parsed = JSON.parse(toolArguments);

    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch (error) {
    return false;
  }
};

export const getMcpRequest = ({ url, mcpMethod, toolName, toolArguments }) => {
  const requestUrl = url?.trim();
  const name = toolName?.trim();
  const isToolCall = mcpMethod === MCP_METHODS.TOOLS_CALL;

  if (!requestUrl) {
    return null;
  }

  if (!isToolCall && mcpMethod !== MCP_METHODS.TOOLS_LIST) {
    return null;
  }

  if (isToolCall && !name) {
    return null;
  }

  if (toolArguments && !isValidToolArguments(toolArguments)) {
    return null;
  }

  const params = {};

  if (isToolCall) {
    params.name = name;

    if (toolArguments) {
      params.arguments = JSON.parse(toolArguments);
    }
  }

  params._meta = {
    'io.modelcontextprotocol/protocolVersion': MCP_PROTOCOL_VERSION,
    'io.modelcontextprotocol/clientCapabilities': {}
  };

  // A server rejects a request whose mirrored headers disagree with the body
  // (JSON-RPC -32020), so the protocol version and method are written here from
  // the same values that go into the body rather than left to variables.
  const headers = [
    { name: 'Content-Type', value: 'application/json', enabled: true },
    { name: 'Accept', value: 'application/json, text/event-stream', enabled: true },
    { name: 'MCP-Protocol-Version', value: MCP_PROTOCOL_VERSION, enabled: true },
    { name: 'Mcp-Method', value: mcpMethod, enabled: true }
  ];

  if (isToolCall) {
    headers.push({ name: 'Mcp-Name', value: name, enabled: true });
  }

  const body = {
    mode: 'json',
    json: JSON.stringify({ jsonrpc: '2.0', id: 1, method: mcpMethod, params }, null, 2),
    text: null,
    xml: null,
    sparql: null,
    multipartForm: null,
    formUrlEncoded: null,
    graphql: null,
    file: null
  };

  return {
    url: requestUrl,
    method: 'POST',
    headers,
    body
  };
};
