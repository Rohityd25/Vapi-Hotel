/**
 * =============================================
 *  ROOM-DETAIL.JS - Single Room Page
 * =============================================
 * Room info, gallery, availability check,
 * price calculation, booking modal, payment.
 */

let currentRoom   = null;
let pendingBookingId = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('id');

  if (!roomId) {
    showError();
    return;
  }

  // Pre-fill from search params
  if (params.get('checkIn'))  document.getElementById('widgetCheckIn').value  = params.get('checkIn');
  if (params.get('checkOut')) document.getElementById('widgetCheckOut').value = params.get('checkOut');

  // Set min dates
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  document.getElementById('widgetCheckIn').min  = today;
  document.getElementById('widgetCheckOut').min = tomorrow;
  if (!document.getElementById('widgetCheckIn').value)  document.getElementById('widgetCheckIn').value  = today;
  if (!document.getElementById('widgetCheckOut').value) document.getElementById('widgetCheckOut').value = tomorrow;

  loadRoom(roomId);
});

async function loadRoom(id) {
  document.getElementById('roomLoading').style.display = 'block';
  document.getElementById('roomContent').style.display = 'none';
  document.getElementById('roomError').style.display   = 'none';

  try {
    const data = await RoomsAPI.getById(id);
    currentRoom = data.room;
    renderRoom(currentRoom);
    calcPrice();
  } catch (err) {
    showError();
  }
}

