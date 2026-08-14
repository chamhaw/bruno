import { buildResponseDebugMarkdown, __testUtils__ } from './debugContextMarkdown';

describe('debugContextMarkdown', () => {
  it('copies the executed request URL and complete debug data into Markdown', () => {
    const selectedRequest = {
      itemUid: 'req-1',
      timestamp: 1722330000000,
      data: {
        request: {
          method: 'DELETE',
          url: '/%7B%7BbaseUrl%7D%7D/api/v1/workspaces/:workspaceId',
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer stale-template-token'
          }
        },
        response: {
          status: 404,
          statusCode: 404,
          statusText: 'Not Found',
          duration: 187,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-request-id': 'req-404'
          },
          data: {
            error: 'USER_NOT_FOUND',
            message: 'User 42 not found',
            token: 'response-token'
          },
          timeline: [
            { type: 'request', message: 'DELETE https://api.example.com/v1/users/42?hard=true&access_token=query-token' },
            { type: 'requestHeader', message: 'Accept: application/json' },
            { type: 'requestHeader', message: 'Authorization: Bearer test-token' },
            { type: 'response', message: 'HTTP/1.1 404 Not Found' },
            { type: 'responseHeader', message: 'content-type: application/json; charset=utf-8' },
            { type: 'responseHeader', message: 'x-request-id: req-404' },
            { type: 'error', message: '{\"error\":\"USER_NOT_FOUND\",\"message\":\"User 42 not found\"}' }
          ]
        }
      }
    };

    const collection = { name: 'Users API' };
    const item = {
      name: 'Delete User',
      request: {
        docs: 'Deletes a user by id.',
        assertions: [
          { name: 'status should be 204', operator: 'eq', value: '204', enabled: true }
        ]
      },
      assertionResults: [
        { status: 'fail', name: 'status should be 204', expected: '204', actual: '404' }
      ]
    };

    const markdown = buildResponseDebugMarkdown({ selectedRequest, collection, item });

    expect(markdown).toContain('# API Debug Context');
    expect(markdown).toContain('# Request (cURL)');
    expect(markdown).toContain('Collection: Users API');
    expect(markdown).toContain('Request: Delete User');
    expect(markdown).toContain('```bash');
    expect(markdown).toContain('curl -X DELETE \'https://api.example.com/v1/users/42?hard=true&access_token=query-token\'');
    expect(markdown).toContain('URL: https://api.example.com/v1/users/42?hard=true&access_token=query-token');
    expect(markdown).not.toContain('/%7B%7BbaseUrl%7D%7D/api/v1/workspaces/:workspaceId');
    expect(markdown).toContain('- Authorization: Bearer test-token');
    expect(markdown).toContain('query-token');
    expect(markdown).toContain('response-token');
    expect(markdown).toContain('# Response');
    expect(markdown).toContain('- Status: 404');
    expect(markdown).toContain('- Duration: 187 ms');
    expect(markdown).toContain('"USER_NOT_FOUND"');
    expect(markdown).toContain('# Response Validation');
    expect(markdown).toContain('Assertion mismatch: status should be 204');
    expect(markdown).toContain('# Instructions');
    expect(markdown).not.toContain('API 调试上下文');
    expect(markdown).not.toContain('请求');
    expect(markdown).not.toContain('响应');
    expect(markdown).not.toContain('指令');
  });

  it('uses non-failure instructions for successful 2xx responses', () => {
    const markdown = buildResponseDebugMarkdown({
      selectedRequest: {
        itemUid: 'req-2',
        data: {
          request: { method: 'GET', url: 'https://api.example.com/health' },
          response: { statusCode: 200, statusText: 'OK', data: { ok: true } }
        }
      },
      collection: { name: 'Users API' },
      item: { name: 'Health check' }
    });

    expect(markdown).toContain('Review the API Debug Context and confirm the request target and response result.');
    expect(markdown).toContain('Verify the response contract');
    expect(markdown).not.toContain('failure');
    expect(markdown).not.toContain('fix');
  });

  it('keeps problem-analysis instructions for 4xx and 5xx responses', () => {
    for (const statusCode of [404, 500]) {
      const markdown = buildResponseDebugMarkdown({
        selectedRequest: {
          itemUid: `req-${statusCode}`,
          data: {
            request: { method: 'GET', url: 'https://api.example.com/resource' },
            response: { statusCode }
          }
        }
      });

      expect(markdown).toContain('failure symptoms');
      expect(markdown).toContain('root cause');
      expect(markdown).toContain('next validation action');
    }
  });

  it('falls back to parsing pure-text timeline when structured request/response fields are missing', () => {
    const { request, response, parsedTimeline } = __testUtils__.parseStructuredFallback({
      request: {},
      response: {
        timeline: [
          { type: 'request', message: 'DELETE https://api.example.com/v1/users/42?hard=true' },
          { type: 'requestHeader', message: 'Accept: application/json' },
          { type: 'response', message: 'HTTP/1.1 404 Not Found' },
          { type: 'responseHeader', message: 'content-type: application/json; charset=utf-8' },
          { type: 'error', message: '{\"error\":\"USER_NOT_FOUND\",\"message\":\"User 42 not found\"}' }
        ]
      },
      timeline: [
        { type: 'request', message: 'DELETE https://api.example.com/v1/users/42?hard=true' },
        { type: 'requestHeader', message: 'Accept: application/json' },
        { type: 'response', message: 'HTTP/1.1 404 Not Found' },
        { type: 'responseHeader', message: 'content-type: application/json; charset=utf-8' },
        { type: 'error', message: '{\"error\":\"USER_NOT_FOUND\",\"message\":\"User 42 not found\"}' }
      ]
    });

    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://api.example.com/v1/users/42?hard=true');
    expect(request.headers).toEqual({ Accept: 'application/json' });
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'content-type': 'application/json; charset=utf-8' });
    expect(response.data).toEqual({
      error: 'USER_NOT_FOUND',
      message: 'User 42 not found'
    });
    expect(parsedTimeline.errors).toContain('{\"error\":\"USER_NOT_FOUND\",\"message\":\"User 42 not found\"}');
  });

  it('preserves sensitive fields while truncating large bodies', () => {
    const markdown = buildResponseDebugMarkdown({
      maxBodyChars: 1000,
      selectedRequest: {
        itemUid: 'req-3',
        data: {
          request: {
            method: 'POST',
            url: 'https://api.example.com/login?password=query-secret',
            data: {
              username: 'mira',
              password: 'body-secret',
              nested: {
                clientSecret: 'client-secret',
                note: 'visible note'
              }
            }
          },
          response: {
            statusCode: 200,
            data: {
              access_token: 'token-secret',
              value: 'abcdefghijklmnopqrstuvwxyz'
            }
          }
        }
      }
    });

    expect(markdown).toContain('password=query-secret');
    expect(markdown).toContain('body-secret');
    expect(markdown).toContain('client-secret');
    expect(markdown).toContain('token-secret');
  });
});
