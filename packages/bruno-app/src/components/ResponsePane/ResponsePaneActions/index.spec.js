import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ResponsePaneActions from './index';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('ui/MenuDropdown', () => {
  const React = require('react');
  const renderSection = (section, testId) => {
    if (!section) return null;
    if (typeof section === 'function') return React.createElement(section, { 'data-testid': testId });
    return React.cloneElement(section, { 'data-testid': section.props?.['data-testid'] || testId });
  };

  return ({ children, items = [] }) => (
    <div>
      {children}
      <div role="menu">
        {items.map((item) => (
          <button key={item.id} role="menuitem" onClick={item.onClick} disabled={item.disabled}>
            {renderSection(item.leftSection, `${item.id}-icon`)}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
});

jest.mock('../ResponseBookmark', () => () => null);
jest.mock('../ResponseDownload', () => () => null);
jest.mock('../ResponseClear', () => () => null);
jest.mock('../ResponseLayoutToggle', () => ({
  __esModule: true,
  default: () => null,
  useResponseLayoutToggle: () => ({ orientation: 'vertical' })
}));
jest.mock('../ResponseCopy', () => {
  const React = require('react');
  return React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ click: jest.fn(), isDisabled: false }));
    return null;
  });
});

const theme = {
  workspace: { border: '#374151' },
  dropdown: { iconColor: '#d1d5db' },
  app: { collection: { toolbar: { environmentSelector: { hoverBorder: '#60a5fa' } } } },
  text: '#f9fafb'
};

const item = {
  uid: 'req-1',
  type: 'http-request',
  name: 'Delete User',
  request: {
    method: 'DELETE',
    url: 'https://api.example.com/v1/users/42',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer test-token'
    }
  },
  response: {
    statusCode: 404,
    statusText: 'Not Found',
    headers: { 'content-type': 'application/json' },
    data: { error: 'USER_NOT_FOUND' }
  }
};

describe('ResponsePaneActions', () => {
  beforeEach(() => {
    navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };
  });

  it('copies complete debug Markdown from the more-actions menu', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ResponsePaneActions
          item={item}
          collection={{ uid: 'col-1', name: 'Users API' }}
          selectedRequest={{
            itemUid: item.uid,
            collectionUid: 'col-1',
            data: {
              request: item.request,
              response: {
                ...item.response,
                timeline: [
                  { type: 'request', message: 'DELETE https://api.example.com/v1/users/42' },
                  { type: 'response', message: 'HTTP/1.1 404 Not Found' }
                ]
              }
            }
          }}
          responseSize={20}
          selectedFormat="raw"
          selectedTab="editor"
          data={item.response.data}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy for AI' }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    const copiedText = navigator.clipboard.writeText.mock.calls[0][0];
    expect(copiedText).toContain('# API Debug Context');
    expect(copiedText).toContain('# Request (cURL)');
    expect(copiedText).toContain('# Response');
    expect(copiedText).toContain('curl -X DELETE \'https://api.example.com/v1/users/42\'');
    expect(copiedText).toContain('- Authorization: Bearer test-token');
  });

  it('renders a Copy for AI action with the AI icon', () => {
    render(
      <ThemeProvider theme={theme}>
        <ResponsePaneActions
          item={item}
          collection={{ uid: 'col-1', name: 'Users API' }}
          responseSize={20}
          selectedFormat="raw"
          selectedTab="editor"
          data={item.response.data}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('menuitem', { name: 'Copy for AI' })).toBeInTheDocument();
    expect(screen.getByTestId('copy-for-ai-icon')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Copy as Markdown' })).not.toBeInTheDocument();
  });
});
