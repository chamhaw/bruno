jest.mock('utils/network/index', () => ({
  cancelNetworkRequest: jest.fn(),
  connectWS: jest.fn(),
  sendGrpcRequest: jest.fn(),
  sendNetworkRequest: jest.fn(),
  sendWsRequest: jest.fn()
}));

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'generated-uid'
}));

import collectionsReducer from './index';
import { useResponseExampleInRequest } from './actions';
import { sendNetworkRequest } from 'utils/network/index';
import tabsReducer from '../tabs';

const collectionUid = 'collection-1';
const itemUid = 'request-1';
const exampleUid = 'example-1';

const makeItem = () => ({
  uid: itemUid,
  type: 'http-request',
  pathname: '/requests/create-user.bru',
  request: {
    method: 'GET',
    url: 'https://saved.example.test/users',
    headers: [],
    params: [],
    body: { mode: 'none' },
    auth: { mode: 'bearer', token: 'parent-token' }
  },
  examples: [{
    uid: exampleUid,
    type: 'http-request',
    name: 'Created user',
    request: {
      method: 'POST',
      url: 'https://example.test/users',
      headers: [{ uid: 'example-header', name: 'Content-Type', value: 'application/json', enabled: true }],
      params: [],
      body: { mode: 'json', json: '{"name":"Ada"}' }
    },
    response: { status: 201, body: '{"id":1}' }
  }]
});

const makeState = (item = makeItem()) => ({
  collections: {
    collections: [{
      uid: collectionUid,
      activeEnvironmentUid: null,
      environments: [],
      runtimeVariables: {},
      items: [item]
    }],
    collectionSortOrder: 'default',
    activeConnections: [],
    tempDirectories: {},
    saveTransientRequestModals: [],
    mockResponseEditors: {}
  },
  globalEnvironments: {
    globalEnvironments: [],
    activeGlobalEnvironmentUid: null
  },
  tabs: { tabs: [], activeTabUid: null, recentlyClosedTabs: [] }
});

const createStoreHarness = (initialState) => {
  let state = initialState;
  const getState = () => state;
  const dispatch = (action) => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }
    state = {
      ...state,
      collections: collectionsReducer(state.collections, action),
      tabs: tabsReducer(state.tabs, action)
    };
    return action;
  };

  return { dispatch, getState };
};

describe('useResponseExampleInRequest', () => {
  beforeEach(() => {
    sendNetworkRequest.mockReset();
  });

  it('applies the snapshot without sending and focuses the parent request tab', async () => {
    const { dispatch, getState } = createStoreHarness(makeState());

    const result = await dispatch(useResponseExampleInRequest({
      collectionUid,
      itemUid,
      exampleUid
    }));

    expect(result.applied).toBe(true);
    expect(sendNetworkRequest).not.toHaveBeenCalled();
    expect(getState().tabs.activeTabUid).toBe(itemUid);
    expect(getState().collections.collections[0].items[0]).toMatchObject({
      request: { method: 'GET', url: 'https://saved.example.test/users' },
      draft: { request: { method: 'POST', url: 'https://example.test/users' } }
    });
  });

  it('does not persist the parent request while trying an example', async () => {
    const { dispatch, getState } = createStoreHarness(makeState());

    const result = await dispatch(useResponseExampleInRequest({ collectionUid, itemUid, exampleUid }));

    expect(result.applied).toBe(true);
    expect(sendNetworkRequest).not.toHaveBeenCalled();
    expect(getState().collections.collections[0].items[0]).toMatchObject({
      request: { method: 'GET', url: 'https://saved.example.test/users' },
      draft: { request: { method: 'POST', url: 'https://example.test/users' } }
    });
  });

  it('refuses to use an example when another example has unsaved changes', async () => {
    const item = makeItem();
    item.draft = {
      ...item,
      examples: [{ ...item.examples[0], name: 'Unsaved name' }]
    };
    const { dispatch } = createStoreHarness(makeState(item));

    const result = await dispatch(useResponseExampleInRequest({ collectionUid, itemUid, exampleUid }));

    expect(result).toEqual({ applied: false, reason: 'unsaved-example-edits' });
    expect(sendNetworkRequest).not.toHaveBeenCalled();
  });

  it('does not apply or send an HTTP example that has no request snapshot', async () => {
    const item = makeItem();
    item.examples[0] = { ...item.examples[0], request: undefined };
    const { dispatch, getState } = createStoreHarness(makeState(item));

    const result = await dispatch(useResponseExampleInRequest({ collectionUid, itemUid, exampleUid }));

    expect(result).toEqual({ applied: false, reason: 'not-applicable' });
    expect(sendNetworkRequest).not.toHaveBeenCalled();
    expect(getState().collections.collections[0].items[0].draft).toBeUndefined();
  });
});
