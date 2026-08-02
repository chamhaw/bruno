import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Headers from './index';

jest.mock('components/CodeEditor', () => ({ value, readOnly, mode, theme, onEdit }) => (
  <textarea
    data-testid="timeline-code-editor"
    value={value}
    readOnly={readOnly}
    data-mode={mode}
    data-theme={theme}
    data-has-on-edit={onEdit ? 'true' : undefined}
    onChange={onEdit}
  />
));

jest.mock('providers/Theme', () => ({ useTheme: () => ({ storedTheme: 'system', displayedTheme: 'dark' }) }));

describe('Timeline Headers', () => {
  it('defaults to the Key/Value table and switches to readonly Bulk text', () => {
    render(
      <Headers
        type="request"
        headers={[
          { name: 'content-type', value: 'application/json; charset=utf-8' },
          { name: 'X-Request', value: 'request-value' }
        ]}
      />
    );

    expect(screen.queryByTestId('timeline-code-editor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bulk' })).toBeInTheDocument();
    expect(screen.getByText('content-type')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bulk' }));

    const editor = screen.getByTestId('timeline-code-editor');
    expect(editor).toHaveAttribute('readonly');
    expect(editor).toHaveAttribute('data-mode', 'text/plain');
    expect(editor).toHaveAttribute('data-theme', 'dark');
    expect(editor).not.toHaveAttribute('data-has-on-edit');
    expect(editor).toHaveValue('content-type:application/json; charset=utf-8\nX-Request:request-value');
    expect(screen.getByTestId('request-headers-view-toggle')).toHaveTextContent('Key/Value');
    expect(screen.queryByRole('button', { name: 'Bulk' })).not.toBeInTheDocument();
    expect(screen.queryByText('Key/Value Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Bulk Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Key-Value')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Key/Value' }));
    expect(screen.queryByTestId('timeline-code-editor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bulk' })).toBeInTheDocument();
  });

  it('switches response headers independently and returns to Bulk', () => {
    render(<Headers type="response" headers={{ 'X-Response': 'response-value' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bulk' }));

    expect(screen.getByTestId('timeline-code-editor')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('response-headers-view-toggle'));
    expect(screen.queryByTestId('timeline-code-editor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bulk' })).toBeInTheDocument();
  });

  it('keeps request and response view modes independent', () => {
    render(
      <>
        <Headers type="request" headers={{ Request: 'one' }} />
        <Headers type="response" headers={{ Response: 'two' }} />
      </>
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Bulk' })[0]);

    expect(screen.getAllByTestId('timeline-code-editor')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Key/Value' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Bulk' })).toHaveLength(1);
    expect(screen.queryByText('Key/Value Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Bulk Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Key-Value')).not.toBeInTheDocument();
  });
});
