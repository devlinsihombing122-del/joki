// Check session
if (localStorage.getItem('buyer_logged_in') !== 'true') {
    window.location.href = 'index.html';
}

const currentBuyerId = localStorage.getItem('current_buyer_id');
const currentBuyerName = localStorage.getItem('current_buyer_name');

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('buyer_logged_in');
    localStorage.removeItem('current_buyer_id');
    localStorage.removeItem('current_buyer_name');
    window.location.href = 'index.html';
});

// Load seller about
const sellerAbout = localStorage.getItem('seller_about') || 'Konsultan akademik profesional dengan pengalaman lebih dari 10 tahun.';

// Load orders
function loadBuyerOrders() {
    const buyerOrderIds = JSON.parse(localStorage.getItem(`buyer_orders_${currentBuyerId}`) || '[]');
    const allOrders = JSON.parse(localStorage.getItem('all_orders') || '[]');
    
    return buyerOrderIds.map(orderId => allOrders.find(o => o.id === orderId)).filter(Boolean);
}

// Display orders
function displayBuyerOrders() {
    const orders = loadBuyerOrders();
    const container = document.getElementById('orders-container');

    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">Tidak ada pesanan</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card buyer-order-card" onclick="openOrderDetail('${order.id}')">
            <div class="order-card-header">
                <span class="order-number">Order #${order.id.substring(0, 8)}</span>
                <span class="status-badge status-${order.status}">${getStatusLabel(order.status)}</span>
            </div>
            <div class="order-card-body">
                <p><strong>${order.serviceType}</strong></p>
                <p style="font-size: 0.9rem; color: #666;">${order.serviceDesc.substring(0, 80)}...</p>
                <p style="font-size: 0.9rem; color: #808080;">Durasi: ${order.duration} Hari</p>
            </div>
            <div class="order-card-footer">
                <span class="price">Rp ${order.price.toLocaleString('id-ID')}</span>
                <span class="payment-status ${order.paymentStatus === 'verified' ? 'verified' : 'pending'}">
                    ${order.paymentStatus === 'verified' ? '✓ Dibayar' : '⏳ Belum Dibayar'}
                </span>
            </div>
        </div>
    `).join('');
}

function getStatusLabel(status) {
    const labels = {
        'checking': 'Pengecekan',
        'queued': 'Antrian',
        'working': 'Dikerjakan',
        'completed': 'Selesai'
    };
    return labels[status] || status;
}

// Open order detail
function openOrderDetail(orderId) {
    const allOrders = JSON.parse(localStorage.getItem('all_orders') || '[]');
    const order = allOrders.find(o => o.id === orderId);

    if (!order) return;

    document.getElementById('detail-order-id').textContent = '#' + orderId.substring(0, 8);
    document.getElementById('detail-service-type').textContent = order.serviceType;
    document.getElementById('detail-service-desc').textContent = order.serviceDesc;
    document.getElementById('detail-duration').textContent = order.duration;
    document.getElementById('detail-price').textContent = 'Rp ' + order.price.toLocaleString('id-ID');
    document.getElementById('detail-current-status').textContent = getStatusLabel(order.status);
    document.getElementById('detail-seller-about').textContent = sellerAbout;

    // Update status timeline
    updateStatusTimeline(order.status);

    // Show queue info if in queue
    if (order.status === 'queued' && order.queueNumber) {
        document.getElementById('detail-queue-info').style.display = 'block';
        document.getElementById('detail-queue-number').textContent = order.queueNumber;
    } else {
        document.getElementById('detail-queue-info').style.display = 'none';
    }

    // Load chat
    const chat = JSON.parse(localStorage.getItem(`chat_${orderId}`) || '[]');
    const chatDiv = document.getElementById('detail-chat-messages');
    chatDiv.innerHTML = chat.map(msg => `
        <div class="chat-message ${msg.sender === 'buyer' ? 'buyer' : 'seller'}">
            <p>${msg.text}</p>
            <small>${new Date(msg.time).toLocaleTimeString('id-ID')}</small>
        </div>
    `).join('');

    // Show result if completed
    if (order.status === 'completed' && order.workResult) {
        document.getElementById('result-section').style.display = 'block';
        document.getElementById('detail-result').innerHTML = `
            <p><strong>File:</strong> ${order.resultFileName}</p>
            <a href="${order.workResult}" class="btn-secondary" download="${order.resultFileName}">Download Hasil</a>
        `;
    } else {
        document.getElementById('result-section').style.display = 'none';
    }

    document.currentOrderId = orderId;
    document.getElementById('order-detail-modal').style.display = 'block';
}

function updateStatusTimeline(currentStatus) {
    const steps = document.querySelectorAll('.status-step');
    const statusOrder = ['checking', 'queued', 'working', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);

    steps.forEach((step, index) => {
        if (index < currentIndex) {
            step.classList.add('completed');
        } else if (index === currentIndex) {
            step.classList.add('active');
        } else {
            step.classList.remove('completed', 'active');
        }
    });
}

// Send message
function sendBuyerMessage() {
    const input = document.getElementById('detail-chat-input');
    const message = input.value.trim();

    if (!message) return;

    const orderId = document.currentOrderId;
    const chat = JSON.parse(localStorage.getItem(`chat_${orderId}`) || '[]');

    chat.push({
        sender: 'buyer',
        text: message,
        time: new Date().toISOString()
    });

    localStorage.setItem(`chat_${orderId}`, JSON.stringify(chat));
    input.value = '';

    openOrderDetail(orderId);
}

// Modal close
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('order-detail-modal').style.display = 'none';
});

window.onclick = (event) => {
    const modal = document.getElementById('order-detail-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// Initial load
displayBuyerOrders();