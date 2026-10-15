/**
 * Harbor & Thread — Live Email Confirmation Preview Modal & Toast
 *
 * Provides:
 * - Real-time notification toast whenever an email (newsletter, order, account) is dispatched
 * - Interactive modal displaying the full authentic Boston Atelier HTML email preview
 * - Print / Save PDF functionality for order receipts
 * - Works with both email dispatch objects and raw order records
 */

(function () {
  'use strict';

  function formatOrderReceiptHtml(order) {
    const orderNumber = order.order_number || 'HT-2026-0000';
    const total = Number(order.total || 0).toFixed(2);
    const subtotal = Number(order.subtotal || total).toFixed(2);
    const tax = Number(order.tax || 0).toFixed(2);
    const shipping = Number(order.shipping || 0).toFixed(2);
    const customerName = order.customer_name || 'Valued Client';
    
    let itemsList = [];
    try {
      itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    } catch (_) {
      itemsList = [];
    }

    let itemsRows = '';
    itemsList.forEach(item => {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      itemsRows += `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13.5px; color: #181512;">
            <strong>${item.name || 'Boston Collection Item'}</strong>
            <div style="font-size: 11.5px; color: #756b63;">Handcrafted in Boston • Qty: ${qty}</div>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13.5px; text-align: right; font-weight: 600; color: #181512;">
            $${(price * qty).toFixed(2)}
          </td>
        </tr>
      `;
    });

    const address = order.shipping_address ? `${order.shipping_address}, ${order.shipping_city || 'Boston'}, ${order.shipping_state || 'MA'} ${order.shipping_zip || ''}` : 'Boston Studio Collection';

    return `
      <div class="printable-receipt" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f2ec; padding: 32px 24px; color: #181512; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; color: #181512; letter-spacing: -0.01em;">Harbor &amp; Thread</h2>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #756b63; margin-top: 5px;">Boston Atelier • Official Order Receipt</p>
        </div>
        <div style="background: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #ece2d8; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <span style="background: #e8f5ec; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">ORDER CONFIRMED</span>
            <strong style="color: #9e6d46; font-size: 15px; font-family: monospace;">${orderNumber}</strong>
          </div>
          <h3 style="font-size: 18px; font-family: 'Playfair Display', Georgia, serif; margin: 0 0 10px; color: #181512;">Thank you, ${customerName}!</h3>
          <p style="font-size: 13.5px; line-height: 1.6; color: #5a524b; margin: 0 0 16px;">
            Your order has been confirmed by our Boston atelier team. You will find your complete purchase summary below.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
            ${itemsRows}
          </table>
          <div style="border-top: 1px solid #eee; padding-top: 12px; font-size: 13px; color: #5a524b;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Subtotal:</span>
              <span>$${subtotal}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Massachusetts Tax (6.25%):</span>
              <span>$${tax}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Shipping:</span>
              <span>${Number(shipping) === 0 ? 'COMPLIMENTARY' : `$${shipping}`}</span>
            </div>
            <div style="border-top: 2px solid #181512; padding-top: 8px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; color: #181512;">
              <span>Total Paid:</span>
              <span>$${total}</span>
            </div>
          </div>
          <div style="margin-top: 20px; padding: 14px; background: #faf7f4; border-radius: 8px; font-size: 12.5px; color: #5a524b; line-height: 1.5;">
            <div><strong>Shipping Destination:</strong> ${address}</div>
            <div style="margin-top: 4px;"><strong>Estimated Dispatch:</strong> 24–48 hours via Boston private courier</div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #a9a39e;">
          Harbor &amp; Thread • Beacon Hill &amp; Newbury St, Boston, MA • <a href="/account.html" style="color: #9e6d46; text-decoration: none;">Track Order in Account</a>
        </div>
      </div>
    `;
  }

  function initEmailPreview() {
    if (document.getElementById('emailPreviewModalBackdrop')) return;

    // Toast element
    const toast = document.createElement('aside');
    toast.id = 'emailToast';
    toast.className = 'email-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">✉️</span>
        <div>
          <strong id="toastTitle">Confirmation Email Dispatched</strong>
          <p id="toastMessage">Check your inbox for your official confirmation.</p>
        </div>
      </div>
      <button type="button" id="toastViewBtn" class="toast-action-btn">View Receipt</button>
      <button type="button" id="toastCloseBtn" class="toast-close-btn" aria-label="Close notification">×</button>
    `;

    // Modal element
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'emailPreviewModalBackdrop';
    modalBackdrop.className = 'email-modal-backdrop';

    modalBackdrop.innerHTML = `
      <div class="email-modal" role="dialog" aria-modal="true" aria-labelledby="emailModalTitle">
        <div class="email-modal-header">
          <div>
            <span class="email-modal-badge">HARBOR &amp; THREAD • BOSTON ATELIER</span>
            <h3 id="emailModalTitle" style="margin: 4px 0 0; font-family: 'Playfair Display', serif; font-size: 20px;">Official Receipt</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn secondary" id="printReceiptModalBtn" style="padding: 6px 14px; font-size: 12px; border-radius: 999px;">🖨️ Print / PDF</button>
            <button type="button" class="close-email-modal-btn" id="closeEmailModalBtn" aria-label="Close email modal">×</button>
          </div>
        </div>
        <div class="email-modal-meta" id="emailModalMeta">
          <div><strong>Recipient:</strong> <span id="metaRecipient">customer@example.com</span></div>
          <div><strong>Subject:</strong> <span id="metaSubject">Order Confirmed</span></div>
          <div><strong>Status:</strong> <span style="color: #166534; font-weight: 700;">Confirmed &amp; Logged ✓</span></div>
        </div>
        <div class="email-modal-body" id="emailModalBody">
          <!-- Rendered HTML email body -->
        </div>
      </div>
    `;

    document.body.appendChild(toast);
    document.body.appendChild(modalBackdrop);

    let activeEmail = null;

    function showToast(emailData) {
      activeEmail = emailData;
      const titleEl = document.getElementById('toastTitle');
      const msgEl = document.getElementById('toastMessage');

      if (emailData.type === 'newsletter_welcome') {
        titleEl.textContent = 'Welcome Email Dispatched!';
        msgEl.textContent = `Invitation + 15% VIP code sent to ${emailData.to}`;
      } else if (emailData.type === 'order_confirmation' || emailData.order_number) {
        titleEl.textContent = 'Order Receipt Ready!';
        msgEl.textContent = `Receipt for ${emailData.order_number || 'order'} available.`;
      } else {
        titleEl.textContent = 'Confirmation Ready!';
        msgEl.textContent = `Confirmation sent to ${emailData.to || 'your email'}`;
      }

      toast.classList.add('show');

      // Auto-hide after 8 seconds
      setTimeout(() => {
        toast.classList.remove('show');
      }, 8000);
    }

    function openModal(data) {
      if (!data) return;
      activeEmail = data;

      // Close checkout modal if open so there is no collision
      const checkoutModal = document.getElementById('checkoutModalBackdrop');
      if (checkoutModal && checkoutModal.classList.contains('open')) {
        checkoutModal.classList.remove('open');
      }

      const recipient = data.to || data.customer_email || 'Valued Customer';
      const orderNum = data.order_number || (data.data && data.data.order_number) || 'Order Receipt';
      const subject = data.subject || `Order Confirmed: ${orderNum} — Harbor & Thread Boston`;
      
      let htmlContent = '';
      if (data.html) {
        htmlContent = data.html;
      } else if (data.order_number || (data.data && data.data.order_number)) {
        htmlContent = formatOrderReceiptHtml(data.order_number ? data : data.data);
      } else {
        htmlContent = `<div style="padding: 24px; text-align: center;"><p>${data.preview || 'Your confirmation has been processed.'}</p></div>`;
      }

      document.getElementById('metaRecipient').textContent = recipient;
      document.getElementById('metaSubject').textContent = subject;
      document.getElementById('emailModalBody').innerHTML = htmlContent;

      modalBackdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
      toast.classList.remove('show');
    }

    function closeModal() {
      modalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    function printReceipt() {
      const bodyContent = document.getElementById('emailModalBody')?.innerHTML;
      if (!bodyContent) return;

      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Harbor & Thread — Receipt</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #fff; }
                @media print {
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>
              ${bodyContent}
              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    }

    document.getElementById('toastViewBtn')?.addEventListener('click', () => {
      openModal(activeEmail);
    });

    document.getElementById('toastCloseBtn')?.addEventListener('click', () => {
      toast.classList.remove('show');
    });

    document.getElementById('closeEmailModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('printReceiptModalBtn')?.addEventListener('click', printReceipt);

    modalBackdrop.addEventListener('click', e => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Expose globally
    window.HarborEmailNotifier = {
      notify: showToast,
      preview: openModal,
      print: printReceipt,
      formatReceipt: formatOrderReceiptHtml
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmailPreview);
  } else {
    initEmailPreview();
  }
})();
