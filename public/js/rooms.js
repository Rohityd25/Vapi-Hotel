/**
 * =============================================
 *  ROOMS.JS - Rooms Listing Page
 * =============================================
 * Filter, search, sort, paginate rooms.
 */

let currentPage = 1;
let searchTimer = null;
let allFilters  = {};
let maxPrice    = 25000;

document.addEventListener('DOMContentLoaded', () => {
  // Pre-fill dates from URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('checkIn'))  document.getElementById('filterCheckIn').value  = params.get('checkIn');
  if (params.get('checkOut')) document.getElementById('filterCheckOut').value = params.get('checkOut');
  if (params.get('capacity')) document.getElementById('filterGuests').value   = params.get('capacity');
  if (params.get('type')) {
    document.querySelectorAll('.type-filter').forEach(cb => {
      if (cb.value === params.get('type')) cb.checked = true;
    });
  }

  loadRooms();
});

// ── Load rooms with current filters ──────────────────────────────────────────
async function loadRooms() {
  const grid   = document.getElementById('roomsGrid');
  const count  = document.getElementById('roomsCount');
  const paging = document.getElementById('pagination');

  grid.innerHTML  = '<div class="room-skeleton"></div>'.repeat(6);
  count.textContent = 'Loading...';

  try {
    const params = buildFilterParams();
    const data   = await RoomsAPI.getAll(params);

    renderRooms(data.rooms || []);
    count.textContent = `${data.totalRooms || 0} room(s) found`;
    renderPagination(data.totalPages || 1, data.currentPage || 1);
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:4rem 0;">
      <div style="font-size:3rem;margin-bottom:1rem;">🔌</div>
      <p>Could not connect to server.</p>
      <p style="margin-top:.5rem;font-size:.85rem;">Make sure the backend is running (npm run dev)</p>
    </div>`;
    count.textContent = '0 rooms found';
  }
}

function buildFilterParams() {
  const checkIn  = document.getElementById('filterCheckIn')?.value;
  const checkOut = document.getElementById('filterCheckOut')?.value;
  const guests   = document.getElementById('filterGuests')?.value;
  const sort     = document.getElementById('sortBy')?.value;
  const keyword  = document.getElementById('roomSearch')?.value;
  const priceMin = document.getElementById('priceRangeMin')?.value;
  const priceMax = document.getElementById('priceRangeMax')?.value;

  const selectedTypes = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);

  const params = {
    page:  currentPage,
    limit: 9,
    sort:  sort || '-createdAt',
  };

  if (checkIn)            params.checkIn   = checkIn;
  if (checkOut)           params.checkOut  = checkOut;
  if (guests)             params.capacity  = guests;
  if (keyword)            params.keyword   = keyword;
  if (priceMin && priceMin > 0)   params.minPrice  = priceMin;
  if (priceMax && priceMax < 25000) params.maxPrice = priceMax;
  if (selectedTypes.length === 1) params.roomType = selectedTypes[0];

  return params;
}

function renderRooms(rooms) {
  const grid = document.getElementById('roomsGrid');
  if (!rooms.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem 0;color:var(--text-muted);">
      <div style="font-size:3rem;margin-bottom:1rem;">🔍</div>
      <p>No rooms match your filters.</p>
      <button class="btn btn-outline" style="margin-top:1rem;" onclick="clearFilters()">Clear Filters</button>
    </div>`;
    return;
  }

  grid.innerHTML = '';
  rooms.forEach(room => {
    const card = createRoomCard(room);
    grid.appendChild(card);
  });
}

// Reuse card builder from main.js (already in global scope via api.js/main.js)
// If not loaded, define locally
if (typeof createRoomCard === 'undefined') {
  function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.onclick = () => window.location.href = `/room-detail.html?id=${room._id}`;
    const img  = room.images?.[0]?.url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600';
    const amenMap = { wifi:'📶 WiFi', ac:'❄️ AC', tv:'📺 TV', breakfast:'🍳 Breakfast', balcony:'🌅 Balcony', jacuzzi:'🛁 Jacuzzi' };
    const tags = Object.entries(room.amenities||{}).filter(([,v])=>v).slice(0,4).map(([k])=>`<span class="amenity-tag">${amenMap[k]||k}</span>`).join('');
    card.innerHTML = `
      <div class="room-card-img">
        <img src="${img}" alt="${room.name}" loading="lazy"/>
        <span class="room-type-badge">${room.roomType}</span>
      </div>
      <div class="room-card-body">
        <h3 class="room-card-title">${room.name}</h3>
        <div class="room-card-rating">
          <span class="room-rating-stars">${'⭐'.repeat(Math.round(room.ratings||0))}</span>
          <span class="room-rating-num">${(room.ratings||0).toFixed(1)} (${room.numOfReviews||0})</span>
        </div>
        <div class="room-card-amenities">${tags}</div>
        <div class="room-card-footer">
          <div class="room-price">₹${Number(room.pricePerNight).toLocaleString('en-IN')} <span>/ night</span></div>
          <button class="btn btn-gold" onclick="event.stopPropagation();window.location.href='/room-detail.html?id=${room._id}'">Book</button>
        </div>
      </div>`;
    return card;
  }
}

function renderPagination(totalPages, currentPg) {
  const paging = document.getElementById('pagination');
  paging.innerHTML = '';
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === currentPg ? ' active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => { currentPage = i; loadRooms(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    paging.appendChild(btn);
  }
}

function applyFilters() { currentPage = 1; loadRooms(); }

function clearFilters() {
  document.getElementById('filterCheckIn').value  = '';
  document.getElementById('filterCheckOut').value = '';
  document.getElementById('filterGuests').value   = '';
  document.getElementById('roomSearch').value     = '';
  document.getElementById('sortBy').value         = '-createdAt';
  document.getElementById('priceRangeMin').value  = 0;
  document.getElementById('priceRangeMax').value  = 25000;
  document.getElementById('priceMin').textContent = '0';
  document.getElementById('priceMax').textContent = '25,000';
  document.querySelectorAll('.type-filter').forEach(cb => cb.checked = false);
  currentPage = 1;
  loadRooms();
}

function updatePriceFilter() {
  const min = parseInt(document.getElementById('priceRangeMin').value);
  const max = parseInt(document.getElementById('priceRangeMax').value);
  document.getElementById('priceMin').textContent = min.toLocaleString('en-IN');
  document.getElementById('priceMax').textContent = max.toLocaleString('en-IN');
  applyFilters();
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; loadRooms(); }, 400);
}

function toggleFilterSidebar() {
  document.getElementById('filterSidebar').classList.toggle('open');
}
