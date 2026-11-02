export const categories = [
  'نباتات زينة', 'أشجار مثمرة', 'نباتات داخلية', 'زهور وشتلات',
  'صبار وعصاريات', 'نباتات عطرية', 'بذور', 'أصص وحاويات',
  'تربة وأسمدة', 'أدوات وري',
];

const productSeeds = [
  ['زيتون شملالي', 'Olivier Chemlali', 'Olea europaea', 'أشجار مثمرة', '3L', 14, 24, 46, 'مشتل 1'],
  ['زيتون شملالي كبير', 'Olivier Chemlali', 'Olea europaea', 'أشجار مثمرة', '10L', 32, 55, 18, 'الساحة A'],
  ['برتقال مالطي', 'Oranger Maltaise', 'Citrus sinensis', 'أشجار مثمرة', '3L', 18, 32, 34, 'مشتل 1'],
  ['ليمون بنزرتي', 'Citronnier de Bizerte', 'Citrus limon', 'أشجار مثمرة', '3L', 17, 29, 22, 'مشتل 2'],
  ['رمان قابسي', 'Grenadier Gabsi', 'Punica granatum', 'أشجار مثمرة', '3L', 15, 26, 17, 'الساحة A'],
  ['تين بقلي', 'Figuier Boukli', 'Ficus carica', 'أشجار مثمرة', '10L', 25, 45, 28, 'مشتل 2'],
  ['لوز فراني', 'Amandier Ferragnès', 'Prunus dulcis', 'أشجار مثمرة', '3L', 16, 29, 12, 'مشتل 1'],
  ['فيكس مطاط', 'Ficus elastica', 'Ficus elastica', 'نباتات داخلية', '3L', 22, 38, 19, 'بيت الظل'],
  ['مونستيرا دليسيوسا', 'Monstera deliciosa', 'Monstera deliciosa', 'نباتات داخلية', '3L', 29, 49, 9, 'بيت الظل'],
  ['زاميا خضراء', 'Zamioculcas', 'Zamioculcas zamiifolia', 'نباتات داخلية', '1L', 16, 28, 27, 'بيت الظل'],
  ['بوتس ذهبي', 'Pothos doré', 'Epipremnum aureum', 'نباتات داخلية', '1L', 9, 17, 41, 'بيت الظل'],
  ['ياسمين بلدي', 'Jasmin commun', 'Jasminum officinale', 'نباتات زينة', '3L', 13, 23, 31, 'الساحة A'],
  ['جهنمية فوشيا', 'Bougainvillier fuchsia', 'Bougainvillea glabra', 'نباتات زينة', '10L', 28, 48, 14, 'الساحة A'],
  ['دفلة وردية', 'Laurier-rose rose', 'Nerium oleander', 'نباتات زينة', '3L', 12, 21, 33, 'الساحة B'],
  ['فيكس نيتدا', 'Ficus nitida', 'Ficus microcarpa', 'نباتات زينة', '20L', 58, 95, 8, 'الساحة B'],
  ['ورد جوري أحمر', 'Rosier rouge', 'Rosa gallica', 'زهور وشتلات', '3L', 11, 19, 24, 'مشتل 2'],
  ['لافندر فرنسي', 'Lavande française', 'Lavandula angustifolia', 'نباتات عطرية', '1L', 8, 15, 36, 'مشتل 1'],
  ['إكليل الجبل', 'Romarin', 'Salvia rosmarinus', 'نباتات عطرية', '1L', 7, 13, 29, 'مشتل 1'],
  ['نعناع تونسي', 'Menthe tunisienne', 'Mentha spicata', 'نباتات عطرية', '1L', 5, 9, 43, 'مشتل 2'],
  ['ريحان أخضر', 'Basilic vert', 'Ocimum basilicum', 'نباتات عطرية', '1L', 5, 10, 26, 'مشتل 2'],
  ['صبار ألوفيرا', 'Aloe vera', 'Aloe barbadensis', 'صبار وعصاريات', '1L', 12, 21, 38, 'بيت الظل'],
  ['صبار عمودي', 'Cactus colonnaire', 'Cereus repandus', 'صبار وعصاريات', '3L', 19, 34, 16, 'بيت الظل'],
  ['كالانشو أحمر', 'Kalanchoé rouge', 'Kalanchoe blossfeldiana', 'زهور وشتلات', '1L', 8, 14, 7, 'مشتل 2'],
  ['بتونيا مشكلة', 'Pétunia mix', 'Petunia hybrida', 'زهور وشتلات', '1L', 6, 12, 52, 'مشتل 2'],
  ['إبرة الراعي', 'Géranium zonale', 'Pelargonium zonale', 'زهور وشتلات', '1L', 9, 16, 18, 'مشتل 1'],
  ['شتلات طماطم', 'Plants de tomate', 'Solanum lycopersicum', 'زهور وشتلات', 'صينية', 0.6, 1.2, 75, 'مشتل 2'],
  ['بذور فلفل حلو', 'Graines de poivron', 'Capsicum annuum', 'بذور', 'ظرف', 2, 4.5, 64, 'المخزن'],
  ['بذور طماطم سان مارزانو', 'Graines tomate San Marzano', 'Solanum lycopersicum', 'بذور', 'ظرف', 2.5, 5, 38, 'المخزن'],
  ['أصيص فخاري 20سم', 'Pot en terre cuite 20cm', '', 'أصص وحاويات', 'قطعة', 4, 8, 42, 'المخزن'],
  ['أصيص بلاستيك 3L', 'Pot plastique 3L', '', 'أصص وحاويات', 'قطعة', 1.8, 3.5, 96, 'المخزن'],
  ['تربة زراعية 50L', 'Terreau universel 50L', '', 'تربة وأسمدة', 'كيس', 8, 14, 31, 'المخزن'],
  ['سماد عضوي 5kg', 'Engrais organique 5kg', '', 'تربة وأسمدة', 'كيس', 9, 16, 23, 'المخزن'],
  ['خرطوم ري 20م', "Tuyau d'arrosage 20m", '', 'أدوات وري', 'قطعة', 24, 39, 11, 'المخزن'],
  ['مقص تقليم احترافي', 'Sécateur professionnel', '', 'أدوات وري', 'قطعة', 18, 32, 6, 'المخزن'],
  ['شجرة مورينغا', 'Moringa', 'Moringa oleifera', 'أشجار مثمرة', '3L', 16, 28, 15, 'الساحة A'],
];

