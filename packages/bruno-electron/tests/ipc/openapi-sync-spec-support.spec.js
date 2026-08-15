const { describe, it, expect } = require('@jest/globals');

const {
  convertApiSpecToBruno,
  getApiSpecKind,
  getUnsupportedApiSpecMessage,
  isSupportedApiSpecForSync
} = require('../../src/ipc/openapi-sync/spec-support');

describe('OpenAPI sync spec support', () => {
  it('accepts Swagger 2.0 specs for sync', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Petstore', version: '1.0.0' },
      host: 'api.example.com',
      basePath: '/v1',
      schemes: ['https'],
      paths: {
        '/pets': {
          get: {
            tags: ['pets'],
            summary: 'List pets',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };

    expect(getApiSpecKind(spec)).toBe('swagger2');
    expect(isSupportedApiSpecForSync(spec)).toBe(true);

    const collection = convertApiSpecToBruno(spec, { groupBy: 'tags' });
    expect(collection.name).toBe('Petstore');
    expect(JSON.stringify(collection.items)).toContain('{{baseUrl}}/pets');
    expect(JSON.stringify(collection.environments)).toContain('https://api.example.com/v1');
  });

  it('accepts OpenAPI 3.x specs for sync', () => {
    const spec = {
      openapi: '3.0.0',
      paths: {
        '/users': {
          get: {
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };

    expect(getApiSpecKind(spec)).toBe('openapi3');
    expect(isSupportedApiSpecForSync(spec)).toBe(true);
  });

  it('rejects specs outside the sync support boundary', () => {
    expect(isSupportedApiSpecForSync({ swagger: '1.2', info: {}, paths: {} })).toBe(false);
    expect(isSupportedApiSpecForSync({ openapi: '2.0.0', info: {}, paths: {} })).toBe(false);
    expect(isSupportedApiSpecForSync({ openapi: '3.0.0' })).toBe(false);
    expect(getUnsupportedApiSpecMessage()).toContain('OpenAPI 3.x or Swagger 2.0');
  });
});
