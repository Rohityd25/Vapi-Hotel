/**
 * =============================================
 *  MAIN.JS - Homepage Logic
 * =============================================
 * Handles: hero animations, stats counter,
 * featured rooms, testimonials slider, contact.
 */

document.addEventListener('DOMContentLoaded', () => {
  setTodayDates();
  loadFeaturedRooms();
  initStatsCounter();
  initTestimonialsAutoSlide();
  initParticles();
  initHeroSlideshow();
});

// ── Set today and tomorrow as default dates ───────────────────────────────────
function setTodayDates() {
  const today    = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fmt = (d) => d.toISOString().split('T')[0];

  const ci = document.getElementById('heroCheckIn');
  const co = document.getElementById('heroCheckOut');
  if (ci) { ci.value = fmt(today);    ci.min = fmt(today); }
  if (co) { co.value = fmt(tomorrow); co.min = fmt(tomorrow); }
}

// ── Search rooms (redirect to rooms.html with params) ────────────────────────
function searchRooms() {
  const checkIn  = document.getElementById('heroCheckIn')?.value;
  const checkOut = document.getElementById('heroCheckOut')?.value;
  const guests   = document.getElementById('heroGuests')?.value;

  if (!checkIn || !checkOut) {
    showToast('Please select check-in and check-out dates.', 'warning');
    return;
  }

  const params = new URLSearchParams({ checkIn, checkOut, capacity: guests });
  window.location.href = `/rooms.html?${params}`;
}

// ── Load Featured Rooms (first 3 from API) ─────────────────────────────────
async function loadFeaturedRooms() {
  const grid = document.getElementById('featuredRoomsGrid');
  if (!grid) return;

  try {
    const data = await RoomsAPI.getAll({ limit: 3, sort: '-ratings' });
    grid.innerHTML = '';

    if (!data.rooms?.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">No rooms available yet.</p>';
      return;
    }

    data.rooms.forEach(room => {
      grid.appendChild(createRoomCard(room));
    });
  } catch (err) {
    // Show placeholder cards if backend not connected
    grid.innerHTML = getFallbackRooms();
  }
}

// ── Build a Room Card element ─────────────────────────────────────────────────
function createRoomCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';
  card.onclick = () => window.location.href = `/room-detail.html?id=${room._id}`;

  const img    = room.images?.[0]?.url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600';
  const stars  = '⭐'.repeat(Math.round(room.ratings || 0));
  const amenTags = buildAmenityTags(room.amenities);

  card.innerHTML = `
    <div class="room-card-img">
      <img src="${img}" alt="${room.name}" loading="lazy" />
      <span class="room-type-badge">${room.roomType}</span>
    </div>
    <div class="room-card-body">
      <h3 class="room-card-title">${room.name}</h3>
      <div class="room-card-rating">
        <span class="room-rating-stars">${stars || '☆☆☆☆☆'}</span>
        <span class="room-rating-num">${room.ratings?.toFixed(1) || '0.0'} (${room.numOfReviews || 0} reviews)</span>
      </div>
      <div class="room-card-amenities">${amenTags}</div>
      <div class="room-card-footer">
        <div class="room-price">₹${Number(room.pricePerNight).toLocaleString('en-IN')} <span>/ night</span></div>
        <button class="btn btn-gold" onclick="event.stopPropagation();window.location.href='/room-detail.html?id=${room._id}'">Book Now</button>
      </div>
    </div>
  `;
  return card;
}

function buildAmenityTags(amenities = {}) {
  const map = { wifi: '📶 WiFi', ac: '❄️ AC', tv: '📺 TV', breakfast: '🍳 Breakfast', balcony: '🌅 Balcony', jacuzzi: '🛁 Jacuzzi', gym: '🏋️ Gym', parking: '🚗 Parking' };
  return Object.entries(amenities)
    .filter(([, v]) => v)
    .slice(0, 4)
    .map(([k]) => `<span class="amenity-tag">${map[k] || k}</span>`)
    .join('');
}

