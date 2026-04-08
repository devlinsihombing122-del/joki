// Check session
function checkSellerSession() {
    if (localStorage.getItem('seller_logged_in') !== 'true') {
        window.location.href = 'index.html';
        return;
    }
}

checkSellerSession();

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('seller_logged_in');
    localStorage.removeItem('seller_session_token');
    localStorage.removeItem('seller_login_time');
    window.location.href = 'index.html';
});

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.seller-section').forEach(s => s.classList.remove('active'));
        
        item.classList.add('active');
        const section = item.dataset.section;
        document.getElementById(`${section}-section`).classList.add('active');
    });
});

// Load orders from localStorage
function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('all_orders') || '[]');
    return orders;
}

// Display orders
function displayOrders() {
    const orders = loadOrders();
    const ordersList = document.getElementById('orders-list');
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p style="text-align: center; color: #999;">Tidak ada pesanan masuk</p>';
        return;
    }

    ordersList.innerHTML = orders.map(order => `
        <div class="order-card" onclick="openOrderModal('${order.id}')">
            <div class="order-header">
                <span class="order-id">Order #${order.id.substring(0, 8)}</span>
                <span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span>
            </div>
            <div class="order-body">
                <p><strong>${order.customerName}</strong></p>
                <p>${order.serviceType}</p>
                <p style="font-size: 0.9rem; color: #808080;">Durasi: ${order.duration} Hari</p>
            </div>
            <div class="order-footer">
                <span class="price">Rp ${order.price.toLocaleString('id-ID')}</span>
                <span class="payment-status ${order.paymentStatus === 'verified' ? 'verified' : 'pending'}">
                    ${order.paymentStatus === 'verified' ? '✓ Pembayaran Diterima' : '⏳ Menunggu Pembayaran'}
                </span>
            </div>
        </div>
    `).join('');

    // Update notification count
    const pendingOrders = orders.filter(o => o.status === 'checking').length;
    document.getElementById('notif-count').textContent = pendingOrders;
}

function getStatusLabel(status) {
    const labels = {
        'checking': 'Pengecekan',
        'queued': 'Antrian',
        'working': 'Dikerjakan',
        'completed': 'Siap Selesai'
    };
    return labels[status] || status;
}

// Open order modal
function openOrderModal(orderId) {
    const orders = loadOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (!order) return;

    document.getElementById('modal-order-id').textContent = `Order #${orderId.substring(0, 8)}`;
    document.getElementById('modal-customer-name').textContent = order.customerName;
    document.getElementById('modal-customer-email').textContent = order.customerEmail;
    document.getElementById('modal-service-type').textContent = order.serviceType;
    document.getElementById('modal-service-desc').textContent = order.serviceDesc;
    document.getElementById('modal-service-duration').textContent = `${order.duration} Hari`;
    document.getElementById('modal-service-price').textContent = `Rp ${order.price.toLocaleString('id-ID')}`;
    document.getElementById('modal-payment-status').textContent = order.paymentStatus === 'verified' ? '✓ Sudah Dibayar' : '⏳ Menunggu';
    
    if (order.paymentProof) {
        document.getElementById('modal-payment-proof').src = order.paymentProof;
    }

    // Load chat
    const chat = JSON.parse(localStorage.getItem(`chat_${orderId}`) || '[]');
    const chatDiv = document.getElementById('modal-chat-messages');
    chatDiv.innerHTML = chat.map(msg => `
        <div class="chat-message ${msg.sender === 'seller' ? 'seller' : 'buyer'}">
            <p>${msg.text}</p>
            <small>${new Date(msg.time).toLocaleTimeString('id-ID')}</small>
        </div>
    `).join('');

    // Store current order ID for chat and status update
    document.currentOrderId = orderId;

    // Set status buttons
    const statusButtons = document.querySelectorAll('.btn-status');
    statusButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === order.status) {
            btn.classList.add('active');
        }
    });

    document.getElementById('order-modal').style.display = 'block';
}

// Status buttons
document.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const status = btn.dataset.status;
        const orderId = document.currentOrderId;
        
        if (status === 'queued') {
            document.getElementById('queue-info').style.display = 'block';
        } else {
            document.getElementById('queue-info').style.display = 'none';
        }

        if (status === 'completed') {
            document.getElementById('completion-info').style.display = 'block';
        } else {
            document.getElementById('completion-info').style.display = 'none';
        }

        // Update status
        const orders = loadOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            if (status === 'queued' && document.getElementById('queue-number').value) {
                order.queueNumber = parseInt(document.getElementById('queue-number').value);
            }
            localStorage.setItem('all_orders', JSON.stringify(orders));
            displayOrders();
        }

        document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Upload work result
function uploadWorkResult() {
    const file = document.getElementById('work-result-file').files[0];
    if (!file) {
        alert('Pilih file terlebih dahulu');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const orderId = document.currentOrderId;
        const orders = loadOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            order.workResult = e.target.result; // Base64 encoded
            order.resultFileName = file.name;
            localStorage.setItem('all_orders', JSON.stringify(orders));
            alert('Hasil pekerjaan berhasil di-upload');
            closeOrderModal();
        }
    };
    reader.readAsDataURL(file);
}

// Send message
function sendSellerMessage() {
    const input = document.getElementById('modal-chat-input');
    const message = input.value.trim();
    
    if (!message) return;

    const orderId = document.currentOrderId;
    const chat = JSON.parse(localStorage.getItem(`chat_${orderId}`) || '[]');
    
    chat.push({
        sender: 'seller',
        text: message,
        time: new Date().toISOString()
    });

    localStorage.setItem(`chat_${orderId}`, JSON.stringify(chat));
    input.value = '';
    
    // Reload chat
    openOrderModal(orderId);
}

// Modal close
document.querySelector('.close').addEventListener('click', closeOrderModal);
window.onclick = (event) => {
    const modal = document.getElementById('order-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
}

// Update about
function updateAbout() {
    const about = document.getElementById('about-text').value;
    localStorage.setItem('seller_about', about);
    alert('Profil berhasil diperbarui');
}

// Load seller about
const savedAbout = localStorage.getItem('seller_about');
if (savedAbout) {
    document.getElementById('about-text').value = savedAbout;
}

// Calculate earnings
function calculateEarnings() {
    const orders = loadOrders();
    const completedOrders = orders.filter(o => o.status === 'completed');
    const total = completedOrders.reduce((sum, o) => sum + o.price, 0);
    
    document.getElementById('total-earnings').textContent = `Rp ${total.toLocaleString('id-ID')}`;
    document.getElementById('completed-orders').textContent = completedOrders.length;
}

// Initial load
displayOrders();
calculateEarnings();