function renderRoom(room) {
  document.getElementById('roomLoading').style.display = 'none';
  document.getElementById('roomContent').style.display = 'block';

  document.title = `${room.name} — Hotel Vapi`;
  document.getElementById('breadcrumbRoom').textContent = room.name;

  // Gallery
  const mainImg = document.getElementById('galleryMainImg');
  const thumbs  = document.getElementById('galleryThumbs');
  const imgs = room.images?.length
    ? room.images
    : [{ url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200' }];

  mainImg.src = imgs[0].url;
  mainImg.alt = room.name;
  thumbs.innerHTML = imgs.map((img, i) => `
    <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchGallery(${i}, '${img.url}', this)">
      <img src="${img.url}" alt="Room image ${i+1}" loading="lazy"/>
    </div>
  `).join('');

  document.getElementById('roomTypeBadge').textContent = room.roomType;

  // Details
  document.getElementById('roomName').textContent     = room.name;
  document.getElementById('roomNumber').textContent   = `🔑 Room ${room.roomNumber}`;
  document.getElementById('roomFloor').textContent    = `🏢 Floor ${room.floor || 1}`;
  document.getElementById('roomCapacity').textContent = `👥 Up to ${room.capacity} Guests`;
  document.getElementById('roomDescription').textContent = room.description;

  // Rating
  const rating = room.ratings || 0;
  document.getElementById('starsDisplay').textContent  = '⭐'.repeat(Math.round(rating));
  document.getElementById('ratingValue').textContent   = rating.toFixed(1);
  document.getElementById('reviewCount').textContent   = `(${room.numOfReviews || 0} reviews)`;

  // Price
  const priceStr = `₹${Number(room.pricePerNight).toLocaleString('en-IN')}`;
  document.getElementById('roomPrice').textContent   = priceStr;
  document.getElementById('widgetPrice').textContent = priceStr;

  // Amenities
  const amenMap = {
    wifi:'📶 WiFi', ac:'❄️ Air Conditioning', tv:'📺 Smart TV',
    minibar:'🍹 Minibar', balcony:'🌅 Private Balcony', jacuzzi:'🛁 Jacuzzi',
    breakfast:'🍳 Complimentary Breakfast', parking:'🚗 Free Parking',
    gym:'🏋️ Gym Access', swimmingPool:'🏊 Swimming Pool',
  };
  const amenList = document.getElementById('amenitiesList');
  amenList.innerHTML = Object.entries(amenMap)
    .map(([key, label]) => {
      const has = room.amenities?.[key];
      return `<div class="amenity-item" style="${has ? '' : 'opacity:0.35'}">
        <span class="check">${has ? '✅' : '❌'}</span> ${label}
      </div>`;
    }).join('');

  // Reviews
  renderReviews(room.reviews || []);
}

function switchGallery(index, url, thumbEl) {
  document.getElementById('galleryMainImg').src = url;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
}

function renderReviews(reviews) {
  const list = document.getElementById('reviewsList');
  if (!reviews.length) {
    list.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
    return;
  }
  list.innerHTML = reviews.slice(0,5).map(r => `
    <div class="review-card">
      <div class="review-header">
        <span class="review-name">${r.name}</span>
        <span class="review-date">${formatDate(r.date)}</span>
      </div>
      <div class="review-stars">${'⭐'.repeat(r.rating)}</div>
      <p class="review-comment">${r.comment}</p>
    </div>
  `).join('');
}

// ── Price Calculator ───────────────────────────────────────────────────────────
async function calcPrice() {
  if (!currentRoom) return;
  const ci = document.getElementById('widgetCheckIn').value;
  const co = document.getElementById('widgetCheckOut').value;
  const breakdown = document.getElementById('priceBreakdown');
  const statusEl  = document.getElementById('availabilityStatus');
  const bookBtn   = document.getElementById('bookNowBtn');

  breakdown.style.display  = 'none';
  statusEl.textContent     = '';
  statusEl.className       = 'availability-status';

  if (!ci || !co) return;

  // Update check-out min
  document.getElementById('widgetCheckOut').min = ci;

  const checkIn  = new Date(ci);
  const checkOut = new Date(co);
  if (checkOut <= checkIn) return;

  const nights   = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const ppn      = currentRoom.pricePerNight;
  const subtotal = ppn * nights;
  const tax      = Math.round(subtotal * 0.18);
  const total    = subtotal + tax;

  document.getElementById('pbPPN').textContent    = ppn.toLocaleString('en-IN');
  document.getElementById('pbNights').textContent = nights;
  document.getElementById('pbSubtotal').textContent = subtotal.toLocaleString('en-IN');
  document.getElementById('pbTax').textContent    = tax.toLocaleString('en-IN');
  document.getElementById('pbTotal').textContent  = total.toLocaleString('en-IN');
  breakdown.style.display = 'block';

  // Check availability from API
  try {
    const avail = await RoomsAPI.checkAvail(currentRoom._id, { checkIn: ci, checkOut: co });
    if (avail.isAvailable) {
      statusEl.textContent = '✅ Available for your dates!';
      statusEl.classList.add('available');
      bookBtn.disabled = false;
    } else {
      statusEl.textContent = '❌ Not available for selected dates';
      statusEl.classList.add('unavailable');
      bookBtn.disabled = true;
    }
  } catch {
    statusEl.textContent = '⚠️ Could not check availability';
  }
}

// ── Initiate Booking ──────────────────────────────────────────────────────────
async function initiateBooking() {
  if (!requireAuth()) return;

  const ci = document.getElementById('widgetCheckIn').value;
  const co = document.getElementById('widgetCheckOut').value;
  if (!ci || !co) { showToast('Please select dates.', 'warning'); return; }

  const nights = Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
  const total  = Math.round(currentRoom.pricePerNight * nights * 1.18);

  // Fill modal info
  document.getElementById('modalRoomName').textContent = currentRoom.name;
  document.getElementById('modalCheckIn').textContent  = formatDate(ci);
  document.getElementById('modalCheckOut').textContent = formatDate(co);
  document.getElementById('modalNights').textContent   = nights;
  document.getElementById('modalTotal').textContent    = total.toLocaleString('en-IN');

  document.getElementById('bookingModal').style.display = 'flex';
}

// ── Mock Payment ──────────────────────────────────────────────────────────────
async function proceedWithMockPayment() {
  closeModal('bookingModal');
  const btn = document.getElementById('bookNowBtn');
  btn.disabled = true; btn.textContent = 'Processing...';

  try {
    const user    = JSON.parse(localStorage.getItem('user') || '{}');
    const ci      = document.getElementById('widgetCheckIn').value;
    const co      = document.getElementById('widgetCheckOut').value;
    const guests  = document.getElementById('widgetGuests').value;
    const special = document.getElementById('widgetSpecial').value;

    // Step 1: Create booking
    const bookData = await BookingsAPI.create({
      roomId:          currentRoom._id,
      checkIn:         ci,
      checkOut:        co,
      numOfGuests:     parseInt(guests),
      specialRequests: special,
      guestInfo:       { name: user.name, email: user.email, phone: user.phone || 'N/A' },
    });

    pendingBookingId = bookData.booking._id;

    // Step 2: Mock pay
    await PaymentsAPI.mockPay({ bookingId: pendingBookingId });

    showToast(`🎉 Booking confirmed! #${bookData.booking.confirmationNumber}`, 'success');
    setTimeout(() => { window.location.href = '/dashboard.html'; }, 2000);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Book Now';
  }
}

// ── Razorpay Payment ──────────────────────────────────────────────────────────
async function proceedWithRazorpay() {
  closeModal('bookingModal');
  const btn = document.getElementById('bookNowBtn');
  btn.disabled = true; btn.textContent = 'Opening payment...';

  try {
    const user    = JSON.parse(localStorage.getItem('user') || '{}');
    const ci      = document.getElementById('widgetCheckIn').value;
    const co      = document.getElementById('widgetCheckOut').value;
    const guests  = document.getElementById('widgetGuests').value;
    const special = document.getElementById('widgetSpecial').value;

    const bookData = await BookingsAPI.create({
      roomId: currentRoom._id, checkIn: ci, checkOut: co,
      numOfGuests: parseInt(guests), specialRequests: special,
      guestInfo: { name: user.name, email: user.email, phone: user.phone || 'N/A' },
    });

    pendingBookingId = bookData.booking._id;
    const orderData = await PaymentsAPI.createOrder({ bookingId: pendingBookingId });

    if (orderData.isMock) { await proceedWithMockPayment(); return; }

    const options = {
      key:          orderData.key_id,
      amount:       orderData.order.amount,
      currency:     'INR',
      name:         'Hotel Vapi',
      description:  `Booking #${bookData.booking.confirmationNumber}`,
      order_id:     orderData.order.id,
      handler: async (response) => {
        try {
          await PaymentsAPI.verify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            bookingId:           pendingBookingId,
          });
          showToast('🎉 Payment successful! Booking confirmed.', 'success');
          setTimeout(() => { window.location.href = '/dashboard.html'; }, 2000);
        } catch (e) { showToast(e.message, 'error'); }
      },
      prefill: { name: user.name, email: user.email },
      theme:   { color: '#c9a96e' },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Book Now';
  }
}

function showError() {
  document.getElementById('roomLoading').style.display = 'none';
  document.getElementById('roomError').style.display  = 'block';
}