function getFallbackRooms() {
  const rooms = [
    { name: 'Deluxe Pool Side', type: 'Deluxe', price: '4,500', img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600', stars: 5 },
    { name: 'Executive Suite',  type: 'Suite',   price: '8,500', img: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=600', stars: 5 },
    { name: 'Family Comfort',   type: 'Family',  price: '5,500', img: 'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=600', stars: 4 },
  ];
  return rooms.map(r => `
    <div class="room-card" onclick="window.location.href='/rooms.html'">
      <div class="room-card-img">
        <img src="${r.img}" alt="${r.name}" loading="lazy"/>
        <span class="room-type-badge">${r.type}</span>
      </div>
      <div class="room-card-body">
        <h3 class="room-card-title">${r.name}</h3>
        <div class="room-card-rating">
          <span class="room-rating-stars">${'⭐'.repeat(r.stars)}</span>
          <span class="room-rating-num">${r.stars}.0</span>
        </div>
        <div class="room-card-amenities">
          <span class="amenity-tag">📶 WiFi</span><span class="amenity-tag">❄️ AC</span><span class="amenity-tag">🍳 Breakfast</span>
        </div>
        <div class="room-card-footer">
          <div class="room-price">₹${r.price} <span>/ night</span></div>
          <button class="btn btn-gold">Book Now</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Animated Stats Counter ────────────────────────────────────────────────────
function initStatsCounter() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.target);
      let current  = 0;
      const step   = Math.ceil(target / 60);
      const timer  = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current;
      }, 25);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-number[data-target]').forEach(el => observer.observe(el));
}

// ── Testimonials Auto Slider ──────────────────────────────────────────────────
let currentSlide = 0;
function goToSlide(index) {
  const cards = document.querySelectorAll('.testimonial-card');
  const dots  = document.querySelectorAll('.dot');
  if (!cards.length) return;

  cards.forEach(c => c.classList.remove('active'));
  dots.forEach(d  => d.classList.remove('active'));
  currentSlide = (index + cards.length) % cards.length;
  cards[currentSlide].classList.add('active');
  if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

function initTestimonialsAutoSlide() {
  setInterval(() => goToSlide(currentSlide + 1), 5000);
}

// ── Particles background (hero) ───────────────────────────────────────────────
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:absolute; width:${Math.random()*3+1}px; height:${Math.random()*3+1}px;
      background:rgba(201,169,110,${Math.random()*0.4+0.1}); border-radius:50%;
      left:${Math.random()*100}%; top:${Math.random()*100}%;
      animation: float${i % 3} ${Math.random()*10+8}s infinite ease-in-out;
    `;
    container.appendChild(p);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes float0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
    @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-30px)} }
    @keyframes float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
  `;
  document.head.appendChild(style);
}

// ── Contact Form ──────────────────────────────────────────────────────────────
function submitContactForm(e) {
  e.preventDefault();
  showToast('Message sent! We\'ll get back to you within 24 hours.', 'success');
  e.target.reset();
}

// ── Hero Background Slideshow ─────────────────────────────────────────────────
function initHeroSlideshow() {
  const slides  = document.querySelectorAll('.hero-slide');
  const dotsWrap = document.getElementById('heroSlideDots');
  if (!slides.length || !dotsWrap) return;

  let current    = 0;
  let timer      = null;
  const INTERVAL = 5000; // 5 seconds per slide

  // Build indicator dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = `hero-dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goSlide(i));
    dotsWrap.appendChild(dot);
  });

  function goSlide(index) {
    // Deactivate current
    slides[current].classList.remove('active');
    dotsWrap.children[current].classList.remove('active');

    // Activate new
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dotsWrap.children[current].classList.add('active');
  }

  function nextSlide() { goSlide(current + 1); }

  function startTimer() {
    stopTimer();
    timer = setInterval(nextSlide, INTERVAL);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Pause on hover for better UX
  const hero = document.getElementById('hero');
  if (hero) {
    hero.addEventListener('mouseenter', stopTimer);
    hero.addEventListener('mouseleave', startTimer);
  }

  startTimer();
}
