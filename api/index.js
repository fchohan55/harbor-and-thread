/**
 * Harbor & Thread — Vercel Serverless API Function
 * Handles all /api/* routes on Vercel Serverless environment
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Vercel serverless functions have a writable /tmp directory
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

// Database configuration
const DB_PASSWORD = process.env.DB_PASSWORD || '@8Ve4C-9!xcuRua';
const DB_HOST = process.env.DB_HOST || 'db.nyjtsnwlnrmgiqladvsa.supabase.co';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_NAME = process.env.DB_NAME || 'postgres';

const DB_CONNECTION_STRING = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

function readJsonFile(filename, defaultVal = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      return defaultVal;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return defaultVal;
  }
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

// Curated Fallback Products
const FALLBACK_PRODUCTS = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Beacon Denim Jeans',
    subtitle: 'Stonewashed Indigo',
    category: 'Clothing',
    price: 95.00,
    image_url: 'images/jeans.jpg',
    badge: 'NEW',
    is_trending: true,
    is_active: true,
    display_order: 1,
    description: '13.5 oz Japanese selvedge denim tailored with an authentic stonewashed fade.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Harbor Weekend Bag',
    subtitle: 'Premium Black',
    category: 'Accessories',
    price: 165.00,
    image_url: 'images/bag.jpg',
    badge: 'BESTSELLER',
    is_trending: true,
    is_active: true,
    display_order: 2,
    description: 'Weatherproof 1000D ballistic nylon with full-grain leather carry handles.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Commonwealth Watch',
    subtitle: 'Minimal Silver',
    category: 'Accessories',
    price: 220.00,
    image_url: 'images/watch.jpg',
    badge: 'PREMIUM',
    is_trending: true,
    is_active: true,
    display_order: 3,
    description: 'Surgical-grade 316L brushed stainless steel with scratch-resistant sapphire crystal.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    name: 'Back Bay Oversized Knit Polo',
    subtitle: 'Ivory Texture',
    category: 'Clothing',
    price: 145.00,
    image_url: 'images/shirt.jpg',
    badge: 'TRENDING',
    is_trending: true,
    is_active: true,
    display_order: 4,
    description: '100% Peruvian pima cotton waffle-knit with a relaxed dropped-shoulder silhouette.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    name: 'North End Outfit Set',
    subtitle: 'Camel / Cream',
    category: 'Clothing',
    price: 255.00,
    image_url: 'images/outfit.jpg',
    badge: 'LIMITED',
    is_trending: true,
    is_active: true,
    display_order: 5,
    description: 'Two-piece coordinated set featuring an unlined camel wool overshirt with pleated trousers.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000006',
    name: 'Seaport Sunglasses',
    subtitle: 'Amber Frame',
    category: 'Accessories',
    price: 130.00,
    image_url: 'images/sunglasses.jpg',
    badge: 'CURATED',
    is_trending: true,
    is_active: true,
    display_order: 6,
    description: 'Handcrafted Italian Mazzucchelli acetate in amber tortoiseshell with polarized Zeiss lenses.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000007',
    name: 'Beacon Leather Penny Loafers',
    subtitle: 'Chestnut Italian Calfskin',
    category: 'Footwear',
    price: 195.00,
    image_url: 'images/loafers.jpg',
    badge: 'NEW',
    is_trending: true,
    is_active: true,
    display_order: 7,
    description: 'Full-grain Italian calfskin with Goodyear-welted construction and stacked leather heel.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000008',
    name: 'Seaport Suede Chelsea Boots',
    subtitle: 'Espresso Weather-Resistant Suede',
    category: 'Footwear',
    price: 225.00,
    image_url: 'images/boots.jpg',
    badge: 'BESTSELLER',
    is_trending: true,
    is_active: true,
    display_order: 8,
    description: 'Supple espresso calf suede with weather-resistant finishing and lugged traction soles.'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000009',
    name: 'Commonwealth Low-Top Sneaker',
    subtitle: 'Pristine White Calfskin / Gum Sole',
    category: 'Footwear',
    price: 160.00,
    image_url: 'images/sneakers.jpg',
    badge: 'PREMIUM',
    is_trending: true,
    is_active: true,
    display_order: 9,
    description: 'Smooth Italian Nappa leather with soft off-white suede accents and natural gum cupsoles.'
  }
];

// 8 Distinct New Arrivals
const NEW_ARRIVALS_PRODUCTS = [
  {
    id: 'na-001',
    name: 'Somerset Double-Faced Wool Trench',
    subtitle: 'Camel Heritage Melange',
    category: 'Clothing',
    price: 385.00,
    image_url: 'images/outfit.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 1,
    description: 'Heavyweight 24 oz double-faced New England wool melange with genuine horn buttons.'
  },
  {
    id: 'na-002',
    name: 'Charles River Merino Turtleneck',
    subtitle: 'Oatmeal Heather Knit',
    category: 'Clothing',
    price: 175.00,
    image_url: 'images/shirt.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 2,
    description: 'Extra-fine 19.5 micron Zegna Baruffa Italian merino wool with a refined micro-rib neck.'
  },
  {
    id: 'na-003',
    name: 'Tremont Italian Suede Belt',
    subtitle: 'Espresso Brushed Suede',
    category: 'Accessories',
    price: 85.00,
    image_url: 'images/accessories.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 3,
    description: 'Full-grain Tuscan calf suede with bevelled edges and solid antique brass buckle.'
  },
  {
    id: 'na-004',
    name: 'Back Bay Flannel Pleated Trousers',
    subtitle: 'Charcoal Wool Flannel',
    category: 'Clothing',
    price: 165.00,
    image_url: 'images/jeans.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 4,
    description: 'Single forward pleats, side adjusters, and a graceful gentle taper cut from British wool flannel.'
  },
  {
    id: 'na-005',
    name: 'Beacon Hill Heritage Weekender',
    subtitle: 'Tan Waxed Canvas / Bridle Leather',
    category: 'Accessories',
    price: 240.00,
    image_url: 'images/bag.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 5,
    description: 'Rugged 18 oz water-resistant waxed cotton canvas trimmed with bridle leather.'
  },
  {
    id: 'na-006',
    name: 'Newbury Suede Chelsea Boots',
    subtitle: 'Snuff Brown Weatherproof Suede',
    category: 'Footwear',
    price: 225.00,
    image_url: 'images/boots.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 6,
    description: 'Scotchgard suede treatment with natural plantation crepe rubber outsoles and storm welts.'
  },
  {
    id: 'na-007',
    name: 'Copley Polarized Acetate Sunglasses',
    subtitle: 'Smoky Champagne Acetate',
    category: 'Accessories',
    price: 140.00,
    image_url: 'images/sunglasses.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 7,
    description: 'Custom sculpted champagne cellulose acetate frames paired with polarized Carl Zeiss optics.'
  },
  {
    id: 'na-008',
    name: 'Boston Maritime Automatic Watch',
    subtitle: 'Deep Navy Nautical Dial',
    category: 'Accessories',
    price: 295.00,
    image_url: 'images/watch.jpg',
    badge: 'NEW ARRIVAL',
    is_new_arrival: true,
    is_active: true,
    display_order: 8,
    description: 'Japanese automatic movement, deep Atlantic navy sunburst dial, and Horween leather strap.'
  }
];

const ALL_PRODUCTS = [...FALLBACK_PRODUCTS, ...NEW_ARRIVALS_PRODUCTS];

async function queryDb(sql, params = []) {
  const client = new Client({
    connectionString: DB_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const result = await client.query(sql, params);
    await client.end();
    return { success: true, rows: result.rows };
  } catch (err) {
    try { await client.end(); } catch (_) {}
    return { success: false, error: err.message };
  }
}

function sendConfirmationEmail({ to, type, data = {} }) {
  const emailId = 'em-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  let subject = '';
  let preview = '';
  let htmlBody = '';

  if (type === 'newsletter_welcome') {
    subject = 'Welcome to the Harbor & Thread Circle — Your 15% Private Invitation';
    preview = 'Welcome to Harbor & Thread Boston. Use VIP code HARBOR15 for 15% off your next purchase.';
    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f2ec; padding: 32px 24px; color: #181512; border-radius: 12px;">
        <h2 style="font-family: Georgia, serif; font-size: 24px; margin: 0; text-align: center;">Harbor &amp; Thread</h2>
        <div style="background: #ffffff; padding: 24px; border-radius: 10px; margin-top: 20px;">
          <h3 style="font-size: 18px; margin: 0 0 10px;">Welcome to the Circle</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #5a524b;">You're on our guest list for seasonal Boston style edits and private drops.</p>
          <div style="background: #f7f2ec; border: 1px dashed #9e6d46; padding: 16px; margin: 16px 0; text-align: center;">
            <strong style="font-size: 22px; color: #9e6d46;">HARBOR15</strong>
            <p style="font-size: 12px; margin: 4px 0 0; color: #756b63;">15% off your next purchase across all collections.</p>
          </div>
        </div>
      </div>
    `;
  } else if (type === 'order_confirmation') {
    const orderNumber = data.order_number || 'HT-2026-0000';
    subject = `Order Confirmed: ${orderNumber} — Harbor & Thread Boston`;
    preview = `Thank you for your order ${orderNumber}. Preparing shipment to ${data.shipping_city || 'Boston'}, MA.`;
    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f2ec; padding: 32px 24px; color: #181512; border-radius: 12px;">
        <h2 style="font-family: Georgia, serif; font-size: 24px; margin: 0; text-align: center;">Harbor &amp; Thread</h2>
        <div style="background: #ffffff; padding: 24px; border-radius: 10px; margin-top: 20px;">
          <strong style="color: #9e6d46;">${orderNumber}</strong>
          <h3 style="font-size: 18px; margin: 6px 0 12px;">Thank you for your order, ${data.customer_name || 'Customer'}!</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #5a524b;">Your Boston wardrobe pieces are being prepared for delivery.</p>
          <div style="border-top: 1px solid #eee; padding-top: 10px; margin-top: 14px;">
            <strong>Total: $${Number(data.total || 0).toFixed(2)}</strong>
          </div>
        </div>
      </div>
    `;
  } else {
    subject = 'Welcome to Your Harbor & Thread Account — Boston Member Portal';
    preview = 'Your customer account has been confirmed.';
    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f2ec; padding: 32px 24px; color: #181512; border-radius: 12px;">
        <h2 style="font-family: Georgia, serif; font-size: 24px; margin: 0; text-align: center;">Harbor &amp; Thread</h2>
        <div style="background: #ffffff; padding: 24px; border-radius: 10px; margin-top: 20px;">
          <h3 style="font-size: 18px; margin: 0 0 10px;">Your Customer Account is Ready</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #5a524b;">Sign in anytime to view order receipts and tracking.</p>
        </div>
      </div>
    `;
  }

  const emailRecord = {
    id: emailId,
    to,
    subject,
    type,
    preview,
    html: htmlBody,
    sent_at: new Date().toISOString(),
    order_number: data.order_number || null
  };

  const sentEmails = readJsonFile('sent_emails.json', []);
  sentEmails.unshift(emailRecord);
  writeJsonFile('sent_emails.json', sentEmails);

  // 1. Resend API Dispatch on Vercel
  if (process.env.RESEND_API_KEY) {
    try {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Harbor & Thread <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: htmlBody
        })
      }).catch(() => {});
    } catch (_) {}
  }

  return emailRecord;
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch (_) {}
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (_) { resolve({}); }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

// Vercel Serverless Handler Export
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
    res.statusCode = 204;
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let reqPath = parsedUrl.pathname;

  try {
    // 1. Health
    if (reqPath === '/api/health') {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'Harbor & Thread Vercel Serverless API',
        environment: IS_VERCEL ? 'vercel-production' : 'local',
        location: 'Boston, MA, USA',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Products
    if (reqPath === '/api/products' && req.method === 'GET') {
      const section = (parsedUrl.searchParams.get('section') || '').toLowerCase();
      let products = section === 'new-arrivals' ? [...NEW_ARRIVALS_PRODUCTS] : [...ALL_PRODUCTS];
      if (section === 'trending') products = [...FALLBACK_PRODUCTS];

      return sendJson(res, 200, { count: products.length, products });
    }

    // 3. Lookbook
    if (reqPath === '/api/lookbook' && req.method === 'GET') {
      return sendJson(res, 200, {
        looks: [
          {
            id: 'c0000000-0000-0000-0000-000000000001',
            title: 'Back Bay Minimal',
            description: 'Cream knitwear, camel tailoring, and relaxed structure for polished city days.',
            season: 'Fall / Winter 2026',
            image_url: 'images/outfit.jpg'
          },
          {
            id: 'c0000000-0000-0000-0000-000000000002',
            title: 'Beacon Hill Casual',
            description: 'Classic denim paired with elevated layers for effortless everyday styling.',
            season: 'Autumn Everyday',
            image_url: 'images/jeans.jpg'
          },
          {
            id: 'c0000000-0000-0000-0000-000000000003',
            title: 'Seaport Weekend',
            description: 'Clean accessories and practical luxury for an easy waterfront weekend edit.',
            season: 'Coastal Weekend',
            image_url: 'images/bag.jpg'
          }
        ]
      });
    }

    // 4. Feedback
    if (reqPath === '/api/feedback') {
      if (req.method === 'GET') {
        return sendJson(res, 200, {
          feedback: [
            { id: '1', name: 'Julian R.', rating: 5, feedback_type: 'Products', message: 'The quality of the wool knitwear exceeds expectations.', created_at: '2026-10-09T14:10:00Z' }
          ]
        });
      }
      if (req.method === 'POST') {
        const body = await parseBody(req);
        const name = (body.name || '').trim();
        const message = (body.message || '').trim();
        if (!name || message.length < 3) {
          return sendJson(res, 400, { error: 'Please include your name and a brief feedback message.' });
        }
        return sendJson(res, 201, {
          success: true,
          feedback: { id: 'fb-' + Date.now(), name, rating: body.rating || 5, message, created_at: new Date().toISOString() }
        });
      }
    }

    // 5. Newsletter
    if (reqPath === '/api/newsletter' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return sendJson(res, 400, { error: 'Please provide a valid email address.' });
      }

      const subscribers = readJsonFile('subscribers.json', []);
      if (!subscribers.some(s => s.email === email)) {
        subscribers.push({ email, subscribed_at: new Date().toISOString() });
        writeJsonFile('subscribers.json', subscribers);
      }

      const dispatchedEmail = sendConfirmationEmail({
        to: email,
        type: 'newsletter_welcome',
        data: { email }
      });

      return sendJson(res, 200, {
        success: true,
        message: "You're now part of the Harbor & Thread circle! A confirmation email has been sent to your inbox.",
        emailDispatched: true,
        emailPreview: dispatchedEmail
      });
    }

    // 6. Orders
    if (reqPath === '/api/orders') {
      if (req.method === 'POST') {
        const body = await parseBody(req);
        const customerName = (body.customerName || '').trim();
        const customerEmail = (body.customerEmail || '').trim().toLowerCase();
        const shippingAddress = (body.shippingAddress || '').trim();
        const shippingCity = (body.shippingCity || 'Boston').trim();
        const shippingState = (body.shippingState || 'MA').trim();
        const shippingZip = (body.shippingZip || '').trim();
        const items = Array.isArray(body.items) ? body.items : [];

        if (!customerName || !customerEmail.includes('@') || !shippingAddress || items.length === 0) {
          return sendJson(res, 400, { error: 'Please complete all required shipping fields and cart items.' });
        }

        let subtotal = 0;
        items.forEach(i => subtotal += (parseFloat(i.price) || 0) * (parseInt(i.quantity, 10) || 1));
        const tax = parseFloat((subtotal * 0.0625).toFixed(2));
        const shipping = subtotal >= 150 ? 0 : 12.00;
        const total = parseFloat((subtotal + tax + shipping).toFixed(2));

        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `HT-2026-${randomSuffix}`;

        const orderRecord = {
          order_number: orderNumber,
          customer_name: customerName,
          customer_email: customerEmail,
          shipping_address: shippingAddress,
          shipping_city: shippingCity,
          shipping_state: shippingState,
          shipping_zip: shippingZip,
          subtotal,
          tax,
          shipping,
          total,
          status: 'confirmed',
          items,
          is_guest: body.isGuest !== false,
          created_at: new Date().toISOString()
        };

        const ordersStore = readJsonFile('orders.json', []);
        ordersStore.unshift(orderRecord);
        writeJsonFile('orders.json', ordersStore);

        const dispatchedEmail = sendConfirmationEmail({
          to: customerEmail,
          type: 'order_confirmation',
          data: orderRecord
        });

        // Insert into Supabase public.orders via REST API
        const supabaseUrl = process.env.SUPABASE_URL || 'https://nyjtsnwlnrmgiqladvsa.supabase.co';
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_vJxuCCdiIRv2rEK1dgj1mA_0hnkx8E4';
        
        try {
          await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              order_number: orderNumber,
              customer_name: customerName,
              customer_email: customerEmail,
              shipping_address: shippingAddress,
              shipping_city: shippingCity,
              shipping_state: shippingState,
              shipping_zip: shippingZip,
              subtotal,
              tax,
              shipping,
              total,
              status: 'confirmed',
              items
            })
          });
        } catch (_) {}

        return sendJson(res, 201, {
          success: true,
          message: 'Your order has been confirmed! A receipt has been sent to your email.',
          order: orderRecord,
          emailDispatched: true,
          emailPreview: dispatchedEmail
        });
      }

      if (req.method === 'GET') {
        const email = (parsedUrl.searchParams.get('email') || '').trim().toLowerCase();
        const orderNum = (parsedUrl.searchParams.get('orderNumber') || '').trim().toUpperCase();
        const ordersStore = readJsonFile('orders.json', []);

        if (orderNum) {
          const found = ordersStore.find(o => o.order_number === orderNum);
          if (found) return sendJson(res, 200, { order: found });
          return sendJson(res, 404, { error: 'Order not found.' });
        }
        if (email) {
          const filtered = ordersStore.filter(o => o.customer_email.toLowerCase() === email);
          return sendJson(res, 200, { orders: filtered });
        }
        return sendJson(res, 200, { orders: ordersStore.slice(0, 20) });
      }
    }

    // 6.1 Dedicated Printable HTML Receipt Endpoint
    if (reqPath === '/api/orders/receipt' && req.method === 'GET') {
      const orderNum = (parsedUrl.searchParams.get('orderNumber') || '').trim().toUpperCase();
      const ordersStore = readJsonFile('orders.json', []);
      const found = orderNum ? ordersStore.find(o => o.order_number === orderNum) : ordersStore[0];

      if (!found) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`
          <!DOCTYPE html><html><body style="font-family:sans-serif; text-align:center; padding:50px; background:#f7f2ec;">
            <h2>Receipt Not Found</h2><p>Please check your order number or browse your account.</p>
            <a href="/account.html" style="color:#9e6d46;">Go to Account</a>
          </body></html>
        `);
      }

      const receiptEmail = sendConfirmationEmail({
        to: found.customer_email,
        type: 'order_confirmation',
        data: found
      });

      const fullReceiptPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt ${found.order_number} — Harbor &amp; Thread Boston</title>
          <link rel="stylesheet" href="/styles.css">
          <style>
            body { background: #f7f2ec; min-height: 100vh; padding: 40px 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .receipt-wrapper { max-width: 650px; width: 100%; box-shadow: 0 15px 40px rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden; background: #fff; }
            .receipt-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
            @media print {
              body { padding: 0; background: #fff; }
              .receipt-actions { display: none !important; }
              .receipt-wrapper { box-shadow: none; border: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            ${receiptEmail.html}
          </div>
          <div class="receipt-actions">
            <button onclick="window.print()" class="btn primary" style="padding: 10px 24px; font-size: 13px; border-radius: 999px; cursor: pointer; background: #181512; color: #fff; border: none;">🖨️ Print / Save as PDF</button>
            <a href="/index.html" class="btn secondary" style="padding: 10px 24px; font-size: 13px; border-radius: 999px; text-decoration: none; background: #eee7de; color: #181512;">Return to Store</a>
          </div>
        </body>
        </html>
      `;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fullReceiptPage);
    }

    // 7. Welcome Email
    if (reqPath === '/api/auth/welcome-email' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const dispatched = sendConfirmationEmail({
        to: email,
        type: 'account_welcome',
        data: { customerName: body.name || 'Customer', email }
      });
      return sendJson(res, 200, { success: true, emailPreview: dispatched });
    }

    // 8. Latest Emails Preview
    if (reqPath === '/api/emails/latest' && req.method === 'GET') {
      const sentEmails = readJsonFile('sent_emails.json', []);
      return sendJson(res, 200, { email: sentEmails[0] || null });
    }

    return sendJson(res, 404, { error: 'Endpoint not found', path: reqPath });
  } catch (err) {
    return sendJson(res, 500, { error: 'Server error', details: err.message });
  }
};
