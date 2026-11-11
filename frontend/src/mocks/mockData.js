// TEMPORARY MOCKS, replace with API calls
// Demo data for the screens that are not connected to the backend yet.

export const mockProducts = [
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000001',
    title: 'Бездротові навушники',
    description: 'Шумозаглушення, 30 годин роботи',
    category: 'Електроніка',
    category_slug: 'electronics',
    price: 4500,
    image_url: null,
  },
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000002',
    title: 'Кросівки для бігу',
    description: 'Легка амортизація',
    category: 'Одяг',
    category_slug: 'clothing',
    price: 3900,
    image_url: null,
  },
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000003',
    title: 'Механічна клавіатура',
    description: 'RGB-підсвітка, червоні перемикачі',
    category: 'Електроніка',
    category_slug: 'electronics',
    price: 3200,
    image_url: null,
  },
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000004',
    title: 'Настільна лампа',
    description: 'Регульована яскравість',
    category: 'Дім',
    category_slug: 'home',
    price: 900,
    image_url: null,
  },
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000005',
    title: 'Рюкзак для ноутбука',
    description: 'Водостійкий, 25 літрів',
    category: 'Аксесуари',
    category_slug: 'accessories',
    price: 1800,
    image_url: null,
  },
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000006',
    title: 'Смарт-годинник',
    description: 'Пульсометр і GPS',
    category: 'Електроніка',
    category_slug: 'electronics',
    price: 6900,
    image_url: null,
  },
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000007',
    title: 'Термокружка',
    description: 'Тримає тепло 8 годин',
    category: 'Дім',
    category_slug: 'home',
    price: 450,
    image_url: null,
  },
  {
    id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000008',
    title: 'Худі оверсайз',
    description: '100% бавовна',
    category: 'Одяг',
    category_slug: 'clothing',
    price: 2100,
    image_url: null,
  },
]

// Newest first, one order per status
export const mockOrders = [
  {
    id: '9d4f6a2b-7c1e-4b3a-8f5d-000000001004',
    tracking_number: 'DS-7K2M9Q4XA1',
    total_price: 5700,
    status: 'CREATED',
    created_at: '2026-11-11T09:24:00Z',
    shipping_address: {
      full_name: 'Olena Kovalenko',
      line1: '12 Khreshchatyk St, apt 5',
      city: 'Kyiv',
      postal_code: '01001',
      country: 'Ukraine',
    },
    items: [
      { title: 'Кросівки для бігу', quantity: 1, price_at_purchase: 3900 },
      { title: 'Рюкзак для ноутбука', quantity: 1, price_at_purchase: 1800 },
    ],
  },
  {
    id: '9d4f6a2b-7c1e-4b3a-8f5d-000000001003',
    tracking_number: 'DS-3B8N5T1RZ6',
    total_price: 4100,
    status: 'PROCESSING',
    created_at: '2026-11-09T16:05:00Z',
    shipping_address: {
      full_name: 'Andrii Melnyk',
      line1: '7 Rynok Square',
      city: 'Lviv',
      postal_code: '79008',
      country: 'Ukraine',
    },
    items: [
      { title: 'Механічна клавіатура', quantity: 1, price_at_purchase: 3200 },
      { title: 'Настільна лампа', quantity: 1, price_at_purchase: 900 },
    ],
  },
  {
    id: '9d4f6a2b-7c1e-4b3a-8f5d-000000001002',
    tracking_number: 'DS-9F4H2W7LC3',
    total_price: 6600,
    status: 'IN_TRANSIT',
    created_at: '2026-11-06T11:40:00Z',
    shipping_address: {
      full_name: 'Iryna Bondar',
      line1: '21 Derybasivska St',
      city: 'Odesa',
      postal_code: '65026',
      country: 'Ukraine',
    },
    items: [
      { title: 'Бездротові навушники', quantity: 1, price_at_purchase: 4500 },
      { title: 'Худі оверсайз', quantity: 1, price_at_purchase: 2100 },
    ],
  },
  {
    id: '9d4f6a2b-7c1e-4b3a-8f5d-000000001001',
    tracking_number: 'DS-5P8V3J6YD2',
    total_price: 7800,
    status: 'DELIVERED',
    created_at: '2026-10-20T14:32:00Z',
    shipping_address: {
      full_name: 'Maksym Shevchenko',
      line1: '3 Sumska St, apt 12',
      city: 'Kharkiv',
      postal_code: '61057',
      country: 'Ukraine',
    },
    items: [
      { title: 'Смарт-годинник', quantity: 1, price_at_purchase: 6900 },
      { title: 'Термокружка', quantity: 2, price_at_purchase: 450 },
    ],
  },
]

// Daily saved DP for the last 30 days, oldest first (the last day is 11 Nov 2026)
const DAILY_AMOUNTS = [
  0, 3200, 0, 0, 900, 0, 0, 7800, 0, 1800, 0, 0, 450, 0, 2100, 0, 0, 3900, 0, 0, 4500, 0, 900,
  0, 6600, 0, 0, 4100, 0, 5700,
]
const LAST_DAY = Date.UTC(2026, 10, 11)
const DAY_MS = 24 * 60 * 60 * 1000

function sum(numbers) {
  return numbers.reduce((total, number) => total + number, 0)
}

const purchases = DAILY_AMOUNTS.filter((amount) => amount > 0)