const plantPhoto = (index) => `https://images.unsplash.com/${[
  'photo-1470252649378-9c29740c9fa8', 'photo-1501004318641-b39e6451bec6',
  'photo-1485955900006-10f4d324d411', 'photo-1497250681960-ef046c08a56e',
  'photo-1509423350716-97f9360b4e09', 'photo-1466692476868-aef1dfb1e735',
][index % 6]}?auto=format&fit=crop&w=480&q=80`;

export const initialProducts = productSeeds.map((p, index) => ({
  id: `P${String(index + 1).padStart(3, '0')}`,
  nameAr: p[0], nameFr: p[1], scientific: p[2], category: p[3], size: p[4],
  purchasePrice: p[5], salePrice: p[6], minimum: index % 5 === 0 ? 10 : 12,
  location: p[8], image: plantPhoto(index),
}));

export const suppliers = [
  { id: 'S01', name: 'مشتل قرمبالية', city: 'نابل', type: 'نباتات وأشجار', phone: '+216 72 245 118' },
  { id: 'S02', name: 'البذور التونسية', city: 'صفاقس', type: 'بذور', phone: '+216 74 221 607' },
  { id: 'S03', name: 'الخضراء للتجهيزات', city: 'سوسة', type: 'أصص ومعدات', phone: '+216 73 365 220' },
  { id: 'S04', name: 'تونس للتربة والأسمدة', city: 'تونس', type: 'تربة وأسمدة', phone: '+216 71 558 043' },
  { id: 'S05', name: 'مشاتل الساحل', city: 'المنستير', type: 'نباتات زينة', phone: '+216 73 442 590' },
  { id: 'S06', name: 'الواحة الفلاحية', city: 'بن عروس', type: 'ري وأدوات', phone: '+216 71 388 721' },
];

