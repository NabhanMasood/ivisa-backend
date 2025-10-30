const API_URL = 'http://localhost:5000/nationalities';

const nationalityDropdown = document.getElementById('nationalityDropdown');
const destinationDropdown = document.getElementById('destinationDropdown');
const productsList = document.getElementById('productsList');
const customPriceSwitch = document.getElementById('customPriceSwitch');
const selectedSection = document.getElementById('selectedSection');
const selectedProductsEl = document.getElementById('selectedProducts');
const submitBtn = document.getElementById('submitBtn');
const responseEl = document.getElementById('response');

let productsData = [];

// Fetch dropdowns
async function fetchDropdowns() {
  const nationalityRes = await fetch(`${API_URL}/nationality-dropdown`);
  const destinationRes = await fetch(`${API_URL}/destination-dropdown`);

  const nationalityData = (await nationalityRes.json()).data;
  const destinationData = (await destinationRes.json()).data;

  nationalityDropdown.innerHTML = nationalityData.map(n => `<option value="${n}">${n}</option>`).join('');
  destinationDropdown.innerHTML = destinationData.map(d => `<option value="${d}">${d}</option>`).join('');
}

// Fetch products when destination changes
destinationDropdown.addEventListener('change', async () => {
  const destination = destinationDropdown.value;
  const res = await fetch(`${API_URL}/products?destination=${destination}`);
  const data = (await res.json()).data;

  productsData = data;
  // reset UI state when destination changes
  customPriceSwitch.checked = false;
  selectedSection.style.display = 'none';
  selectedProductsEl.innerHTML = '';
  renderProducts();
});

function renderProducts() {
  productsList.innerHTML = '';

  productsData.forEach((p, index) => {
    const div = document.createElement('div');
    div.classList.add('product-item');

    div.innerHTML = `
      <input type="checkbox" id="product_${index}" data-index="${index}" />
      <label>${p.productName} - $${Number(p.totalAmount ?? 0)}</label>
      <div class="custom-price" id="customPrice_${index}">
        Govt Fee: <input type="number" value="${p.govtFee}" id="govtFee_${index}" /> |
        Service Fee: <input type="number" value="${p.serviceFee}" id="serviceFee_${index}" /> |
        Total: <input type="number" value="${p.totalAmount}" id="total_${index}" readonly />
      </div>
    `;
    productsList.appendChild(div);
  });

  // Add checkbox and custom price logic
  productsData.forEach((p, index) => {
    const checkbox = document.getElementById(`product_${index}`);
    const customDiv = document.getElementById(`customPrice_${index}`);
    const govtInput = document.getElementById(`govtFee_${index}`);
    const serviceInput = document.getElementById(`serviceFee_${index}`);
    const totalInput = document.getElementById(`total_${index}`);

    checkbox.addEventListener('change', () => {
      // keep inline custom section hidden; use bottom section when switch is ON
      customDiv.style.display = 'none';
      if (customPriceSwitch.checked) renderSelectedProducts();
    });

    govtInput.addEventListener('input', updateTotal);
    serviceInput.addEventListener('input', updateTotal);

    function updateTotal() {
      const total = Number(govtInput.value || 0) + Number(serviceInput.value || 0);
      totalInput.value = total;
    }
  });
}

function renderSelectedProducts() {
  if (!customPriceSwitch.checked) {
    selectedSection.style.display = 'none';
    selectedProductsEl.innerHTML = '';
    return;
  }

  selectedSection.style.display = 'block';
  selectedProductsEl.innerHTML = '';

  productsData.forEach((p, index) => {
    const listCheckbox = document.getElementById(`product_${index}`);
    if (!listCheckbox || !listCheckbox.checked) return;

    const row = document.createElement('div');
    row.classList.add('product-item');
    row.innerHTML = `
      <input type="checkbox" id="sel_product_${index}" data-index="${index}" />
      <label>${p.productName} - $${Number(p.totalAmount ?? 0)}</label>
      <div class="custom-price" id="sel_customPrice_${index}" style="display:none">
        Govt Fee: <input type="number" value="${p.govtFee}" id="sel_govtFee_${index}" /> |
        Service Fee: <input type="number" value="${p.serviceFee}" id="sel_serviceFee_${index}" /> |
        Total: <input type="number" value="${p.totalAmount}" id="sel_total_${index}" readonly />
      </div>
    `;
    selectedProductsEl.appendChild(row);

    const selCheckbox = document.getElementById(`sel_product_${index}`);
    const selDiv = document.getElementById(`sel_customPrice_${index}`);
    const selGovt = document.getElementById(`sel_govtFee_${index}`);
    const selService = document.getElementById(`sel_serviceFee_${index}`);
    const selTotal = document.getElementById(`sel_total_${index}`);

    selCheckbox.addEventListener('change', () => {
      selDiv.style.display = selCheckbox.checked ? 'block' : 'none';
    });

    function updateSelTotal() {
      const total = Number(selGovt.value || 0) + Number(selService.value || 0);
      selTotal.value = total;
    }
    selGovt.addEventListener('input', updateSelTotal);
    selService.addEventListener('input', updateSelTotal);
  });
}

// Toggle custom price mode
customPriceSwitch.addEventListener('change', () => {
  // always hide inline custom sections; use selected area below
  productsData.forEach((_, index) => {
    const customDiv = document.getElementById(`customPrice_${index}`);
    if (customDiv) customDiv.style.display = 'none';
  });
  renderSelectedProducts();
});

// Submit selected products
submitBtn.addEventListener('click', async () => {
  const nationality = nationalityDropdown.value;
  const destination = destinationDropdown.value;

  const selectedProducts = productsData
    .map((p, index) => {
      const checkbox = document.getElementById(`product_${index}`);
      if (checkbox.checked) {
        const useSelected = customPriceSwitch.checked && document.getElementById(`sel_govtFee_${index}`);
        const govtFee = Number((useSelected ? document.getElementById(`sel_govtFee_${index}`) : document.getElementById(`govtFee_${index}`)).value);
        const serviceFee = Number((useSelected ? document.getElementById(`sel_serviceFee_${index}`) : document.getElementById(`serviceFee_${index}`)).value);
        const totalAmount = Number((useSelected ? document.getElementById(`sel_total_${index}`) : document.getElementById(`total_${index}`)).value);
        return { nationality, destination, productName: p.productName, govtFee, serviceFee, totalAmount };
      }
      return null;
    })
    .filter(Boolean);

  const results = [];
  for (const product of selectedProducts) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await res.json();
    results.push(data);
  }

  responseEl.textContent = JSON.stringify(results, null, 2);
});

// Initialize
fetchDropdowns();
