/* SAVI BELLA — theme scripts */
(function () {
  'use strict';

  var money = function (cents) {
    var f = (window.SaviBella && window.SaviBella.moneyFormat) || '€{{amount}}';
    var amount = (cents / 100).toFixed(2);
    if (f.indexOf('amount_with_comma_separator') > -1 || f.indexOf('{{amount}}') > -1) {
      amount = amount.replace('.', ',');
    }
    return f.replace(/\{\{\s*\w+\s*\}\}/, amount);
  };

  /* ---------- Mobile menu & search ---------- */
  document.addEventListener('click', function (e) {
    var burger = e.target.closest('[data-menu-toggle]');
    if (burger) {
      var menu = document.getElementById('MobileMenu');
      if (menu) menu.classList.toggle('is-open');
    }
    var search = e.target.closest('[data-search-toggle]');
    if (search) {
      var bar = document.getElementById('SearchBar');
      if (bar) {
        bar.classList.toggle('is-open');
        var input = bar.querySelector('input');
        if (input && bar.classList.contains('is-open')) input.focus();
      }
    }
  });

  /* ---------- Cart drawer ---------- */
  var drawer = document.getElementById('CartDrawer');

  function openDrawer() { if (drawer) { drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; } }
  function closeDrawer() { if (drawer) { drawer.classList.remove('is-open'); document.body.style.overflow = ''; } }

  function renderCart(cart) {
    var countEls = document.querySelectorAll('[data-cart-count]');
    countEls.forEach(function (el) {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? '' : 'none';
    });

    var items = document.getElementById('CartDrawerItems');
    var subtotal = document.getElementById('CartDrawerSubtotal');
    if (!items) return;

    if (!cart.items.length) {
      items.innerHTML = '<p style="color:var(--muted);padding:24px 0;text-align:center;">' +
        (window.SaviBella.strings.emptyCart || 'Il tuo carrello è vuoto.') + '</p>';
    } else {
      items.innerHTML = cart.items.map(function (item) {
        var img = item.image ? item.image.replace(/(\.[a-zA-Z]+)(\?|$)/, '_160x$1$2') : '';
        return '<div class="line-item">' +
          (img ? '<img src="' + img + '" alt="" loading="lazy">' : '') +
          '<div style="flex:1">' +
            '<div class="line-item__title">' + item.product_title + '</div>' +
            (item.variant_title ? '<div class="line-item__meta">' + item.variant_title + '</div>' : '') +
            '<div class="line-item__meta">' + item.quantity + ' × ' + money(item.final_price) + '</div>' +
            '<button class="line-item__remove" data-remove-key="' + item.key + '">' +
              (window.SaviBella.strings.remove || 'Rimuovi') + '</button>' +
          '</div>' +
          '<div style="font-weight:700">' + money(item.final_line_price) + '</div>' +
        '</div>';
      }).join('');
    }
    if (subtotal) subtotal.textContent = money(cart.total_price);
  }

  function fetchCart() {
    return fetch(window.Shopify && window.Shopify.routes ? window.Shopify.routes.root + 'cart.js' : '/cart.js', {
      headers: { 'Accept': 'application/json' }
    }).then(function (r) { return r.json(); });
  }

  function refreshCart(open) {
    fetchCart().then(function (cart) {
      renderCart(cart);
      if (open) openDrawer();
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); refreshCart(true); }
    if (e.target.closest('[data-cart-close]') || e.target.closest('.drawer__overlay')) { closeDrawer(); }

    var rm = e.target.closest('[data-remove-key]');
    if (rm) {
      var body = { id: rm.getAttribute('data-remove-key'), quantity: 0 };
      fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); }).then(renderCart);
    }
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  /* ---------- Add to cart (AJAX) ---------- */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[action*="/cart/add"]');
    if (!form) return;
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]');
    var label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = window.SaviBella.strings.adding || 'Aggiunta…'; }

    fetch('/cart/add.js', { method: 'POST', body: new FormData(form) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.status && res.status !== 200) throw new Error(res.description || res.message);
        refreshCart(true);
      })
      .catch(function (err) { alert(err.message); })
      .finally(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; } });
  });

  /* ---------- Quantity steppers ---------- */
  document.addEventListener('click', function (e) {
    var step = e.target.closest('[data-qty]');
    if (!step) return;
    var input = step.parentNode.querySelector('input');
    if (!input) return;
    var val = parseInt(input.value, 10) || 1;
    val += step.getAttribute('data-qty') === 'up' ? 1 : -1;
    input.value = Math.max(1, val);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ---------- Product gallery ---------- */
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-gallery-thumb]');
    if (!thumb) return;
    var gallery = thumb.closest('[data-gallery]');
    var main = gallery.querySelector('[data-gallery-main] img');
    var full = thumb.getAttribute('data-full');
    if (main && full) { main.src = full; main.srcset = ''; }
    gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (t) { t.classList.remove('is-active'); });
    thumb.classList.add('is-active');
  });

  /* ---------- Variant selection ---------- */
  document.querySelectorAll('[data-variant-select]').forEach(function (select) {
    select.addEventListener('change', function () {
      var opt = select.options[select.selectedIndex];
      var root = select.closest('[data-product-root]');
      if (!root) return;
      var idInput = root.querySelector('[name="id"]');
      if (idInput) idInput.value = select.value;
      var price = root.querySelector('[data-price]');
      if (price && opt.dataset.price) price.textContent = opt.dataset.price;
      var compare = root.querySelector('[data-compare]');
      if (compare) compare.textContent = opt.dataset.compare || '';
      var stickyPrice = document.querySelector('[data-sticky-price]');
      if (stickyPrice && opt.dataset.price) stickyPrice.textContent = opt.dataset.price;
      var buttons = root.querySelectorAll('[data-atc]');
      buttons.forEach(function (b) { b.disabled = opt.dataset.available === 'false'; });
    });
  });

  /* ---------- Sticky add to cart ---------- */
  var sticky = document.getElementById('StickyAtc');
  var anchor = document.getElementById('ProductForm');
  if (sticky && anchor && 'IntersectionObserver' in window) {
    document.body.classList.add('has-sticky-atc');
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sticky.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
      });
    }, { threshold: 0 }).observe(anchor);
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-sticky-atc-submit]')) {
      var form = document.getElementById('ProductForm');
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
    }
  });

  /* ---------- Initial cart paint ---------- */
  if (drawer) refreshCart(false);
})();
