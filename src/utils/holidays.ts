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

export const getPublicHolidayName = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  const dd = parts[0];
  const mm = parts[1];
  const yyyy = parts[2];
  const mmdd = `${dd}-${mm}`;
  const yyyymmdd = `${yyyy}-${mm}-${dd}`;
  
  if (mmdd === '01-01') return 'Yılbaşı';
  if (mmdd === '23-04') return 'Ulusal Egemenlik ve Çocuk Bayramı';
  if (mmdd === '01-05') return 'Emek ve Dayanışma Günü';
  if (mmdd === '19-05') return "Atatürk'ü Anma, Gençlik ve Spor Bayramı";
  if (mmdd === '15-07') return 'Demokrasi ve Milli Birlik Günü';
  if (mmdd === '30-08') return 'Zafer Bayramı';
  if (mmdd === '29-10') return 'Cumhuriyet Bayramı';
  
  if (DYNAMIC_HOLIDAYS.includes(yyyymmdd)) {
    if (yyyymmdd.startsWith('2026-03')) return 'Ramazan Bayramı';
    if (yyyymmdd.startsWith('2026-05')) return 'Kurban Bayramı';
    return 'Dini Bayram';
  }
  
  return null;
};
