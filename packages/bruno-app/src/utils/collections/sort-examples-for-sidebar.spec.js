const { describe, it, expect } = require('@jest/globals');
import { sortExamplesForSidebar } from './index';

const examples = [
  { uid: 'a', name: 'Banana' },
  { uid: 'b', name: 'apple' },
  { uid: 'c', name: 'Cherry' }
];

describe('sortExamplesForSidebar', () => {
  it('sorts examples A-Z for alphabetical order', () => {
    const result = sortExamplesForSidebar(examples, 'alphabetical');
    expect(result.map((e) => e.name)).toEqual(['apple', 'Banana', 'Cherry']);
  });

  it('sorts examples Z-A for reverseAlphabetical order', () => {
    const result = sortExamplesForSidebar(examples, 'reverseAlphabetical');
    expect(result.map((e) => e.name)).toEqual(['Cherry', 'Banana', 'apple']);
  });

  it('keeps the original order for default order', () => {
    const result = sortExamplesForSidebar(examples, 'default');
    expect(result.map((e) => e.name)).toEqual(['Banana', 'apple', 'Cherry']);
  });

  it('returns an empty array for empty or missing examples', () => {
    expect(sortExamplesForSidebar([], 'alphabetical')).toEqual([]);
    expect(sortExamplesForSidebar(undefined, 'alphabetical')).toEqual([]);
  });

  it('sorts numeric names naturally (file-2 before file-10)', () => {
    const result = sortExamplesForSidebar(
      [
        { uid: 'a', name: 'Example 10' },
        { uid: 'b', name: 'Example 2' }
      ],
      'alphabetical'
    );
    expect(result.map((e) => e.name)).toEqual(['Example 2', 'Example 10']);
  });

  it('treats a missing name as an empty string', () => {
    const result = sortExamplesForSidebar(
      [
        { uid: 'a', name: 'Beta' },
        { uid: 'b' }
      ],
      'alphabetical'
    );
    expect(result.map((e) => e.name)).toEqual([undefined, 'Beta']);
  });

  it('does not mutate the input array', () => {
    const input = [...examples].reverse();
    sortExamplesForSidebar(input, 'alphabetical');
    expect(input.map((e) => e.name)).toEqual(['Cherry', 'apple', 'Banana']);
  });
});
