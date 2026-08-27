/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

const mockDispatch = jest.fn();
const mockUseResponseExampleInRequest = jest.fn((payload) => async () => ({ applied: true, payload }));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch
}));

jest.mock('providers/ReduxStore/slices/tabs', () => ({
  updateRequestPaneTabWidth: (payload) => ({ type: 'updateRequestPaneTabWidth', payload }),
  clearOpenInEditMode: (payload) => ({ type: 'clearOpenInEditMode', payload }),
  addTab: (payload) => ({ type: 'addTab', payload })
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveRequest: jest.fn(),
  useResponseExampleInRequest: (payload) => mockUseResponseExampleInRequest(payload)
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  applyResponseExampleToRequest: (payload) => ({ type: 'applyResponseExampleToRequest', payload }),
  cancelResponseExampleEdit: (payload) => ({ type: 'cancelResponseExampleEdit', payload })
}));

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('./ResponseExampleTopBar', () => ({ onTryExample, onUseAndSend }) => (
  <>
    <button type="button" onClick={onTryExample}>Use in Request</button>
    <button type="button" onClick={onUseAndSend}>Use & Send</button>
  </>
));
jest.mock('./ResponseExampleRequestPane', () => () => <div />);
jest.mock('./ResponseExampleResponsePane', () => () => <div />);
jest.mock('components/Sidebar/Collections/Collection/CollectionItem/GenerateCodeItem', () => () => <div />);
jest.mock('ui/HeightBoundContainer', () => ({ children }) => <div>{children}</div>);
jest.mock('components/Modal/StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick, ...props }) => <button type="button" onClick={onClick} {...props}>{children}</button>);

import ResponseExample from './index';

const collection = { uid: 'collection-1' };
const example = { uid: 'example-1', name: 'Created user', type: 'http-request' };

const makeItem = (draftRequest = null) => ({
  uid: 'request-1',
  type: 'http-request',
  pathname: '/requests/create-user.bru',
  request: {
    method: 'GET',
    url: 'https://saved.example.test/users',
    headers: [],
    params: [],
    body: { mode: 'none' }
  },
  ...(draftRequest ? { draft: { request: draftRequest } } : {})
});

const renderExample = (item) => {
  const store = configureStore({
    reducer: {
      app: (state = { preferences: {}, screenWidth: 1200, leftSidebarWidth: 240 }) => state
    }
  });

  return render(
    <Provider store={store}>
      <ResponseExample item={item} collection={collection} example={example} />
    </Provider>
  );
};

describe('ResponseExample Use in Request', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    mockUseResponseExampleInRequest.mockClear();
    toast.error.mockClear();
    toast.success.mockClear();
    mockDispatch.mockImplementation((action) => (typeof action === 'function' ? action() : action));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requires replacement confirmation only when the parent request has unsaved transport changes', () => {
    const item = makeItem({
      method: 'POST',
      url: 'https://saved.example.test/users',
      headers: [],
      params: [],
      body: { mode: 'none' }
    });

    renderExample(item);
    fireEvent.click(screen.getByText('Use in Request'));

    expect(screen.getByTestId('replace-request-from-example-modal')).toBeInTheDocument();
    expect(mockUseResponseExampleInRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.keyDown(document, { keyCode: 13 });
    expect(mockUseResponseExampleInRequest).not.toHaveBeenCalled();
    act(() => jest.runOnlyPendingTimers());

    fireEvent.click(screen.getByText('Use in Request'));
    fireEvent.click(screen.getByText('Replace'));

    expect(mockUseResponseExampleInRequest).toHaveBeenCalledWith({
      collectionUid: 'collection-1',
      itemUid: 'request-1',
      exampleUid: 'example-1',
      send: false
    });
  });

  it('applies without a replacement prompt when only non-transport request fields are dirty', () => {
    const item = makeItem({
      method: 'GET',
      url: 'https://saved.example.test/users',
      headers: [],
      params: [],
      body: { mode: 'none' },
      auth: { mode: 'bearer', token: 'unsaved-parent-token' }
    });

    renderExample(item);
    fireEvent.click(screen.getByText('Use in Request'));

    expect(screen.queryByTestId('replace-request-from-example-modal')).not.toBeInTheDocument();
    expect(mockUseResponseExampleInRequest).toHaveBeenCalledWith(expect.objectContaining({ send: false }));
  });

  it('blocks both actions while any example has unsaved edits', () => {
    const item = makeItem({
      method: 'GET',
      url: 'https://saved.example.test/users',
      headers: [],
      params: [],
      body: { mode: 'none' }
    });
    item.examples = [{
      ...example,
      type: 'http-request',
      request: { method: 'POST', url: 'https://example.test/users', headers: [], params: [], body: { mode: 'none' } }
    }];
    item.draft.examples = [{
      ...item.examples[0],
      name: 'Unsaved example name'
    }];

    renderExample(item);
    fireEvent.click(screen.getByText('Use in Request'));
    fireEvent.click(screen.getByText('Use & Send'));

    expect(mockUseResponseExampleInRequest).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Save or cancel example edits before using an example.');
  });

  it('does not claim Use & Send succeeded when the prompt is cancelled', async () => {
    mockUseResponseExampleInRequest.mockImplementation(() => async () => ({
      applied: true,
      sent: false,
      cancelled: true
    }));

    renderExample(makeItem());
    await act(async () => {
      fireEvent.click(screen.getByText('Use & Send'));
    });

    expect(toast.success).not.toHaveBeenCalled();
  });
});
