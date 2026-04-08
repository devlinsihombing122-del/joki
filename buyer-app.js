// Check if logged in
function checkBuyerSession() {
    const isLoggedIn = localStorage.getItem('buyer_logged_in') === 'true';
    if (isLoggedIn) {
        document.getElementById('menu-logout').style.display = 'inline-block';
        document.getElementById('menu-login').style.display = 'none';
    }
}

checkBuyerSession();

// Load seller about
const savedSellerAbout = localStorage.getItem('seller_about');
if (savedSellerAbout) {
    document.getElementById('seller-about-text').textContent = savedSellerAbout;
}

// Auth Modal
const authModal = document.getElementById('auth-modal');
const orderModal = document.getElementById('order-modal');
const paymentModal = document.getElementById('payment-modal');

document.getElementById('menu-login').addEventListener('click', () => {
    authModal.style.display = 'block';
});

document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const users = JSON.parse(localStorage.getItem('buyers_users') || '[]');
    const user = users.find(u => u.email === email);

    if (user && user.password === password) { // Dalam produksi gunakan bcrypt
        localStorage.setItem('buyer_logged_in', 'true');
        localStorage.setItem('current_buyer_id', user.id);
        localStorage.setItem('current_buyer_name', user.name);
        authModal.style.display = 'none';
        checkBuyerSession();
        alert('Berhasil masuk!');
        location.reload();
    } else {
        document.getElementById('auth-message').textContent = 'Email atau password salah';
        document.getElementById('auth-message').style.display = 'block';
    }
});

// Register
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
        document.getElementById('auth-message').textContent = 'Password tidak cocok';
        document.getElementById('auth-message').style.display = 'block';
        return;
    }

    if (password.length < 6) {
        document.getElementById('auth-message').textContent = 'Password minimal 6 karakter';
        document.getElementById('auth-message').style.display = 'block';
        return;
    }

    const users = JSON.parse(localStorage.getItem('buyers_users') || '[]');
    if (users.find(u => u.email === email)) {
        document.getElementById('auth-message').textContent = 'Email sudah terdaftar';
        document.getElementById('auth-message').style.display = 'block';
        return;
    }

    const newUser = {
        id: 'buyer_' + Date.now(),
        name: name,
        email: email,
        password: password // Dalam produksi hash dengan bcrypt
    };

    users.push(newUser);
    localStorage.setItem('buyers_users', JSON.stringify(users));

    localStorage.setItem('buyer_logged_in', 'true');
    localStorage.setItem('current_buyer_id', newUser.id);
    localStorage.setItem('current_buyer_name', newUser.name);
    authModal.style.display = 'none';
    checkBuyerSession();
    alert('Pendaftaran berhasil!');
    location.reload();
});

// Order button
document.querySelector('.btn-cta').addEventListener('click', () => {
    if (localStorage.getItem('buyer_logged_in') !== 'true') {
        authModal.style.display = 'block';
    } else {
        orderModal.style.display = 'block';
    }
});

// Order form
document.getElementById('order-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const serviceType = document.getElementById('service-type').value;
    const serviceDesc = document.getElementById('service-desc').value;
    const duration = document.getElementById('service-duration').value;
    const price = document.getElementById('service-price').value;

    // Show payment modal with details
    document.getElementById('payment-details').innerHTML = `
        <p><strong>Jenis Jasa:</strong> ${serviceType}</p>
        <p><strong>Deskripsi:</strong> ${serviceDesc}</p>
        <p><strong>Durasi:</strong> ${duration} Hari</p>
        <p><strong>Nominal:</strong> Rp ${parseInt(price).toLocaleString('id-ID')}</p>
    `;

    // Store temporary order data
    window.tempOrderData = {
        id: 'order_' + Date.now(),
        serviceType,
        serviceDesc,
        duration,
        price,
        customerName: localStorage.getItem('current_buyer_name'),
        customerEmail: document.getElementById('login-email').value || localStorage.getItem('current_buyer_email'),
        customerID: localStorage.getItem('current_buyer_id'),
        status: 'checking',
        paymentStatus: 'pending'
    };

    orderModal.style.display = 'none';
    paymentModal.style.display = 'block';
});

// Payment form
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const file = document.getElementById('payment-proof').files[0];
    if (!file) {
        alert('Pilih file bukti pembayaran');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const orderData = window.tempOrderData;
        orderData.paymentProof = event.target.result;
        orderData.proofFileName = file.name;
        orderData.createdAt = new Date().toISOString();

        // Save order
        const allOrders = JSON.parse(localStorage.getItem('all_orders') || '[]');
        allOrders.push(orderData);
        localStorage.setItem('all_orders', JSON.stringify(allOrders));

        // Save buyer's order reference
        const buyerOrders = JSON.parse(localStorage.getItem(`buyer_orders_${orderData.customerID}`) || '[]');
        buyerOrders.push(orderData.id);
        localStorage.setItem(`buyer_orders_${orderData.customerID}`, JSON.stringify(buyerOrders));

        document.getElementById('payment-message').textContent = '✓ Bukti pembayaran berhasil dikirim! Pesanan Anda sedang diverifikasi.';
        document.getElementById('payment-message').style.display = 'block';

        setTimeout(() => {
            paymentModal.style.display = 'none';
            document.getElementById('payment-form').reset();
            window.tempOrderData = null;
            alert('Pesanan berhasil dibuat! Nomor Pesanan: ' + orderData.id.substring(0, 8));
        }, 2000);
    };
    reader.readAsDataURL(file);
});

// Cek Pesanan
document.getElementById('menu-cek-pesanan').addEventListener('click', () => {
    if (localStorage.getItem('buyer_logged_in') !== 'true') {
        authModal.style.display = 'block';
        return;
    }
    window.location.href = 'orders.html';
});

// Logout
document.getElementById('menu-logout').addEventListener('click', () => {
    localStorage.removeItem('buyer_logged_in');
    localStorage.removeItem('current_buyer_id');
    localStorage.removeItem('current_buyer_name');
    checkBuyerSession();
    location.reload();
});