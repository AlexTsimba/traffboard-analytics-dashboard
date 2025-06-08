import { db } from '../db';
import { players, trafficReports } from '../schema';

export async function seedPlayers() {
  console.log('Seeding players...');
  
  const samplePlayers = [
    {
      playerId: 1001,
      originalPlayerId: 1001,
      signUpDate: '2024-01-15',
      firstDepositDate: '2024-01-16',
      campaignId: 101,
      campaignName: 'Welcome Bonus',
      playerCountry: 'US',
      tagClickid: 'click_123456',
      tagOs: 'Windows',
      tagSource: 'Google Ads',
      tagSub2: '2.50',
      tagWebId: '100.00',
      date: '2024-01-15',
      partnerId: 1,
      companyName: 'Partner A',
      partnersEmail: 'contact@partnera.com',
      partnerTags: 'premium,vip',
      promoId: 201,
      promoCode: 'WELCOME100',
      prequalified: true,
      duplicate: false,
      selfExcluded: false,
      disabled: false,
      currency: 'USD',
      ftdCount: 1,
      ftdSum: '250.00',
      depositsCount: 3,
      depositsSum: '750.00',
      cashoutsCount: 1,
      cashoutsSum: '100.00',
      casinoBetsCount: 45,
      casinoRealNgr: '150.00',
      fixedPerPlayer: '50.00',
      casinoBetsSum: '1200.00',
      casinoWinsSum: '800.00'
    }
  ];

  await db.insert(players).values(samplePlayers);
  console.log('Players seeded successfully');
}

export async function seedTrafficReports() {
  console.log('Seeding traffic reports...');
  
  const sampleReports = [
    {
      date: '2024-01-15',
      foreignBrandId: 1,
      foreignPartnerId: 1,
      foreignCampaignId: 101,
      foreignLandingId: 501,
      referrer: 'https://google.com',
      deviceType: 'desktop',
      userAgentFamily: 'Chrome',
      osFamily: 'Windows',
      country: 'US',
      allClicks: 1500,
      uniqueClicks: 1200,
      registrationsCount: 120,
      ftdCount: 25,
      depositsCount: 45,
      cr: '0.1000',
      cftd: '0.2083',
      cd: '0.3750',
      rftd: '0.0167'
    }
  ];

  await db.insert(trafficReports).values(sampleReports);
  console.log('Traffic reports seeded successfully');
}

export async function seedAll() {
  await seedPlayers();
  await seedTrafficReports();
  console.log('All seed data inserted successfully');
}
