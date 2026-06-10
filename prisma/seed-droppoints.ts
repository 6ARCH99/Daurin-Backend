import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real drop point locations in Jakarta & surrounding areas
const dropPoints = [
  {
    name: 'Bank Sampah Daurin Pusat',
    address: 'Jl. Sudirman No. 88, Karet Tengsin, Tanah Abang',
    city: 'Jakarta Pusat',
    lat: -6.2088,
    lng: 106.8456,
    phone: '021-5550123',
    openTime: '08:00',
    closeTime: '17:00',
    rating: 4.8,
    reviewCount: 234,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Elektronik, Baterai',
  },
  {
    name: 'Drop Point Daurin Thamrin',
    address: 'Plaza Indonesia, Jl. M.H. Thamrin No. 28-30, Kebon Melati',
    city: 'Jakarta Pusat',
    lat: -6.1947,
    lng: 106.8229,
    phone: '021-5550456',
    openTime: '10:00',
    closeTime: '22:00',
    rating: 4.6,
    reviewCount: 156,
    materials: 'Plastik, Kertas, Botol, Kaleng',
  },
  {
    name: 'Bank Sampah Daurin Kelapa Gading',
    address: 'Jl. Boulevard Barat Raya No. 1, Kelapa Gading Barat',
    city: 'Jakarta Utara',
    lat: -6.1583,
    lng: 106.8925,
    phone: '021-5550789',
    openTime: '08:00',
    closeTime: '16:00',
    rating: 4.9,
    reviewCount: 312,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Elektronik, Baterai, Minyak Jelantah',
  },
  {
    name: 'Drop Point Daurin Pondok Indah',
    address: 'Pondok Indah Mall 2, Jl. Metro Pondok Indah, Pondok Pinang',
    city: 'Jakarta Selatan',
    lat: -6.2659,
    lng: 106.7831,
    phone: '021-5550234',
    openTime: '10:00',
    closeTime: '22:00',
    rating: 4.5,
    reviewCount: 189,
    materials: 'Plastik, Kertas, Botol, Kaleng',
  },
  {
    name: 'Bank Sampah Daurin Tebet',
    address: 'Jl. Tebet Raya No. 45, Tebet Timur',
    city: 'Jakarta Selatan',
    lat: -6.2315,
    lng: 106.8498,
    phone: '021-5550567',
    openTime: '08:00',
    closeTime: '17:00',
    rating: 4.7,
    reviewCount: 267,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Elektronik',
  },
  {
    name: 'Drop Point Daurin Cibubur',
    address: 'Cibubur Junction, Jl. Alternatif Cibubur, Harjamukti',
    city: 'Depok',
    lat: -6.3768,
    lng: 106.8865,
    phone: '021-5550890',
    openTime: '10:00',
    closeTime: '22:00',
    rating: 4.4,
    reviewCount: 134,
    materials: 'Plastik, Kertas, Botol, Kaleng',
  },
  {
    name: 'Bank Sampah Daurin BSD',
    address: 'The Breeze BSD, Jl. Grand Boulevard, BSD Green Office Park',
    city: 'Tangerang Selatan',
    lat: -6.3024,
    lng: 106.6522,
    phone: '021-5550124',
    openTime: '09:00',
    closeTime: '18:00',
    rating: 4.8,
    reviewCount: 298,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Elektronik, Baterai, Minyak Jelantah',
  },
  {
    name: 'Drop Point Daurin Alam Sutera',
    address: 'Mall @ Alam Sutera, Jl. Jalur Sutera Barat, Pakulonan',
    city: 'Tangerang Selatan',
    lat: -6.2236,
    lng: 106.6526,
    phone: '021-5550345',
    openTime: '10:00',
    closeTime: '22:00',
    rating: 4.6,
    reviewCount: 178,
    materials: 'Plastik, Kertas, Botol, Kaleng',
  },
];

export async function seedDropPoints() {
  console.log('Creating drop points with real locations...\n');

  let created = 0;
  for (const dp of dropPoints) {
    try {
      await prisma.dropPoint.create({
        data: {
          ...dp,
          isOpen: true,
        },
      });
      console.log(`✅ ${dp.name} - ${dp.city}`);
      created++;
    } catch (err) {
      console.error(`❌ Failed: ${dp.name}:`, err.message);
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Total: ${created} drop points created`);
  console.log('═'.repeat(50));
  
  console.log('\n📍 Locations by City:');
  const byCity = dropPoints.reduce((acc, dp) => {
    acc[dp.city] = (acc[dp.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(byCity).forEach(([city, count]) => {
    console.log(`  • ${city}: ${count} lokasi`);
  });
}

// Standalone execution for direct script runs
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDropPoints()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
