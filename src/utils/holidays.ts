export const FIXED_HOLIDAYS = [
  '01-01', // Yılbaşı
  '23-04', // Ulusal Egemenlik ve Çocuk Bayramı
  '01-05', // Emek ve Dayanışma Günü
  '19-05', // Atatürk'ü Anma, Gençlik ve Spor Bayramı
  '15-07', // Demokrasi ve Milli Birlik Günü
  '30-08', // Zafer Bayramı
  '29-10', // Cumhuriyet Bayramı
];

// Dini bayramlar her yıl değiştiği için spesifik tarihler (YYYY-MM-DD formatında)
// Not: 2026 yılına ait tahmini/resmi tarihler eklenmiştir.
export const DYNAMIC_HOLIDAYS = [
  // 2026 Ramazan Bayramı (Tahmini/Takvimsel)
  '2026-03-20', '2026-03-21', '2026-03-22', 
  // 2026 Kurban Bayramı (Tahmini/Takvimsel)
  '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30',
];

export const isHoliday = (date: Date): boolean => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();

  const mmdd = `${d}-${m}`;
  const yyyymmdd = `${y}-${m}-${d}`;

  if (FIXED_HOLIDAYS.includes(mmdd)) return true;
  if (DYNAMIC_HOLIDAYS.includes(yyyymmdd)) return true;

  return false;
};