export const mockSavings = {
  total_saved_amount: sum(DAILY_AMOUNTS),
  transactions_count: purchases.length,
  average_order: Math.round(sum(purchases) / purchases.length),
  largest_order: Math.max(...purchases),
  by_category: [
    { name: 'Електроніка', amount: 21800 },
    { name: 'Одяг', amount: 9900 },
    { name: 'Дім', amount: 5250 },
    { name: 'Аксесуари', amount: 5000 },
  ],
  daily: DAILY_AMOUNTS.map((amount, index) => ({
    date: new Date(LAST_DAY - (DAILY_AMOUNTS.length - 1 - index) * DAY_MS)
      .toISOString()
      .slice(0, 10),
    amount,
  })),
  last_week_total: sum(DAILY_AMOUNTS.slice(-7)),
  previous_week_total: sum(DAILY_AMOUNTS.slice(-14, -7)),
}

// Newest first
export const mockLogs = [
  {
    timestamp: '2026-11-11T09:24:13Z',
    user_email: 'olena.k@example.com',
    action_type: 'ORDER_CREATED',
    ip_address: '93.170.44.12',
    payload: { order_id: '9d4f6a2b-7c1e-4b3a-8f5d-000000001004', tracking_number: 'DS-7K2M9Q4XA1', total_price: 5700 },
  },
  {
    timestamp: '2026-11-11T09:20:02Z',
    user_email: 'olena.k@example.com',
    action_type: 'USER_LOGIN',
    ip_address: '93.170.44.12',
    payload: { user_agent: 'Chrome 131 / Windows' },
  },
  {
    timestamp: '2026-11-10T18:47:31Z',
    user_email: 'admin@example.com',
    action_type: 'PRODUCT_DEACTIVATED',
    ip_address: '10.0.0.5',
    payload: { product_id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000007', title: 'Термокружка' },
  },
  {
    timestamp: '2026-11-10T18:45:09Z',
    user_email: 'admin@example.com',
    action_type: 'PRODUCT_UPDATED',
    ip_address: '10.0.0.5',
    payload: {
      product_id: '5b2e8c4a-1f3d-4a6b-9c7e-000000000006',
      changes: { price: { from: 6500, to: 6900 } },
    },
  },
  {
    timestamp: '2026-11-10T18:40:55Z',
    user_email: 'admin@example.com',
    action_type: 'PRODUCT_CREATED',
    ip_address: '10.0.0.5',
    payload: { title: 'Худі оверсайз', price: 2100, category: 'clothing' },
  },
  {
    timestamp: '2026-11-09T16:05:44Z',
    user_email: 'andrii.m@example.com',
    action_type: 'ORDER_CREATED',
    ip_address: '178.150.3.87',
    payload: { order_id: '9d4f6a2b-7c1e-4b3a-8f5d-000000001003', tracking_number: 'DS-3B8N5T1RZ6', total_price: 4100 },
  },
  {
    timestamp: '2026-11-09T15:58:12Z',
    user_email: 'andrii.m@example.com',
    action_type: 'USER_LOGIN',
    ip_address: '178.150.3.87',
    payload: { user_agent: 'Safari 18 / iOS' },
  },
  {
    timestamp: '2026-11-08T12:30:00Z',
    user_email: 'iryna.b@example.com',
    action_type: 'BALANCE_RESET',
    ip_address: '46.211.90.14',
    payload: { from: 3150, to: 100000 },
  },
  {
    timestamp: '2026-11-06T11:40:27Z',
    user_email: 'iryna.b@example.com',
    action_type: 'ORDER_CREATED',
    ip_address: '46.211.90.14',
    payload: { order_id: '9d4f6a2b-7c1e-4b3a-8f5d-000000001002', tracking_number: 'DS-9F4H2W7LC3', total_price: 6600 },
  },
  {
    timestamp: '2026-11-06T11:31:50Z',
    user_email: 'iryna.b@example.com',
    action_type: 'USER_LOGIN',
    ip_address: '46.211.90.14',
    payload: { user_agent: 'Firefox 132 / Android' },
  },
  {
    timestamp: '2026-11-05T08:12:04Z',
    user_email: 'iryna.b@example.com',
    action_type: 'USER_REGISTERED',
    ip_address: '46.211.90.14',
    payload: { role: 'client', virtual_balance: 100000 },
  },
  {
    timestamp: '2026-11-02T20:03:39Z',
    user_email: 'taras.p@example.com',
    action_type: 'USER_REGISTERED',
    ip_address: '91.196.176.40',
    payload: { role: 'client', virtual_balance: 100000 },
  },
]

export const mockAdminStats = {
  users_count: 128,
  orders_count: 342,
  total_volume: 1254300,
  orders_by_status: { CREATED: 18, PROCESSING: 34, IN_TRANSIT: 57, DELIVERED: 233 },
  top_products: [
    { title: 'Смарт-годинник', sold: 64, revenue: 441600 },
    { title: 'Бездротові навушники', sold: 58, revenue: 261000 },
    { title: 'Кросівки для бігу', sold: 47, revenue: 183300 },
    { title: 'Механічна клавіатура', sold: 41, revenue: 131200 },
    { title: 'Худі оверсайз', sold: 39, revenue: 81900 },
  ],
}

// The API does not return a registration date yet
export const mockProfile = {
  registered_at: '2026-09-02T09:15:00Z',
}
