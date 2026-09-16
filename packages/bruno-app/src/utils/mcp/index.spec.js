import { getMcpRequest, isValidToolArguments, MCP_METHODS } from './index';

const findHeader = (headers, name) => headers.find((header) => header.name.toLowerCase() === name.toLowerCase());

describe('getMcpRequest', () => {
  it('builds a tools/call request whose mirrored headers match the body', () => {
    const request = getMcpRequest({
      url: 'https://example.com/mcp',
      mcpMethod: MCP_METHODS.TOOLS_CALL,
      toolName: 'get_weather',
      toolArguments: '{ "location": "Seattle, WA" }'
    });

    expect(request.url).toBe('https://example.com/mcp');
    expect(request.method).toBe('POST');
    expect(request.body.mode).toBe('json');

    const body = JSON.parse(request.body.json);

    expect(body).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_weather',
        arguments: { location: 'Seattle, WA' },
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {}
        }
      }
    });

    // Servers reject a request with a -32020 HeaderMismatch when these disagree with the body.
    expect(findHeader(request.headers, 'MCP-Protocol-Version').value).toBe(
      body.params._meta['io.modelcontextprotocol/protocolVersion']
    );
    expect(findHeader(request.headers, 'Mcp-Method').value).toBe(body.method);
    expect(findHeader(request.headers, 'Mcp-Name').value).toBe(body.params.name);
    expect(findHeader(request.headers, 'Content-Type').value).toBe('application/json');
    expect(findHeader(request.headers, 'Accept').value).toBe('application/json, text/event-stream');
  });

  it('builds a tools/list request without a name, which carries no Mcp-Name header', () => {
    const request = getMcpRequest({
      url: 'https://example.com/mcp',
      mcpMethod: MCP_METHODS.TOOLS_LIST
    });

    expect(findHeader(request.headers, 'Mcp-Name')).toBeUndefined();
    expect(findHeader(request.headers, 'Mcp-Method').value).toBe('tools/list');

    const body = JSON.parse(request.body.json);

    expect(body.params).toEqual({
      _meta: {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientCapabilities': {}
      }
    });
  });

  it('omits arguments when the tool takes none', () => {
    const request = getMcpRequest({
      url: 'https://example.com/mcp',
      mcpMethod: MCP_METHODS.TOOLS_CALL,
      toolName: 'list_files'
    });

    expect(JSON.parse(request.body.json).params.arguments).toBeUndefined();
  });

  it('trims the tool name so the header stays header-safe', () => {
    const request = getMcpRequest({
      url: 'https://example.com/mcp',
      mcpMethod: MCP_METHODS.TOOLS_CALL,
      toolName: '  get_weather  '
    });

    expect(findHeader(request.headers, 'Mcp-Name').value).toBe('get_weather');
    expect(JSON.parse(request.body.json).params.name).toBe('get_weather');
  });

  it('rejects requests it cannot build', () => {
    const valid = { url: 'https://example.com/mcp', mcpMethod: MCP_METHODS.TOOLS_CALL, toolName: 'get_weather' };

    expect(getMcpRequest({ ...valid, url: '' })).toBeNull();
    expect(getMcpRequest({ ...valid, mcpMethod: 'prompts/get' })).toBeNull();
    expect(getMcpRequest({ ...valid, toolName: '   ' })).toBeNull();
    expect(getMcpRequest({ ...valid, toolArguments: 'not json' })).toBeNull();
    expect(getMcpRequest({ ...valid, toolArguments: '["a"]' })).toBeNull();
  });
});

describe('isValidToolArguments', () => {
  it('accepts JSON objects only', () => {
    expect(isValidToolArguments('{}')).toBe(true);
    expect(isValidToolArguments('{ "a": 1 }')).toBe(true);
    expect(isValidToolArguments('[]')).toBe(false);
    expect(isValidToolArguments('"a"')).toBe(false);
    expect(isValidToolArguments('null')).toBe(false);
    expect(isValidToolArguments('')).toBe(false);
  });
});
