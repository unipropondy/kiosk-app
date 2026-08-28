import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import App from './App';
import SettlementSuccess from './SettlementSuccess';

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (String(url).includes('/api/app-settings')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, enableLogin: 0 }),
      });
    }

    if (String(url).includes('/api/company/settings')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ ServiceChargePercentage: 0, GSTPercentage: 0 }),
      });
    }

    if (String(url).includes('/api/paymodes/qrs')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ paynow: '', upi: '' }),
      });
    }

    if (String(url).includes('/api/kitchens')) {
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => [],
    });
  });
});

afterEach(() => {
  global.fetch.mockRestore();
});

test('shows the login page on first load when the user is not logged in', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );

  expect((await screen.findAllByText(/Sign In/i)).length).toBeGreaterThan(0);
});

test('shows a theme color picker in the settings modal', async () => {
  localStorage.setItem('isLoggedIn', 'true');
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByTitle(/Appearance Settings/i));

  expect(await screen.findByText(/Theme Color/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^Theme color$/i)).toBeInTheDocument();
});

test('shows only the last four digits of the order number on the confirmation screen', async () => {
  global.fetch.mockImplementation((url) => {
    if (String(url).includes('/api/order/order-details/')) {
      return Promise.resolve({
        ok: true,
        json: async () => [{ OrderNumber: '20240008209', Tableno: '2' }],
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => [],
    });
  });

  render(
    <MemoryRouter initialEntries={['/settlement-success?tableId=abc&table=2&orderId=123']}>
      <Routes>
        <Route path="/settlement-success" element={<SettlementSuccess />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText(/Order No:/i)).toBeInTheDocument();
  expect(await screen.findByText('8209')).toBeInTheDocument();
  expect(screen.queryByText(/20240008209/i)).not.toBeInTheDocument();
});
