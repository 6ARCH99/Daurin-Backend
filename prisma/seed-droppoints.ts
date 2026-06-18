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
  // NEW INDONESIA LOCATIONS
  {
    name: 'Bank Sampah Daurin Dago',
    address: 'Jl. Ir. H. Juanda No. 123, Dago, Coblong',
    city: 'Bandung',
    lat: -5.8893,
    lng: 107.6105,
    phone: '022-5550111',
    openTime: '08:00',
    closeTime: '16:00',
    rating: 4.8,
    reviewCount: 201,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Minyak Jelantah',
  },
  {
    name: 'Drop Point Daurin TSM',
    address: 'Trans Studio Mall Bandung, Jl. Gatot Subroto No. 289',
    city: 'Bandung',
    lat: -5.9255,
    lng: 107.6366,
    phone: '022-5550222',
    openTime: '10:00',
    closeTime: '21:00',
    rating: 4.5,
    reviewCount: 145,
    materials: 'Plastik, Kertas, Botol',
  },
  {
    name: 'Bank Sampah Daurin Gubeng',
    address: 'Jl. Raya Gubeng No. 44, Gubeng',
    city: 'Surabaya',
    lat: -7.2756,
    lng: 112.7521,
    phone: '031-5550333',
    openTime: '07:30',
    closeTime: '15:30',
    rating: 4.7,
    reviewCount: 189,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Elektronik',
  },
  {
    name: 'Drop Point Daurin Tunjungan',
    address: 'Tunjungan Plaza, Jl. Jenderal Basuki Rachmat No. 8-12',
    city: 'Surabaya',
    lat: -7.2625,
    lng: 112.7388,
    phone: '031-5550444',
    openTime: '10:00',
    closeTime: '22:00',
    rating: 4.9,
    reviewCount: 340,
    materials: 'Plastik, Kertas, Botol',
  },
  {
    name: 'Bank Sampah Daurin Renon',
    address: 'Jl. Raya Puputan No. 88, Renon, Denpasar Selatan',
    city: 'Denpasar',
    lat: -8.6750,
    lng: 115.2255,
    phone: '0361-5550555',
    openTime: '08:00',
    closeTime: '17:00',
    rating: 4.9,
    reviewCount: 420,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Elektronik, Baterai',
  },
  {
    name: 'Drop Point Daurin Kuta',
    address: 'Beachwalk Shopping Center, Jl. Pantai Kuta',
    city: 'Denpasar',
    lat: -8.7188,
    lng: 115.1695,
    phone: '0361-5550666',
    openTime: '10:00',
    closeTime: '22:00',
    rating: 4.6,
    reviewCount: 215,
    materials: 'Plastik, Kertas, Botol, Kaleng',
  },
  {
    name: 'Bank Sampah Daurin Malioboro',
    address: 'Jl. Malioboro No. 56, Suryatmajan, Danurejan',
    city: 'Yogyakarta',
    lat: -7.7926,
    lng: 110.3658,
    phone: '0274-5550777',
    openTime: '08:30',
    closeTime: '16:30',
    rating: 4.8,
    reviewCount: 156,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca',
  },
  {
    name: 'Bank Sampah Daurin Merdeka',
    address: 'Jl. Merdeka No. 10, Kesawan, Medan Barat',
    city: 'Medan',
    lat: 3.5894,
    lng: 98.6738,
    phone: '061-5550888',
    openTime: '08:00',
    closeTime: '17:00',
    rating: 4.6,
    reviewCount: 130,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca, Elektronik',
  },
  {
    name: 'Drop Point Daurin Sun Plaza',
    address: 'Sun Plaza, Jl. KH. Zainul Arifin No. 7, Madras Hulu',
    city: 'Medan',
    lat: 3.5828,
    lng: 98.6705,
    phone: '061-5550999',
    openTime: '10:00',
    closeTime: '21:30',
    rating: 4.5,
    reviewCount: 110,
    materials: 'Plastik, Kertas, Botol',
  },
  {
    name: 'Bank Sampah Daurin Losari',
    address: 'Jl. Penghibur No. 20, Losari, Ujung Pandang',
    city: 'Makassar',
    lat: -5.1432,
    lng: 119.4069,
    phone: '0411-5551010',
    openTime: '07:00',
    closeTime: '18:00',
    rating: 4.7,
    reviewCount: 198,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca',
  },
  {
    name: 'Bank Sampah Daurin TSM Makassar',
    address: 'Trans Studio Mall Makassar, Jl. Metro Tanjung Bunga',
    city: 'Makassar',
    lat: -5.1610,
    lng: 119.3982,
    phone: '0411-5551111',
    openTime: '10:00',
    closeTime: '22:00',
    rating: 4.8,
    reviewCount: 150,
    materials: 'Plastik, Kertas, Botol, Kaleng, Elektronik',
  },
  {
    name: 'Drop Point Daurin Gajah Mada',
    address: 'Jl. Gajah Mada No. 100, Kembangsari, Semarang Tengah',
    city: 'Semarang',
    lat: -6.9806,
    lng: 110.4206,
    phone: '024-5551212',
    openTime: '08:00',
    closeTime: '16:00',
    rating: 4.6,
    reviewCount: 165,
    materials: 'Plastik, Kertas, Kaleng, Botol Kaca',
  }
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
