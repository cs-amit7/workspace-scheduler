import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FilterBar from './FilterBar.jsx';

/**
 * Helper component to display current URL search params in tests
 */
function SearchParamsDisplay() {
  const location = useLocation();
  return <div data-testid="current-search">{location.search}</div>;
}

describe('FilterBar Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all controls with visible labels', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <FilterBar />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Min Capacity')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByText('Amenities')).toBeInTheDocument();
    expect(screen.getByLabelText('WiFi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('writes the right query-string values and resets page to 1 on filter changes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/?page=3']}>
        <FilterBar />
        <SearchParamsDisplay />
      </MemoryRouter>
    );

    expect(screen.getByTestId('current-search')).toHaveTextContent('?page=3');

    // 1. Change type to Room
    const typeSelect = screen.getByLabelText('Type');
    await user.selectOptions(typeSelect, 'room');

    // Should set type=room and remove page
    expect(screen.getByTestId('current-search')).toHaveTextContent('type=room');
    expect(screen.getByTestId('current-search').textContent).not.toContain('page=');

    // 2. Change min capacity
    const capacityInput = screen.getByLabelText('Min Capacity');
    await user.type(capacityInput, '4');
    expect(screen.getByTestId('current-search')).toHaveTextContent('minCapacity=4');

    // 3. Toggle amenities
    const wifiCheckbox = screen.getByLabelText('WiFi');
    await user.click(wifiCheckbox);
    expect(screen.getByTestId('current-search')).toHaveTextContent('amenity=WiFi');

    const projectorCheckbox = screen.getByLabelText('Projector');
    await user.click(projectorCheckbox);
    expect(screen.getByTestId('current-search')).toHaveTextContent('amenity=WiFi');
    expect(screen.getByTestId('current-search')).toHaveTextContent('amenity=Projector');
  });

  it('debounces text search input by 300 ms', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/?page=2']}>
        <FilterBar />
        <SearchParamsDisplay />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText('Search');

    // Type into search input
    fireEvent.change(searchInput, { target: { value: 'Orion' } });

    // Advance 200ms - query shouldn't have updated yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('current-search')).not.toHaveTextContent('q=Orion');

    // Advance 150ms more (total 350ms > 300ms)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByTestId('current-search')).toHaveTextContent('q=Orion');
    expect(screen.getByTestId('current-search')).not.toHaveTextContent('page=');
  });

  it('shows an inline error message when only some availability inputs are filled', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <FilterBar />
        <SearchParamsDisplay />
      </MemoryRouter>
    );

    // Initially no error
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Fill date only
    const dateInput = screen.getByLabelText('Date');
    await user.type(dateInput, '2026-10-05');

    // Inline error appears
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Date, start time, and end time are all required.');

    // Fill From time only
    const fromInput = screen.getByLabelText('From');
    await user.type(fromInput, '10:00');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Date, start time, and end time are all required.'
    );

    // Fill To time where From < To
    const toInput = screen.getByLabelText('To');
    await user.type(toInput, '11:00');

    // Once all three are valid, error disappears
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an inline error when from time is not earlier than to time', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/?date=2026-10-05&from=14:00&to=12:00']}>
        <FilterBar />
      </MemoryRouter>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Start time must be earlier than end time.');

    // Equal times also triggers error
    const toInput = screen.getByLabelText('To');
    await user.clear(toInput);
    await user.type(toInput, '14:00');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Start time must be earlier than end time.'
    );
  });

  it('resets everything when "Clear filters" is clicked', async () => {
    const user = userEvent.setup();
    const onClearMock = vi.fn();

    render(
      <MemoryRouter
        initialEntries={[
          '/?type=room&minCapacity=4&amenity=WiFi&q=test&date=2026-10-05&from=10:00&to=11:00&page=2',
        ]}
      >
        <FilterBar onClear={onClearMock} />
        <SearchParamsDisplay />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Type')).toHaveValue('room');
    expect(screen.getByLabelText('Min Capacity')).toHaveValue(4);
    expect(screen.getByLabelText('WiFi')).toBeChecked();

    const clearBtn = screen.getByRole('button', { name: 'Clear filters' });
    await user.click(clearBtn);

    expect(screen.getByTestId('current-search')).toHaveTextContent('');
    expect(screen.getByLabelText('Type')).toHaveValue('');
    expect(screen.getByLabelText('Min Capacity')).toHaveValue(null);
    expect(screen.getByLabelText('WiFi')).not.toBeChecked();
    expect(onClearMock).toHaveBeenCalled();
  });
});
