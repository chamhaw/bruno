import React, { useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import CodeEditor from 'components/CodeEditor';
import { serializeBulkKeyValue } from 'utils/common/bulkKeyValueUtils';

const toEntries = (headers) => {
  if (!headers) return [];
  if (Array.isArray(headers)) {
    return headers.map((h, index) => ({
      uid: h?.uid || `header-${index}`,
      name: h?.name ?? h?.key ?? '',
      value: h?.value,
      enabled: h?.enabled !== false
    }));
  }
  return Object.entries(headers).map(([name, value], index) => ({
    uid: `header-${index}`,
    name,
    value,
    enabled: true
  }));
};

const stringifyHeaderValue = (value) => {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
};

const Headers = ({ headers, type }) => {
  const { displayedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(true);
  const [viewMode, setViewMode] = useState('key-value');
  const entries = toEntries(headers);
  const count = entries.length;
  const tableRows = useMemo(() => entries.map((entry) => ({
    ...entry,
    value: stringifyHeaderValue(entry.value)
  })), [entries]);

  const bulkText = useMemo(() => serializeBulkKeyValue(tableRows), [tableRows]);

  const bulkViewer = (
    <div className="tl-headers-bulk-viewer">
      <div className="h-[200px]">
        <CodeEditor
          mode="text/plain"
          theme={displayedTheme}
          value={bulkText}
          readOnly={true}
        />
      </div>
    </div>
  );

  const nextViewLabel = viewMode === 'key-value' ? 'Bulk' : 'Key/Value';

  return (
    <div className="tl-block">
      <div className="tl-block-h flex items-center">
        <button
          type="button"
          className="flex items-center flex-1 text-left"
          aria-expanded={isOpen}
          data-testid={`${type}-headers-toggle`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="tl-block-chev">
            {isOpen ? <IconChevronDown size={12} strokeWidth={2} /> : <IconChevronRight size={12} strokeWidth={2} />}
          </span>
          Headers
          <span className="tl-block-count">({count})</span>
        </button>
        <div className="flex items-center gap-1 mr-2" role="group" aria-label={`${type} headers view mode`}>
          <button
            type="button"
            className="btn-action text-link select-none"
            data-testid={`${type}-headers-view-toggle`}
            onClick={() => setViewMode(viewMode === 'key-value' ? 'bulk' : 'key-value')}
          >
            {nextViewLabel}
          </button>
        </div>
      </div>
      {isOpen && (
        count === 0
          ? <div className="tl-empty">No Headers</div>
          : viewMode === 'bulk' ? bulkViewer : (
            <table className="tl-headers-table">
              <tbody>
                {entries.map((h, i) => (
                  <tr key={i}>
                    <td className="tl-headers-key">{h.name}</td>
                    <td className="tl-headers-val">{String(h.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      )}
    </div>
  );
};

export default Headers;
