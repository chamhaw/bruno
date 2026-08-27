/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockDispatch = jest.fn();
const mockUseResponseExampleInRequest = jest.fn((payload) => () => ({ applied: true, payload }));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => null
}));

jest.mock('providers/ReduxStore/slices/tabs', () => ({
  addTab: jest.fn(),
  makeTabPermanent: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateResponseExample: jest.fn(),
  cloneResponseExample: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveRequest: jest.fn(),
  useResponseExampleInRequest: (payload) => mockUseResponseExampleInRequest(payload)
}));

jest.mock('providers/ReduxStore/slices/app', () => ({ insertTaskIntoQueue: jest.fn() }));
jest.mock('components/Sidebar/SidebarAccordionContext', () => ({ useSidebarAccordion: () => ({ dropdownContainerRef: { current: null } }) }));
jest.mock('ui/MenuDropdown', () => ({ items }) => (
  <div>{items.filter((item) => item.type !== 'divider').map((item) => <button key={item.id} data-testid={item.testId} onClick={item.onClick}>{item.label}</button>)}</div>
));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('./StyledWrapper', () => {
  const mockReact = require('react');
  return mockReact.forwardRef(({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>);
});
jest.mock('components/Icons/ExampleIcon', () => () => <span />);
jest.mock('ui/ActionIcon', () => () => <span />);
jest.mock('components/Modal', () => () => <div />);
jest.mock('./DeleteResponseExampleModal', () => () => <div />);
jest.mock('../GenerateCodeItem', () => () => <div />);

import ExampleItem from './index';

const collection = { uid: 'collection-1' };
const example = { uid: 'example-1', type: 'http-request', name: 'Created user', request: {} };
const item = { uid: 'request-1', type: 'http-request', name: 'Create user', depth: 1, pathname: '/requests/create-user.bru', examples: [example] };

describe('ExampleItem', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockUseResponseExampleInRequest.mockClear();
    mockDispatch.mockImplementation((action) => (typeof action === 'function' ? action(mockDispatch) : action));
  });

  it('adds Try to an HTTP example context menu only', () => {
    const { rerender } = render(<ExampleItem item={item} collection={collection} example={example} />);

    expect(screen.getByTestId('response-example-try-option')).toHaveTextContent('Try');

    fireEvent.click(screen.getByTestId('response-example-try-option'));
    expect(mockUseResponseExampleInRequest).toHaveBeenCalledWith({
      itemUid: 'request-1',
      collectionUid: 'collection-1',
      exampleUid: 'example-1'
    });

    rerender(<ExampleItem item={{ ...item, type: 'grpc-request' }} collection={collection} example={example} />);

    expect(screen.queryByTestId('response-example-try-option')).not.toBeInTheDocument();
  });
});
