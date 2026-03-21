const SUPABASE_URL = 'https://vtgiwjxvjumnrbdkeyzd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0Z2l3anh2anVtbnJiZGtleXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDMyMjcsImV4cCI6MjA4OTY3OTIyN30.CpeYp_AD1z9xYs9Y085aNfAawBmLaHF-gPl884TWF2w';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── PRODUCTS ────────────────────────────────────────
async function getProducts() {
  const { data, error } = await sb.from('products').select('*').order('id');
  if (error) { console.error('getProducts error:', error); return null; }
  return data;
}

async function addProduct(product) {
  const { data, error } = await sb.from('products').insert([{
    name: product.name,
    price: product.price,
    unit: product.unit || 'pc',
    category: product.category || 'fried',
    options: product.options || ['None'],
    available: product.available !== false,
    img: product.img || ''
  }]).select();
  if (error) { console.error('addProduct error:', error); return null; }
  return data[0];
}

async function updateProduct(id, updates) {
  const { error } = await sb.from('products').update(updates).eq('id', id);
  if (error) { console.error('updateProduct error:', error); return false; }
  return true;
}

async function deleteProduct(id) {
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) { console.error('deleteProduct error:', error); return false; }
  return true;
}

async function toggleProduct(id, available) {
  const { error } = await sb.from('products').update({ available }).eq('id', id);
  if (error) { console.error('toggleProduct error:', error); return false; }
  return true;
}

// ─── ORDERS ──────────────────────────────────────────
async function saveOrder(order) {
  const subtotal = Object.entries(order.items || {}).reduce((sum, [key, qty]) => {
    return sum + ((order._products?.find(p => String(p.id) === String(key))?.price || 0) * qty);
  }, 0);
  const fee = order.orderType === 'delivery'
    ? parseFloat(await getDeliveryFee())
    : 0;

  const { error } = await sb.from('orders').insert([{
    id: order.id,
    name: order.name,
    phone: order.phone,
    barangay: order.barangay || '',
    landmark: order.landmark || '',
    order_type: order.orderType,
    payment_method: order.paymentMethod,
    items: order.items,
    status: order.status || 'pending',
    note: order.note || '',
    total: subtotal + fee,
    timestamp: order.timestamp || new Date().toISOString()
  }]);
  if (error) { console.error('saveOrder error:', error); return false; }
  return true;
}

async function getOrders() {
  const { data, error } = await sb.from('orders').select('*').order('timestamp', { ascending: false });
  if (error) { console.error('getOrders error:', error); return []; }
  return data.map(o => ({
    ...o,
    orderType: o.order_type,
    paymentMethod: o.payment_method,
  }));
}

async function updateOrderStatus(id, status) {
  const { error } = await sb.from('orders').update({ status }).eq('id', id);
  if (error) { console.error('updateOrderStatus error:', error); return false; }
  return true;
}

// ─── SETTINGS ────────────────────────────────────────
async function getDeliveryFee() {
  const { data, error } = await sb.from('settings').select('value').eq('key', 'delivery_fee').single();
  if (error) { return '20'; }
  return data.value;
}

async function saveDeliveryFee(fee) {
  const { error } = await sb.from('settings').upsert({ key: 'delivery_fee', value: String(fee) });
  if (error) { console.error('saveDeliveryFee error:', error); return false; }
  return true;
}