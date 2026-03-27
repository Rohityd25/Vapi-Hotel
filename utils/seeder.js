/**
 * =============================================
 *  DATABASE SEEDER
 * =============================================
 * Seeds initial admin user and sample rooms.
 * Run: node utils/seeder.js
 * Reset: node utils/seeder.js --reset
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User     = require('../models/User');
const Room     = require('../models/Room');
const connectDB = require('../config/db');

// Sample room data
const sampleRooms = [
  {
    name:          'Standard Ocean View',
    description:   'A comfortable standard room with beautiful ocean views. Perfect for a relaxing getaway with all essential amenities.',
    roomType:      'Standard',
    pricePerNight: 2500,
    capacity:      2,
    floor:         2,
    roomNumber:    '201',
    amenities:     { wifi: true, ac: true, tv: true },
    images: [{
      public_id: 'sample1',
      url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
    }],
    ratings: 4.2,
    numOfReviews: 15,
  },
  {
    name:          'Deluxe Pool Side',
    description:   'Spacious deluxe room overlooking our stunning infinity pool. Features premium furnishings and a private balcony.',
    roomType:      'Deluxe',
    pricePerNight: 4500,
    capacity:      2,
    floor:         3,
    roomNumber:    '301',
    amenities:     { wifi: true, ac: true, tv: true, minibar: true, balcony: true, breakfast: true },
    images: [{
      public_id: 'sample2',
      url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    }],
    ratings: 4.6,
    numOfReviews: 28,
  },
  {
    name:          'Executive Suite',
    description:   'Our signature suite offers a luxurious living experience with separate bedroom and lounge area, jacuzzi, and panoramic views.',
    roomType:      'Suite',
    pricePerNight: 8500,
    capacity:      3,
    floor:         5,
    roomNumber:    '501',
    amenities:     { wifi: true, ac: true, tv: true, minibar: true, balcony: true, jacuzzi: true, breakfast: true, parking: true },
    images: [{
      public_id: 'sample3',
      url: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=800',
    }],
    ratings: 4.8,
    numOfReviews: 42,
  },
  {
    name:          'Presidential Suite',
    description:   'The pinnacle of luxury. Our Presidential Suite offers unmatched opulence with butler service, private dining, and the finest amenities.',
    roomType:      'Presidential',
    pricePerNight: 18000,
    capacity:      4,
    floor:         7,
    roomNumber:    '701',
    amenities:     { wifi: true, ac: true, tv: true, minibar: true, balcony: true, jacuzzi: true, breakfast: true, parking: true, gym: true, swimmingPool: true },
    images: [{
      public_id: 'sample4',
      url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
    }],
    ratings: 5.0,
    numOfReviews: 12,
  },
  {
    name:          'Family Comfort Room',
    description:   'Perfect for families! Spacious room with two queen beds, plenty of storage, and child-friendly amenities.',
    roomType:      'Family',
    pricePerNight: 5500,
    capacity:      6,
    floor:         4,
    roomNumber:    '401',
    amenities:     { wifi: true, ac: true, tv: true, breakfast: true, parking: true },
    images: [{
      public_id: 'sample5',
      url: 'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800',
    }],
    ratings: 4.4,
    numOfReviews: 33,
  },
  {
    name:          'Deluxe Garden View',
    description:   'Wake up to lush greenery. This deluxe room faces our beautifully landscaped garden with a private patio.',
    roomType:      'Deluxe',
    pricePerNight: 3800,
    capacity:      2,
    floor:         1,
    roomNumber:    '102',
    amenities:     { wifi: true, ac: true, tv: true, minibar: true, balcony: true },
    images: [{
      public_id: 'sample6',
      url: 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800',
    }],
    ratings: 4.3,
    numOfReviews: 19,
  },
];

const seedDB = async () => {
  await connectDB();

  if (process.argv[2] === '--reset') {
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany();
    await Room.deleteMany();
    console.log('✅ Database cleared.');
    process.exit(0);
  }

  console.log('🌱 Seeding database...');

  // Create admin user (if not exists)
  const existingAdmin = await User.findOne({ email: 'admin@hotelvapi.com' });

  if (!existingAdmin) {
    await User.create({
      name:     'Hotel Vapi Admin',
      email:    'admin@hotelvapi.com',
      password: 'Admin@123',
      role:     'admin',
      phone:    '+91-9999999999',
    });
    console.log('✅ Admin user created: admin@hotelvapi.com / Admin@123');
  } else {
    console.log('ℹ️  Admin already exists.');
  }

  // Create sample rooms (avoid duplicates)
  for (const roomData of sampleRooms) {
    const exists = await Room.findOne({ roomNumber: roomData.roomNumber });
    if (!exists) {
      await Room.create(roomData);
      console.log(`✅ Room created: ${roomData.name} (${roomData.roomNumber})`);
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log('👤 Admin: admin@hotelvapi.com | Password: Admin@123');
  process.exit(0);
};

seedDB().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
