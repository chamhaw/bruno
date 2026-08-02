import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import RequestDetailsPanel from './index';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('components/ResponsePane/Timeline/TimelineItem/Network', () => ({
  __esModule: true,
  default: ({ logs = [], showCopy }) => (
    <div data-testid="mock-network-log-count" data-show-copy={showCopy}>{logs.length}</div>
  )
}));

jest.mock('components/ResponsePane/QueryResponse/index', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-query-response" />
}));

const theme = {
  console: {
    contentBg: '#111827',
    headerBg: '#1f2937',
    border: '#374151',
    titleColor: '#f9fafb',
    countColor: '#9ca3af',
    buttonColor: '#d1d5db',
    buttonHoverBg: '#374151',
    buttonHoverColor: '#ffffff',
    checkboxColor: '#60a5fa',
    messageColor: '#e5e7eb',
    dropdownHeaderBg: '#111827',
    logHoverBg: '#1f2937',
    timestampColor: '#9ca3af',
    emptyColor: '#9ca3af'
  },
  font: {
    size: {
      base: '14px',
      sm: '12px',
      xs: '11px'
    }
  },
  border: {
    radius: {
      sm: '4px'
    }
  }
};

const selectedRequest = {
  itemUid: 'req-1',
  collectionUid: 'col-1',
  timestamp: 1722330000000,
  data: {
    request: {
      method: 'DELETE',
      url: 'https://api.example.com/v1/users/42?hard=true',
      headers: {
        Accept: 'application/json',
        Authorization: 'Basic real-token'
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
        message: 'User 42 not found'
      },
      timeline: [
        { type: 'request', message: 'DELETE https://api.example.com/v1/users/42?hard=true' },
        { type: 'requestHeader', message: 'Accept: application/json' },
        { type: 'requestHeader', message: 'Authorization: Basic real-token' },
        { type: 'response', message: 'HTTP/1.1 404 Not Found' }
      ]
    }
  }
};

const collectionsState = {
  collections: [
    {
      uid: 'col-1',
      name: 'Users API',
      items: [
        {
          uid: 'req-1',
          type: 'request',
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
        }
      ]
    }
  ]
};

const renderRequestDetailsPanel = () => {
  const store = configureStore({
    reducer: {
      logs: (
        state = {
          selectedRequest,
          networkFilters: {
            GET: true,
            POST: true,
            PUT: true,
            DELETE: true,
            PATCH: true,
            HEAD: true,
            OPTIONS: true
          }
        }
      ) => state,
      collections: (state = collectionsState) => state
    }
  });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <RequestDetailsPanel />
      </ThemeProvider>
    </Provider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(navigator, {
    clipboard: { writeText: jest.fn() }
  });
});

describe('RequestDetailsPanel', () => {
  it('does not render a Copy button in the Devtools Network tab', () => {
    renderRequestDetailsPanel();

    fireEvent.click(screen.getByRole('button', { name: /network/i }));
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-network-log-count')).toHaveAttribute('data-show-copy', 'false');
  });
});
