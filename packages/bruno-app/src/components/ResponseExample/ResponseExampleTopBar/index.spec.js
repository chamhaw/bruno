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
import ResponseExampleTopBar from './index';

const collection = { uid: 'collection-1' };
const makeItem = (type = 'http-request', exampleType = 'http-request') => ({
  uid: 'request-1',
  type,
  name: 'Create user',
  draft: { examples: [{ uid: 'example-1', name: 'Created user', description: '', type: exampleType }] }
});

describe('ResponseExampleTopBar', () => {
  it('offers a single side-effect-free Try action for an HTTP example outside edit mode', () => {
    const onTryExample = jest.fn();
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
      />
    );

    expect(screen.getByTestId('response-example-try-btn')).toHaveTextContent('Try');
    expect(screen.queryByText('Use & Send')).not.toBeInTheDocument();
    expect(screen.queryByTestId('response-example-use-actions-menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('response-example-try-btn'));
    expect(onTryExample).toHaveBeenCalledTimes(1);

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
      />
    );
    expect(screen.queryByTestId('response-example-try-btn')).not.toBeInTheDocument();

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
      />
    );
    expect(screen.queryByTestId('response-example-try-btn')).not.toBeInTheDocument();

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
      />
    );
    expect(screen.queryByTestId('response-example-try-btn')).not.toBeInTheDocument();
  });
});
