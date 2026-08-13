(() => {
  'use strict';

  const money = value => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value) || 0);
  const parseMoney = value => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;

  function row(page,label) {
    return [...page.querySelectorAll('.cb-summary-lines > div')].find(candidate => candidate.querySelector('span')?.textContent.trim().toLowerCase() === label.toLowerCase()) || null;
  }

  function set(page,label,value,negative=false) {
    const strong = row(page,label)?.querySelector('strong');
    if (!strong) return;
    strong.textContent = negative ? `− ${money(value)}` : money(value);
  }

  function restoreNativeTotals() {
    const helper = window.CampusDemoBookstoreStability;
    const page = document.querySelector('[data-bookstore-ui-v1] .cb-checkout-page');
    if (!helper || !page || helper.courseCount() || !page.dataset.demoBaseSubtotal) return;
    const subtotal = Number(page.dataset.demoBaseSubtotal) || 0;
    const shipping = parseMoney(row(page,'Fulfillment')?.querySelector('strong')?.textContent);
    const discount = subtotal * .10;
    const taxable = Math.max(0,subtotal-discount+shipping);
    const tax = taxable * .0725;
    const fee = Math.max(0,subtotal-discount) * .015;
    const total = taxable + tax + fee;
    set(page,'Subtotal',subtotal);
    set(page,'Student discount',discount,true);
    set(page,'Estimated state tax',tax);
    set(page,'Processing fee',fee);
    set(page,'Grand total',total);
    page.dataset.demoCombinedTotal = String(Math.round(total*100)/100);
    page.querySelector('[data-cb-payment-card]')?.remove();
  }

  document.addEventListener('click',event => {
    if (!event.target.closest?.('[data-store-course-checkout-remove]')) return;
    setTimeout(restoreNativeTotals,0);
  },true);
})();