export const initialCustomers = [
  { id: 'C01', name: 'سارة بن عمر', type: 'فرد', phone: '+216 22 481 906', credit: 0 },
  { id: 'C02', name: 'حدائق قرطاج', type: 'بستاني', phone: '+216 98 226 714', credit: 146 },
  { id: 'C03', name: 'بلدية المرسى', type: 'بلدية', phone: '+216 71 749 300', credit: 480 },
  { id: 'C04', name: 'محمد الطرابلسي', type: 'فرد', phone: '+216 55 320 118', credit: 0 },
  { id: 'C05', name: 'Green Space', type: 'بستاني', phone: '+216 20 663 409', credit: 215 },
  { id: 'C06', name: 'ريم الجلاصي', type: 'فرد', phone: '+216 24 908 572', credit: 0 },
  { id: 'C07', name: 'بلدية قرمبالية', type: 'بلدية', phone: '+216 72 240 055', credit: 0 },
  { id: 'C08', name: 'حدائق الياسمين', type: 'بستاني', phone: '+216 26 774 201', credit: 92 },
  { id: 'C09', name: 'أمين بن صالح', type: 'فرد', phone: '+216 50 117 386', credit: 0 },
  { id: 'C10', name: 'Atelier Paysage', type: 'بستاني', phone: '+216 29 411 802', credit: 0 },
];

export const initialBatches = [
  { id: 'B-2401', seed: 'طماطم سان مارزانو', sowing: '2026-10-12', sown: 240, stage: 'germination', readyDate: '2026-11-18', loss: 8 },
  { id: 'B-2402', seed: 'ريحان أخضر', sowing: '2026-10-03', sown: 180, stage: 'growing', readyDate: '2026-11-09', loss: 12 },
  { id: 'B-2403', seed: 'لافندر فرنسي', sowing: '2026-09-11', sown: 120, stage: 'ready', readyDate: '2026-11-01', loss: 6 },
  { id: 'B-2404', seed: 'فلفل حلو', sowing: '2026-10-20', sown: 300, stage: 'sowing', readyDate: '2026-12-05', loss: 0 },
  { id: 'B-2405', seed: 'بتونيا مشكلة', sowing: '2026-10-07', sown: 160, stage: 'growing', readyDate: '2026-11-15', loss: 14 },
];

const dateBack = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export const createInitialMovements = () => {
  const lowStockIndexes = new Set([0, 1, 2, 3, 5, 6, 34]);
  const rows = initialProducts.map((p, i) => ({
    id: `M-${String(i + 1).padStart(3, '0')}`, productId: p.id,
    type: 'Purchase IN', quantity: i === 34 ? 2 : lowStockIndexes.has(i) ? Math.max(1, p.minimum - 2) : 24 + ((i * 13) % 46), date: dateBack(30 - (i % 8)),
    reason: 'رصيد افتتاحي', location: p.location, reference: `PO-${240 + (i % 9)}`,
  }));
  const patterns = ['Sale OUT', 'Sale OUT', 'Purchase IN', 'Loss OUT', 'Production IN', 'Sale OUT'];
  for (let i = 0; i < 45; i += 1) {
    const product = i === 44 ? initialProducts[34] : initialProducts[(i * 7 + 4) % initialProducts.length];
    const type = i === 44 ? 'Loss OUT' : patterns[i % patterns.length];
    rows.push({
      id: `M-${String(i + 36).padStart(3, '0')}`, productId: product.id, type,
      quantity: type === 'Loss OUT' ? 1 + (Math.floor(i / 6) % 3) : type.includes('OUT') ? 1 + (i % 8) : 4 + (i % 12),
      date: dateBack((i * 11) % 30),
      reason: type === 'Loss OUT' ? ['مرض', 'صقيع', 'جفاف', 'تلف'][i % 4] : type === 'Sale OUT' ? 'بيع مباشر' : 'توريد',
      location: product.location, reference: type === 'Sale OUT' ? `V-${400 + i}` : `M-${i + 1}`,
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
};

export const stageLabels = { sowing: 'بذر', germination: 'إنبات', growing: 'نمو', ready: 'جاهز للبيع' };
