import { useMemo, useState } from 'react';
import { FiSearch, FiFilter, FiChevronUp, FiChevronDown, FiInbox } from 'react-icons/fi';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

/**
 * AdminTable — enterprise data table.
 *
 * Props:
 *  - title, description     : header content
 *  - columns                : Array<{ header, accessorKey, cell?, sortable?, headerClassName?, cellClassName? }>
 *  - data                   : array of rows
 *  - loading                : boolean
 *  - onRowClick             : (row) => void
 *  - searchPlaceholder      : string
 *  - searchValue            : controlled search input value
 *  - onSearchChange         : (value) => void
 *  - sortBy / sortOrder     : controlled sort state
 *  - onSortChange           : (key, order) => void
 *  - page / totalPages      : controlled pagination
 *  - onPageChange           : (page) => void
 *  - total                  : total record count (for footer)
 *  - filters                : ReactNode rendered next to search
 *  - renderActions          : ReactNode rendered on the right
 *  - emptyState             : ReactNode replacing the default empty cell
 *  - rowKey                 : function (row) => string  (defaults to _id || index)
 */
export const AdminTable = ({
  title,
  description,
  columns,
  data = [],
  loading = false,
  onRowClick,
  searchPlaceholder = 'Search records…',
  searchValue,
  onSearchChange,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  page = 1,
  totalPages = 1,
  onPageChange,
  total,
  filters,
  renderActions,
  emptyState,
  rowKey,
}) => {
  // Internal fallback for uncontrolled search (preserves old usage)
  const [localSearch, setLocalSearch] = useState('');
  const isControlledSearch = typeof searchValue === 'string';
  const search = isControlledSearch ? searchValue : localSearch;

  const filteredData = useMemo(() => {
    if (isControlledSearch || !search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const v = col.accessorKey ? row[col.accessorKey] : null;
        return v && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns, isControlledSearch]);

  const handleSearchChange = (e) => {
    if (isControlledSearch) onSearchChange?.(e.target.value);
    else setLocalSearch(e.target.value);
  };

  const handleSort = (col) => {
    if (!col.sortable || !onSortChange) return;
    const key = col.accessorKey || col.id;
    if (sortBy === key) {
      onSortChange(key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
  };

  const showingFrom = data.length === 0 ? 0 : (page - 1) * (data.length || 1) + 1;
  const showingTo = (page - 1) * (data.length || 1) + data.length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {(title || description) && (
          <div className="min-w-0">
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={14}
            />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            />
          </div>

          {filters || (
            <Button variant="outline" size="icon" className="hidden sm:inline-flex">
              <FiFilter className="w-4 h-4" />
            </Button>
          )}
          {typeof renderActions === 'function' ? renderActions() : renderActions}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800">
              {columns.map((col, index) => {
                const key = col.accessorKey || col.id;
                const isActive = sortBy === key;
                return (
                  <th
                    key={index}
                    scope="col"
                    onClick={() => handleSort(col)}
                    className={cn(
                      'px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap select-none',
                      col.sortable && 'cursor-pointer hover:text-gray-900 dark:hover:text-white',
                      col.headerClassName
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span className="flex flex-col opacity-60">
                          <FiChevronUp
                            size={10}
                            className={cn(
                              '-mb-0.5',
                              isActive && sortOrder === 'asc' && 'text-primary-500 opacity-100'
                            )}
                          />
                          <FiChevronDown
                            size={10}
                            className={cn(
                              isActive && sortOrder === 'desc' && 'text-primary-500 opacity-100'
                            )}
                          />
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-shimmer" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  {emptyState || (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <FiInbox size={32} />
                      <p className="text-sm font-medium">No records found</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr
                  key={rowKey ? rowKey(row) : row._id || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40'
                      : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/30'
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn('px-4 py-3.5 align-middle text-sm', col.cellClassName)}
                    >
                      {col.cell ? (
                        col.cell(row)
                      ) : (
                        <span className="text-gray-900 dark:text-white">{row[col.accessorKey]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      {(onPageChange || data.length > 0) && (
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {typeof total === 'number'
              ? `Showing ${showingFrom}–${showingTo} of ${total} records`
              : `${data.length} record${data.length === 1 ? '' : 's'}`}
          </span>
          {onPageChange && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-600 dark:text-gray-400 px-2 font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTable;
