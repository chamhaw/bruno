/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn()
}));

jest.mock('providers/Theme', () => ({
  useTheme: () => ({ theme: { examples: { buttonIconColor: '#000' } } })
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateResponseExampleName: jest.fn(),
  updateResponseExampleDescription: jest.fn()
}));

jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick, ...props }) => <button type="button" onClick={onClick} {...props}>{children}</button>);
jest.mock('ui/MenuDropdown', () => ({ children, items }) => (
  <div>
    {children}
    {items.map((item) => <button key={item.id} type="button" data-testid={item.testId} onClick={item.onClick}>{item.label}</button>)}
  </div>
));

import ResponseExampleTopBar from './index';

const collection = { uid: 'collection-1' };
const makeItem = (type = 'http-request', exampleType = 'http-request') => ({
  uid: 'request-1',
  type,
  name: 'Create user',
  draft: { examples: [{ uid: 'example-1', name: 'Created user', description: '', type: exampleType }] }
});

describe('ResponseExampleTopBar', () => {
  it('offers Use in Request only for an HTTP example outside edit mode', () => {
    const onTryExample = jest.fn();
    const onUseAndSend = jest.fn();
    const { rerender } = render(
      <ResponseExampleTopBar
        item={makeItem()}
        collection={collection}
        exampleUid="example-1"
        editMode={false}
        onEditToggle={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onGenerateCode={jest.fn()}
        onTryExample={onTryExample}
        onUseAndSend={onUseAndSend}
      />
    );

    fireEvent.click(screen.getByTestId('response-example-use-in-request-btn'));
    expect(onTryExample).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('response-example-use-and-send-btn')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('response-example-use-and-send-option'));
    expect(onUseAndSend).toHaveBeenCalledTimes(1);

    rerender(
      <ResponseExampleTopBar
        item={makeItem('grpc-request')}
        collection={collection}
        exampleUid="example-1"
        editMode={false}
        onEditToggle={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onGenerateCode={jest.fn()}
        onTryExample={onTryExample}
        onUseAndSend={onUseAndSend}
      />
    );
    expect(screen.queryByTestId('response-example-use-in-request-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('response-example-use-and-send-option')).not.toBeInTheDocument();

    rerender(
      <ResponseExampleTopBar
        item={makeItem('http-request', 'grpc-request')}
        collection={collection}
        exampleUid="example-1"
        editMode={false}
        onEditToggle={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onGenerateCode={jest.fn()}
        onTryExample={onTryExample}
        onUseAndSend={onUseAndSend}
      />
    );
    expect(screen.queryByTestId('response-example-use-in-request-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('response-example-use-and-send-option')).not.toBeInTheDocument();

    rerender(
      <ResponseExampleTopBar
        item={makeItem()}
        collection={collection}
        exampleUid="example-1"
        editMode
        onEditToggle={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onGenerateCode={jest.fn()}
        onTryExample={onTryExample}
        onUseAndSend={onUseAndSend}
      />
    );
    expect(screen.queryByTestId('response-example-use-in-request-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('response-example-use-and-send-option')).not.toBeInTheDocument();
  });
});
