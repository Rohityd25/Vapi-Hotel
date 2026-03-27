/**
 * =============================================
 *  HOTEL VAPI - DATABASE SEED SCRIPT
 * =============================================
 * Run with: node seed.js
 * Seeds: Admin user, Guest user, 9 sample rooms
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// Load models
const User = require('./models/User');
const Room = require('./models/Room');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel-vapi';

// ─── Sample Rooms Data ─────────────────────────────────────────────────────────
const rooms = [
  {
    name: 'Deluxe Pool Side Room',
    description: 'Wake up to stunning pool views in this elegantly designed deluxe room. Featuring premium furnishings, a king-sized bed, and modern amenities, this room offers the perfect blend of comfort and luxury.',
    roomType: 'Deluxe',
    pricePerNight: 4500,
    capacity: 2,
    floor: 2,
    roomNumber: '201',
    ratings: 4.8,
    numOfReviews: 24,
    amenities: { wifi: true, ac: true, tv: true, minibar: true, balcony: true, breakfast: true, parking: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80', public_id: 'room_201_1' },
      { url: 'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800&q=80', public_id: 'room_201_2' },
    ],
  },
  {
    name: 'Executive Business Suite',
    description: 'The ultimate in corporate luxury. This expansive suite features a separate living room, a full working desk setup, and breathtaking city views — perfect for the modern executive.',
    roomType: 'Suite',
    pricePerNight: 8500,
    capacity: 2,
    floor: 5,
    roomNumber: '501',
    ratings: 4.9,
    numOfReviews: 18,
    amenities: { wifi: true, ac: true, tv: true, minibar: true, balcony: true, jacuzzi: true, breakfast: true, parking: true, gym: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=800&q=80', public_id: 'room_501_1' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', public_id: 'room_501_2' },
    ],
  },
  {
    name: 'Family Comfort Room',
    description: "Designed with families in mind, this spacious room features two queen beds, a dedicated kids corner, and easy access to the hotel's family-friendly amenities and pool.",
    roomType: 'Family',
    pricePerNight: 5500,
    capacity: 4,
    floor: 3,
    roomNumber: '301',
    ratings: 4.6,
    numOfReviews: 32,
    amenities: { wifi: true, ac: true, tv: true, breakfast: true, parking: true, swimmingPool: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80', public_id: 'room_301_1' },
      { url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80', public_id: 'room_301_2' },
    ],
  },
  {
    name: 'Presidential Grand Suite',
    description: 'The pinnacle of opulence. Our Presidential Suite boasts a private terrace, a marble jacuzzi, a dedicated butler, panoramic garden views, and the finest handcrafted furnishings.',
    roomType: 'Presidential',
    pricePerNight: 18000,
    capacity: 4,
    floor: 7,
    roomNumber: '701',
    ratings: 5.0,
    numOfReviews: 11,
    amenities: { wifi: true, ac: true, tv: true, minibar: true, balcony: true, jacuzzi: true, breakfast: true, parking: true, gym: true, swimmingPool: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80', public_id: 'room_701_1' },
      { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', public_id: 'room_701_2' },
    ],
  },
  {
    name: 'Standard Garden View',
    description: 'A cozy and comfortable standard room overlooking our lush hotel gardens. Perfect for solo travelers or couples looking for a relaxing stay at an affordable price.',
    roomType: 'Standard',
    pricePerNight: 2800,
    capacity: 2,
    floor: 1,
    roomNumber: '101',
    ratings: 4.3,
    numOfReviews: 45,
    amenities: { wifi: true, ac: true, tv: true, parking: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&q=80', public_id: 'room_101_1' },
      { url: 'https://images.unsplash.com/photo-1641326736993-7d2b94dbdc8e?w=800&q=80', public_id: 'room_101_2' },
    ],
  },
  {
    name: 'Luxury Spa Suite',
    description: 'Rejuvenate body and mind in our Spa Suite. Featuring an in-room steam bath, private spa area, organic mini-bar, and access to our award-winning wellness centre.',
    roomType: 'Suite',
    pricePerNight: 11000,
    capacity: 2,
    floor: 6,
    roomNumber: '601',
    ratings: 4.9,
    numOfReviews: 15,
    amenities: { wifi: true, ac: true, tv: true, minibar: true, jacuzzi: true, breakfast: true, gym: true, swimmingPool: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80', public_id: 'room_601_1' },
      { url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80', public_id: 'room_601_2' },
    ],
  },
  {
    name: 'Deluxe City View Room',
    description: 'Enjoy stunning panoramic city skyline views from this stylish deluxe room. Features a private balcony, plush king bed, and elegant modern decor throughout.',
    roomType: 'Deluxe',
    pricePerNight: 5200,
    capacity: 2,
    floor: 4,
    roomNumber: '401',
    ratings: 4.7,
    numOfReviews: 28,
    amenities: { wifi: true, ac: true, tv: true, minibar: true, balcony: true, breakfast: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800&q=80', public_id: 'room_401_1' },
      { url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80', public_id: 'room_401_2' },
    ],
  },
  {
    name: 'Standard Double Room',
    description: "Comfortable and well-appointed, our Standard Double Room is ideal for budget-conscious travelers who still want quality. Features twin beds, modern bathroom facilities, and free WiFi.",
    roomType: 'Standard',
    pricePerNight: 2200,
    capacity: 2,
    floor: 1,
    roomNumber: '102',
    ratings: 4.1,
    numOfReviews: 52,
    amenities: { wifi: true, ac: true, tv: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80', public_id: 'room_102_1' },
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80', public_id: 'room_102_2' },
    ],
  },
  {
    name: 'Family Premium Suite',
    description: 'The ultimate family retreat. This premium suite features two separate bedrooms, a spacious living room, a full kitchen, and a private balcony — everything you need for an extended family stay.',
    roomType: 'Family',
    pricePerNight: 9500,
    capacity: 6,
    floor: 4,
    roomNumber: '402',
    ratings: 4.8,
    numOfReviews: 20,
    amenities: { wifi: true, ac: true, tv: true, minibar: true, balcony: true, breakfast: true, parking: true, swimmingPool: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1584132915807-fd1f5fbc078f?w=800&q=80', public_id: 'room_402_1' },
      { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', public_id: 'room_402_2' },
    ],
  },
];

// ─── Sample Users Data ─────────────────────────────────────────────────────────
const users = [
  {
    name: 'Admin User',
    email: 'admin@hotelvapi.com',
    password: 'admin123',
    phone: '+91-265-XXXXXXX',
    role: 'admin',
  },
  {
    name: 'Demo Guest',
    email: 'guest@hotelvapi.com',
    password: 'guest123',
    phone: '+91-265-XXXXXXX',
    role: 'user',
  },
];

// ─── Seed Function ─────────────────────────────────────────────────────────────
async function seedDatabase() {
  try {
    console.log('\n🌱 Hotel Vapi - Database Seeder');
    console.log('================================');
    console.log(`🔗 Connecting to: ${MONGO_URI}`);

    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected!');

    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await Room.deleteMany({});
    await User.deleteMany({});
    console.log('   ✔ Rooms cleared');
    console.log('   ✔ Users cleared');

    // Create users
    console.log('\n👤 Creating users...');
    const createdUsers = await User.create(users);
    const adminUser = createdUsers.find(u => u.role === 'admin');
    console.log(`   ✔ Admin: ${adminUser.email} (password: admin123)`);
    const guestUser = createdUsers.find(u => u.role === 'user');
    console.log(`   ✔ Guest: ${guestUser.email} (password: guest123)`);

    // Create rooms (attach admin as creator)
    console.log('\n🏨 Creating rooms...');
    const roomsWithAdmin = rooms.map(room => ({ ...room, createdBy: adminUser._id }));
    const createdRooms = await Room.insertMany(roomsWithAdmin);
    createdRooms.forEach(r => console.log(`   ✔ ${r.name} (${r.roomType}) - ₹${r.pricePerNight}/night`));

    console.log('\n🎉 Database seeded successfully!');
    console.log('================================');
    console.log('📊 Summary:');
    console.log(`   👤 Users:  ${createdUsers.length}`);
    console.log(`   🏨 Rooms:  ${createdRooms.length}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin  → admin@hotelvapi.com / admin123');
    console.log('   Guest  → guest@hotelvapi.com / guest123');
    console.log('\n🚀 Start the server: npm run dev');
    console.log('🌐 Open: http://localhost:5000\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed Error:', err.message);
    process.exit(1);
  }
}

seedDatabase();
