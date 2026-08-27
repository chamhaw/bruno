jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'generated-uid'
}));

import { collectionsSlice } from './index';

const { applyResponseExampleToRequest } = collectionsSlice.actions;
const reducer = collectionsSlice.reducer;

const makeState = (item) => ({
  collections: [{ uid: 'collection-1', items: [item] }]
});

describe('applyResponseExampleToRequest', () => {
  it('lets an HTTP request use an example transport snapshot without changing its execution configuration', () => {
    const item = {
      uid: 'request-1',
      type: 'http-request',
      name: 'Parent request',
      request: {
        method: 'GET',
        url: 'https://saved.example.test',
        headers: [{ uid: 'saved-header', name: 'X-Saved', value: 'saved', enabled: true }],
        params: [{ uid: 'saved-param', name: 'saved', value: 'true', type: 'query', enabled: true }],
        body: { mode: 'json', json: '{"saved":true}' },
        auth: { mode: 'bearer', token: 'parent-token' },
        script: { req: 'request script', res: 'response script' },
        vars: { req: [{ uid: 'parent-var', name: 'host', value: 'saved.example.test' }], res: [] },
        assertions: [{ uid: 'parent-assertion', expression: 'expect(res.status).to.equal(200)' }]
      },
      settings: { encodeUrl: true },
      docs: 'Keep this documentation',
      examples: [{
        uid: 'example-1',
        name: 'Created user',
        type: 'http-request',
        request: {
          method: 'POST',
          url: 'https://example.test/users',
          headers: [{ uid: 'example-header', name: 'Content-Type', value: 'application/json', enabled: true }],
          params: [{ uid: 'example-param', name: 'verbose', value: '1', type: 'query', enabled: true }],
          body: {
            mode: 'multipartForm',
            multipartForm: [{ uid: 'example-multipart', name: 'avatar', value: '/tmp/avatar.png', type: 'file', enabled: true }],
            formUrlEncoded: [{ uid: 'example-form', name: 'role', value: 'admin', enabled: true }],
            file: [{ uid: 'example-file', filePath: '/tmp/avatar.png', contentType: 'image/png', enabled: true }]
          }
        },
        response: { status: 201, body: '{"id":1}' }
      }]
    };
    item.draft = {
      ...item,
      request: {
        ...item.request,
        auth: { mode: 'bearer', token: 'unsaved-parent-token' },
        docs: 'Unsaved parent-only field'
      }
    };

    const next = reducer(
      makeState(item),
      applyResponseExampleToRequest({ collectionUid: 'collection-1', itemUid: 'request-1', exampleUid: 'example-1' })
    );
    const updated = next.collections[0].items[0];

    expect(updated.draft.request).toMatchObject({
      method: 'POST',
      url: 'https://example.test/users',
      headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }],
      params: [{ name: 'verbose', value: '1', type: 'query', enabled: true }],
      body: { mode: 'multipartForm', multipartForm: [{ name: 'avatar', value: '/tmp/avatar.png', type: 'file', enabled: true }] },
      auth: { mode: 'bearer', token: 'unsaved-parent-token' },
      script: { req: 'request script', res: 'response script' },
      vars: { req: [{ uid: 'parent-var', name: 'host', value: 'saved.example.test' }], res: [] },
      assertions: [{ uid: 'parent-assertion', expression: 'expect(res.status).to.equal(200)' }],
      docs: 'Unsaved parent-only field'
    });
    expect(updated.draft.request.headers[0].uid).not.toBe('example-header');
    expect(updated.draft.request.params[0].uid).not.toBe('example-param');
    expect(updated.draft.request.body.multipartForm[0].uid).not.toBe('example-multipart');
    expect(updated.draft.request.body.formUrlEncoded[0].uid).not.toBe('example-form');
    expect(updated.draft.request.body.file[0].uid).not.toBe('example-file');
    expect(updated.draft.examples[0].response).toEqual({ status: 201, body: '{"id":1}' });
    expect(updated.draft.examples[0].request.headers[0].uid).toBe('example-header');

    expect(updated.draft.request.headers[0]).not.toBe(updated.draft.examples[0].request.headers[0]);
  });

  it('does not apply an example to a non-HTTP request', () => {
    const item = {
      uid: 'grpc-request-1',
      type: 'grpc-request',
      request: { url: 'grpc://saved.example.test' },
      examples: [{
        uid: 'example-1',
        type: 'grpc-request',
        request: { url: 'grpc://example.test' }
      }]
    };

    const next = reducer(
      makeState(item),
      applyResponseExampleToRequest({ collectionUid: 'collection-1', itemUid: 'grpc-request-1', exampleUid: 'example-1' })
    );

    expect(next.collections[0].items[0].draft).toBeUndefined();
    expect(next.collections[0].items[0].request.url).toBe('grpc://saved.example.test');
  });

  it('does not apply a non-HTTP example to an HTTP request', () => {
    const item = {
      uid: 'request-1',
      type: 'http-request',
      request: { method: 'GET', url: 'https://saved.example.test' },
      examples: [{
        uid: 'grpc-example-1',
        type: 'grpc-request',
        request: { method: 'POST', url: 'grpc://example.test' }
      }]
    };

    const next = reducer(
      makeState(item),
      applyResponseExampleToRequest({ collectionUid: 'collection-1', itemUid: 'request-1', exampleUid: 'grpc-example-1' })
    );

    expect(next.collections[0].items[0].draft).toBeUndefined();
  });

  it('does not create a draft for an HTTP example without a request snapshot', () => {
    const item = {
      uid: 'request-1',
      type: 'http-request',
      request: { method: 'GET', url: 'https://saved.example.test' },
      examples: [{ uid: 'example-1', type: 'http-request' }]
    };

    const next = reducer(
      makeState(item),
      applyResponseExampleToRequest({ collectionUid: 'collection-1', itemUid: 'request-1', exampleUid: 'example-1' })
    );

    expect(next.collections[0].items[0].draft).toBeUndefined();
  });
});
