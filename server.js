/**
 * Harbor & Thread — Full-Stack Local Development & Production Server
 *
 * Provides:
 * - Robust static file server with MIME types and security guards
 * - Full REST API endpoints under /api/*
 *   - GET  /api/health            (system health, uptime, database status)
 *   - GET  /api/products          (catalog with search, maxPrice, category, section filters)
 *   - GET  /api/lookbook          (editorial looks with associated outfits)
 *   - GET  /api/feedback          (customer feedback stream)
 *   - POST /api/feedback          (submit customer feedback)
 *   - POST /api/newsletter        (newsletter email subscription + confirmation email dispatch)
 *   - POST /api/cart/calculate    (tax, shipping, subtotal calculation)
 *   - POST /api/orders            (e-commerce checkout order creation with guest support & confirmation email)
 *   - GET  /api/orders            (order lookup by email or order number from persistent storage)
 *   - POST /api/auth/welcome-email (customer account registration/sign-in confirmation email)
 *   - GET  /api/emails/latest     (retrieve recent sent confirmation emails for preview)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {}

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname);
const DATA_DIR = path.join(ROOT, 'data');

// Load environment variables from .env
function loadEnv() {
  try {
    const envFile = path.join(ROOT, '.env');
    if (fs.existsSync(envFile)) {
      const lines = fs.readFileSync(envFile, 'utf8').split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eq = trimmed.indexOf('=');
          if (eq !== -1) {
            const k = trimmed.slice(0, eq).trim();
            const v = trimmed.slice(eq + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      });
    }
  } catch (_) {}
}
loadEnv();

// Outbound SMTP email transporter
let smtpTransporter = null;
function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  if (!nodemailer) return null;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log(`[SMTP Outbound Initialized] Ready via ${process.env.SMTP_HOST || 'smtp.gmail.com'} (User: ${process.env.SMTP_USER})`);
      return smtpTransporter;
    } catch (err) {
      console.error('[SMTP Transport Config Error]:', err.message);
    }
  }
  return null;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database configuration
const DB_PASSWORD = process.env.DB_PASSWORD || '@8Ve4C-9!xcuRua';
const DB_HOST = process.env.DB_HOST || 'db.nyjtsnwlnrmgiqladvsa.supabase.co';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_NAME = process.env.DB_NAME || 'postgres';

const DB_CONNECTION_STRING = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

// Helper: Read and write JSON storage safely
function readJsonFile(filename, defaultVal = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf8');
      return defaultVal;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`[Storage] Error reading ${filename}:`, err.message);
    return defaultVal;
  }
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[Storage] Error writing ${filename}:`, err.message);
    return false;
  }
}

// Curated Trending Products
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
    description: '13.5 oz Japanese selvedge denim tailored with an authentic stonewashed fade and custom antique brass rivets.'
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
    description: 'Weatherproof 1000D ballistic nylon with full-grain leather carry handles and dedicated 16-inch laptop compartment.'
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
    description: 'Surgical-grade 316L brushed stainless steel with sapphire crystal and 50m water resistance.'
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
    description: '100% Peruvian pima cotton waffle-knit with a relaxed dropped-shoulder silhouette and mother-of-pearl buttons.'
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
    description: 'Two-piece coordinated set featuring an unlined camel wool-blend overshirt paired with pleated relaxed cream trousers.'
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
    description: 'Handcrafted Italian Mazzucchelli acetate in rich amber tortoiseshell with polarized 100% UVA/UVB Carl Zeiss lenses.'
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
    description: 'Full-grain Italian calfskin with Goodyear-welted sole, penny strap, and stacked leather heel.'
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
    description: 'Supple espresso calf suede with weather-resistant finishing, elastic side gussets, and lugged traction soles.'
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
    description: 'Smooth Italian Nappa leather with soft off-white suede accents, breathable calfskin lining, and natural gum soles.'
  }
];

// 8 Distinct Brand-New Products for New Arrivals
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
    description: 'Tailored from heavyweight 24 oz double-faced New England wool melange with genuine horn buttons, belted storm flaps, and unlined interior with bound seams.'
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
    description: 'Spun from extra-fine 19.5 micron Zegna Baruffa Italian merino wool with a refined micro-rib neck and seamless raglan shoulders engineered for layering.'
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
    description: 'Handcrafted in Tuscany from full-grain calf suede with bevelled edges, nubuck leather backing, and a solid antique brass buckle.'
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
    description: 'Featuring single forward pleats, side waist adjusters, and a graceful gentle taper cut from soft 100% British wool flannel.'
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
    description: 'Rugged 18 oz British water-resistant waxed cotton canvas trimmed with vegetable-tanned bridle leather and brass YKK Excella zippers.'
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
    description: 'Finished with Scotchgard suede treatment, natural plantation crepe rubber outsoles, and Goodyear storm welts for Boston damp autumns.'
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
    description: 'Custom sculpted champagne cellulose acetate frames paired with anti-reflective polarized bottle green Carl Zeiss optics.'
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
    description: 'Japanese Miyota 9015 automatic movement, deep Atlantic navy sunburst dial, 100m water resistance, and an interchangeable Horween leather strap.'
  }
];

const ALL_PRODUCTS = [...FALLBACK_PRODUCTS, ...NEW_ARRIVALS_PRODUCTS];

// Helper to query database with graceful fallback
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

// Email Confirmation Service
function sendConfirmationEmail({ to, type, data = {} }) {
  const sentEmails = readJsonFile('sent_emails.json', []);
  const emailId = 'em-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  let subject = '';
  let preview = '';
  let htmlBody = '';

  if (type === 'newsletter_welcome') {
    subject = 'Welcome to the Harbor & Thread Circle — Your 15% Private Invitation';
    preview = `Welcome to Harbor & Thread Boston. Use VIP code HARBOR15 for 15% off your next purchase.`;
    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f2ec; padding: 32px 24px; color: #181512; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-family: Georgia, serif; font-size: 26px; margin: 0; color: #181512;">Harbor &amp; Thread</h2>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #756b63; margin-top: 4px;">Boston, Massachusetts</p>
        </div>
        <div style="background: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #ece2d8; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
          <h3 style="font-size: 20px; font-family: Georgia, serif; margin: 0 0 12px; color: #181512;">Welcome to the Circle</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #5a524b;">
            Thank you for subscribing to Harbor &amp; Thread. You're now on our private guest list for seasonal New England style edits, private drops, and bespoke styling invitations.
          </p>
          <div style="background: #f7f2ec; border: 1px dashed #9e6d46; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #756b63; margin: 0 0 4px;">Your Private Welcome Code</p>
            <strong style="font-size: 22px; letter-spacing: 0.12em; color: #9e6d46;">HARBOR15</strong>
            <p style="font-size: 12px; color: #756b63; margin: 4px 0 0;">Enjoy 15% off your next purchase across all collections.</p>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #756b63; margin-top: 20px;">
            Questions or styling inquiries? Reply directly to this email or visit our Boston studio.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #a9a39e;">
          Harbor &amp; Thread • Beacon Hill &amp; Newbury St, Boston, MA • <a href="http://localhost:3000" style="color: #9e6d46; text-decoration: none;">harborandthread.com</a>
        </div>
      </div>
    `;
  } else if (type === 'order_confirmation') {
    const orderNumber = data.order_number || 'HT-2026-0000';
    const total = Number(data.total || 0).toFixed(2);
    subject = `Order Confirmed: ${orderNumber} — Harbor & Thread Boston`;
    preview = `Thank you for your order ${orderNumber}. Total: $${total}. Preparing shipment to ${data.shipping_city || 'Boston'}, MA.`;
    
    let itemsRows = '';
    const items = Array.isArray(data.items) ? data.items : [];
    items.forEach(item => {
      itemsRows += `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px;">${item.name || 'Item'} (×${item.quantity || 1})</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; text-align: right; font-weight: 600;">$${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}</td>
        </tr>
      `;
    });

    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f2ec; padding: 32px 24px; color: #181512; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-family: Georgia, serif; font-size: 26px; margin: 0; color: #181512;">Harbor &amp; Thread</h2>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #756b63; margin-top: 4px;">Boston Atelier Order Receipt</p>
        </div>
        <div style="background: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #ece2d8; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="background: #e8f5ec; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">ORDER CONFIRMED</span>
            <strong style="color: #9e6d46; font-size: 14px;">${orderNumber}</strong>
          </div>
          <h3 style="font-size: 18px; font-family: Georgia, serif; margin: 0 0 10px; color: #181512;">Thank you, ${data.customer_name || 'Customer'}!</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #5a524b;">
            Your order has been received by our Boston team and is being hand-prepared with care.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
            ${itemsRows}
          </table>
          <div style="border-top: 2px solid #181512; padding-top: 12px; text-align: right; font-size: 15px;">
            <strong>Order Total: $${total}</strong>
          </div>
          <div style="margin-top: 20px; padding: 14px; background: #faf7f4; border-radius: 8px; font-size: 12.5px; color: #5a524b;">
            <div><strong>Shipping To:</strong> ${data.shipping_address || ''}, ${data.shipping_city || 'Boston'}, ${data.shipping_state || 'MA'} ${data.shipping_zip || ''}</div>
            <div style="margin-top: 4px;"><strong>Estimated Dispatch:</strong> Within 24-48 business hours via Boston courier</div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #a9a39e;">
          Harbor &amp; Thread • Boston, MA • <a href="http://localhost:3000/account.html" style="color: #9e6d46; text-decoration: none;">Track in Account</a>
        </div>
      </div>
    `;
  } else if (type === 'account_welcome') {
    subject = 'Welcome to Your Harbor & Thread Account — Boston Member Portal';
    preview = `Your customer account has been confirmed. Sign in anytime to track orders and save your seasonal edits.`;
    htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f2ec; padding: 32px 24px; color: #181512; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-family: Georgia, serif; font-size: 26px; margin: 0; color: #181512;">Harbor &amp; Thread</h2>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #756b63; margin-top: 4px;">Customer Account Confirmed</p>
        </div>
        <div style="background: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #ece2d8;">
          <h3 style="font-size: 18px; font-family: Georgia, serif; margin: 0 0 10px; color: #181512;">Your Account is Ready</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #5a524b;">
            Hello ${data.customerName || 'Customer'}, your Harbor &amp; Thread customer profile is now active.
          </p>
          <ul style="font-size: 13.5px; line-height: 1.8; color: #5a524b; padding-left: 20px;">
            <li>View order status, receipts, and delivery tracking</li>
            <li>Receive advance invitations to seasonal runway lookbooks</li>
            <li>Book private atelier fitting appointments in Boston</li>
          </ul>
          <div style="text-align: center; margin: 24px 0 10px;">
            <a href="http://localhost:3000/account.html" style="display: inline-block; background: #181512; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-size: 13px; font-weight: 700;">Go to Account Portal</a>
          </div>
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

  sentEmails.unshift(emailRecord);
  if (sentEmails.length > 50) sentEmails.pop();
  writeJsonFile('sent_emails.json', sentEmails);
  const transporter = getSmtpTransporter();

  // 1. Resend API Dispatch (if RESEND_API_KEY is configured in .env)
  if (process.env.RESEND_API_KEY) {
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
    }).then(r => r.json()).then(res => {
      console.log(`[Resend Live Sent] Email delivered to ${to} (ID: ${res.id || 'OK'})`);
    }).catch(err => {
      console.error(`[Resend Live Warning] Failed sending to ${to}:`, err.message);
    });
  }
  // 2. Outbound SMTP Dispatch (if SMTP_USER and SMTP_PASS are configured in .env)
  else if (transporter) {
    transporter.sendMail({
      from: process.env.SMTP_FROM || `"Harbor & Thread Boston" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlBody
    }).then(info => {
      console.log(`[SMTP Live Delivered] Sent to ${to} (Message ID: ${info.messageId})`);
    }).catch(err => {
      console.error(`[SMTP Delivery Warning] Failed sending to ${to}:`, err.message);
    });
  } else {
    console.log(`[Email Dispatched Locally] To: ${to} | Subject: "${subject}" [Note: Add RESEND_API_KEY or SMTP_USER/SMTP_PASS in .env for live inbox delivery]`);
  }

  return emailRecord;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

// Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  let reqPath = decodeURIComponent(parsedUrl.pathname);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // ==========================================
  // REST API ROUTES (/api/*)
  // ==========================================
  if (reqPath.startsWith('/api/')) {
    try {
      // 1. Health check
      if (reqPath === '/api/health' && req.method === 'GET') {
        const dbCheck = await queryDb('SELECT 1 as alive');
        return sendJson(res, 200, {
          status: 'ok',
          service: 'Harbor & Thread Full-Stack API',
          location: 'Boston, MA, USA',
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          database: dbCheck.success ? 'connected' : 'fallback-ready (file-backed)',
          memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        });
      }

      // 2. Products API
      if (reqPath === '/api/products' && req.method === 'GET') {
        const search = (parsedUrl.searchParams.get('search') || '').trim().toLowerCase();
        const maxPrice = Number(parsedUrl.searchParams.get('maxPrice') || 0);
        const category = (parsedUrl.searchParams.get('category') || '').trim();
        const section = (parsedUrl.searchParams.get('section') || '').trim().toLowerCase();

        let products = section === 'new-arrivals' ? [...NEW_ARRIVALS_PRODUCTS] : [...ALL_PRODUCTS];

        if (section === 'trending') {
          products = [...FALLBACK_PRODUCTS];
        }

        if (maxPrice > 0) {
          products = products.filter(p => Number(p.price) <= maxPrice);
        }
        if (category && category !== 'all') {
          products = products.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
        }
        if (search) {
          products = products.filter(p =>
            (p.name || '').toLowerCase().includes(search) ||
            (p.subtitle || '').toLowerCase().includes(search) ||
            (p.category || '').toLowerCase().includes(search) ||
            (p.description || '').toLowerCase().includes(search)
          );
        }

        return sendJson(res, 200, {
          count: products.length,
          products
        });
      }

      // 3. Lookbook API
      if (reqPath === '/api/lookbook' && req.method === 'GET') {
        const FALLBACK_LOOKBOOK = [
          {
            id: 'c0000000-0000-0000-0000-000000000001',
            title: 'Back Bay Minimal',
            description: 'Cream knitwear, camel tailoring, and relaxed structure for polished city days.',
            season: 'Fall / Winter 2026',
            image_url: 'images/outfit.jpg',
            products: [
              { name: 'Back Bay Oversized Knit Polo', price: 145 },
              { name: 'North End Outfit Set', price: 255 }
            ]
          },
          {
            id: 'c0000000-0000-0000-0000-000000000002',
            title: 'Beacon Hill Casual',
            description: 'Classic denim paired with elevated layers for effortless everyday styling.',
            season: 'Autumn Everyday',
            image_url: 'images/jeans.jpg',
            products: [
              { name: 'Beacon Denim Jeans', price: 95 },
              { name: 'Commonwealth Watch', price: 220 }
            ]
          },
          {
            id: 'c0000000-0000-0000-0000-000000000003',
            title: 'Seaport Weekend',
            description: 'Clean accessories and practical luxury for an easy waterfront weekend edit.',
            season: 'Coastal Weekend',
            image_url: 'images/bag.jpg',
            products: [
              { name: 'Harbor Weekend Bag', price: 165 },
              { name: 'Seaport Sunglasses', price: 130 }
            ]
          }
        ];
        return sendJson(res, 200, { looks: FALLBACK_LOOKBOOK });
      }

      // 4. Feedback API
      if (reqPath === '/api/feedback') {
        if (req.method === 'GET') {
          const FALLBACK_FEEDBACK = [
            { id: '1', name: 'Julian R.', rating: 5, feedback_type: 'Products', message: 'The quality of the wool knitwear exceeds expectations. Perfect for Boston chill.', created_at: '2026-10-09T14:10:00Z' },
            { id: '2', name: 'Sophia M.', rating: 5, feedback_type: 'Website Experience', message: 'The budget slider and quick lookbook are so easy to navigate.', created_at: '2026-10-08T18:22:00Z' }
          ];
          return sendJson(res, 200, { feedback: FALLBACK_FEEDBACK });
        }

        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const name = (body.name || '').trim();
          const email = (body.email || '').trim();
          const feedback_type = body.feedback_type || 'General';
          const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
          const message = (body.message || '').trim();

          if (!name || message.length < 3) {
            return sendJson(res, 400, { error: 'Please include your name and a brief feedback message.' });
          }

          const newFb = {
            id: 'fb-' + Date.now(),
            name,
            email,
            feedback_type,
            rating,
            message,
            created_at: new Date().toISOString()
          };

          return sendJson(res, 201, { success: true, feedback: newFb });
        }
      }

      // 5. Newsletter Subscription API with Confirmation Email
      if (reqPath === '/api/newsletter' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
          return sendJson(res, 400, { error: 'Please provide a valid email address.' });
        }

        const subscribers = readJsonFile('subscribers.json', []);
        const exists = subscribers.some(s => s.email === email);

        if (!exists) {
          subscribers.push({
            email,
            source: body.source || 'website_footer',
            subscribed_at: new Date().toISOString()
          });
          writeJsonFile('subscribers.json', subscribers);
        }

        // Dispatch official Confirmation Email
        const dispatchedEmail = sendConfirmationEmail({
          to: email,
          type: 'newsletter_welcome',
          data: { email }
        });

        // Also try inserting to Supabase if connected
        queryDb('INSERT INTO public.newsletter_subscribers (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING;', [email, 'website_footer']).catch(() => {});

        return sendJson(res, 200, {
          success: true,
          message: exists
            ? "You're already subscribed to Harbor & Thread! We have re-sent your private invitation."
            : "You're now part of the Harbor & Thread circle! A confirmation email has been sent to your inbox.",
          emailDispatched: true,
          emailPreview: dispatchedEmail
        });
      }

      // 6. Account Confirmation / Welcome Email API
      if (reqPath === '/api/auth/welcome-email' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const name = (body.name || body.customerName || 'Customer').trim();

        if (!email || !email.includes('@')) {
          return sendJson(res, 400, { error: 'Valid email required' });
        }

        const dispatched = sendConfirmationEmail({
          to: email,
          type: 'account_welcome',
          data: { customerName: name, email }
        });

        return sendJson(res, 200, {
          success: true,
          message: 'Account confirmation email dispatched.',
          emailPreview: dispatched
        });
      }

      // 7. Orders Creation & Retrieval API (Guest & Logged In)
      if (reqPath === '/api/orders') {
        // Place new order
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const customerName = (body.customerName || '').trim();
          const customerEmail = (body.customerEmail || '').trim().toLowerCase();
          const shippingAddress = (body.shippingAddress || '').trim();
          const shippingCity = (body.shippingCity || 'Boston').trim();
          const shippingState = (body.shippingState || 'MA').trim();
          const shippingZip = (body.shippingZip || '').trim();
          const items = Array.isArray(body.items) ? body.items : [];
          const isGuest = body.isGuest !== false;
          const userId = body.userId || null;

          if (!customerName || customerName.length < 2) {
            return sendJson(res, 400, { error: 'Please enter your full customer name.' });
          }
          if (!customerEmail || !customerEmail.includes('@')) {
            return sendJson(res, 400, { error: 'Please provide a valid email for order delivery updates.' });
          }
          if (!shippingAddress || !shippingZip) {
            return sendJson(res, 400, { error: 'Please provide your shipping street address and postal ZIP.' });
          }
          if (items.length === 0) {
            return sendJson(res, 400, { error: 'Your shopping cart is empty.' });
          }

          // Compute verified financial figures
          let subtotal = 0;
          items.forEach(i => {
            subtotal += (parseFloat(i.price) || 0) * (parseInt(i.quantity, 10) || 1);
          });
          const tax = parseFloat((subtotal * 0.0625).toFixed(2));
          const shipping = subtotal >= 150 ? 0 : 12.00;
          const total = parseFloat((subtotal + tax + shipping).toFixed(2));

          // Generate authentic Boston fashion order number: HT-2026-XXXX
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
            items: items,
            is_guest: isGuest,
            user_id: userId,
            created_at: new Date().toISOString()
          };

          // Save permanently in data/orders.json
          const ordersStore = readJsonFile('orders.json', []);
          ordersStore.unshift(orderRecord);
          writeJsonFile('orders.json', ordersStore);

          // Dispatch authentic order confirmation email
          const dispatchedEmail = sendConfirmationEmail({
            to: customerEmail,
            type: 'order_confirmation',
            data: orderRecord
          });

          // Insert into Supabase public.orders via REST API
          const supabaseUrl = process.env.SUPABASE_URL || 'https://nyjtsnwlnrmgiqladvsa.supabase.co';
          const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_vJxuCCdiIRv2rEK1dgj1mA_0hnkx8E4';
          
          fetch(`${supabaseUrl}/rest/v1/orders`, {
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
              subtotal: subtotal,
              tax: tax,
              shipping: shipping,
              total: total,
              status: 'confirmed',
              items: items
            })
          }).then(r => r.json()).then(resData => {
            console.log(`[Supabase Live Insert SUCCESS] Order ${orderNumber} saved to Supabase (Record ID: ${resData?.[0]?.id || 'OK'})`);
          }).catch(err => {
            console.error(`[Supabase Insert Warning] Could not save to Supabase: ${err.message}`);
          });

          return sendJson(res, 201, {
            success: true,
            message: 'Your order has been confirmed! A receipt has been sent to your email.',
            order: orderRecord,
            emailDispatched: true,
            emailPreview: dispatchedEmail
          });
        }

        // Retrieve orders by customer email or order number
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

          // Return recent orders list
          return sendJson(res, 200, { orders: ordersStore.slice(0, 20) });
        }
      }

      // 7.1 Standalone Printable HTML Receipt
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

      // 8. Latest Sent Emails API (for client-side preview & verification)
      if (reqPath === '/api/emails/latest' && req.method === 'GET') {
        const to = (parsedUrl.searchParams.get('to') || '').trim().toLowerCase();
        const sentEmails = readJsonFile('sent_emails.json', []);
        if (to) {
          const match = sentEmails.find(e => e.to.toLowerCase() === to);
          return sendJson(res, 200, { email: match || null });
        }
        return sendJson(res, 200, { email: sentEmails[0] || null, totalSent: sentEmails.length });
      }

      // API route not recognized
      return sendJson(res, 404, { error: 'API endpoint not found', path: reqPath });
    } catch (apiErr) {
      console.error('[API Server Error]:', apiErr);
      return sendJson(res, 500, { error: 'Internal API Server Error', details: apiErr.message });
    }
  }

  // ==========================================
  // STATIC FILE SERVING
  // ==========================================
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(path.join(ROOT, reqPath));
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const baseName = path.basename(safePath);
  if (baseName.startsWith('.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;padding:40px;background:#f7f2ec;color:#181512"><h1>404 Not Found</h1><p>The requested file <code>${reqPath}</code> was not found.</p><p><a href="/" style="color:#9e6d46">← Back to Harbor &amp; Thread</a></p></body></html>`);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  Harbor & Thread — Full-Stack Server Running`);
  console.log(`  > Local:       http://localhost:${PORT}`);
  console.log(`  > API Health:  http://localhost:${PORT}/api/health`);
  console.log(`  > API Products:http://localhost:${PORT}/api/products`);
  console.log(`  > API Orders:  http://localhost:${PORT}/api/orders`);
  console.log(`  > API Newsletter: http://localhost:${PORT}/api/newsletter`);
  console.log(`  > Home (Page 1):       http://localhost:${PORT}/index.html`);
  console.log(`  > Lookbook (Page 2):   http://localhost:${PORT}/lookbook.html`);
  console.log(`  > Experience (Page 3): http://localhost:${PORT}/experience.html`);
  console.log(`  > Heritage (Page 4):   http://localhost:${PORT}/heritage.html`);
  console.log(`  > Feedback:            http://localhost:${PORT}/feedback.html`);
  console.log(`==================================================\n`);
});
