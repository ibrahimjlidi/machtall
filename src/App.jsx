import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell,
  Boxes, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, ClipboardList, CreditCard, Download, FileSpreadsheet, Flower2,
  Globe2, LayoutDashboard, Leaf, Menu, Moon, MoreHorizontal, Package, Plus,
  Search, Settings2, ShieldCheck, ShoppingBag, ShoppingCart, Sun, Tag, Truck,
  UserRound, Users, Wallet, X, LogOut,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend,
  Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { categories, stageLabels } from './data';
import LoginScreen from './LoginScreen.jsx';
import { apiRequest, clearAccessToken, getAccessToken, login, normalizeWorkspace } from './api.js';

const translations = {
  ar: {
    dashboard: 'لوحة التحكم', products: 'المنتجات', movements: 'حركة المخزون',
    production: 'الإنتاج', purchasing: 'الموردون والشراء', sales: 'العملاء والمبيعات',
    alerts: 'التنبيهات', reports: 'التقارير', users: 'المستخدمون والصلاحيات',
    overview: 'نظرة عامة', inventory: 'إدارة المخزون', operations: 'العمليات',
    settings: 'الإعدادات', search: 'ابحث عن منتج، عميل، أو حركة...', today: 'اليوم',
    totalProducts: 'إجمالي المنتجات', stockValue: 'قيمة المخزون', lowStock: 'منتجات منخفضة',
    monthlyLosses: 'خسائر هذا الشهر', todaySales: 'مبيعات اليوم', productsUnit: 'منتج',
    items: 'عنصر', tnd: 'د.ت', stockFlow: 'حركة المخزون', categoryValue: 'قيمة المخزون حسب الفئة',
    salesTrend: 'المبيعات الشهرية', lowStockList: 'المنتجات المنخفضة', seeAll: 'عرض الكل',
    seasonalTip: 'نصيحة موسمية', tip: 'وقت مثالي لغرس أشجار الزيتون والحمضيات. جهّز شتلاتك قبل أمطار الخريف.',
    addProduct: 'إضافة منتج', newMovement: 'حركة جديدة', newSale: 'عملية بيع',
    filter: 'تصفية', allCategories: 'كل الفئات', allSizes: 'كل الأحجام', allStatuses: 'كل الحالات',
    available: 'متوفر', low: 'منخفض', out: 'نفد المخزون', searchProducts: 'ابحث بالاسم أو الفئة...',
    table: 'جدول', cards: 'بطاقات', product: 'المنتج', category: 'الفئة', size: 'الحجم',
    price: 'سعر البيع', quantity: 'الكمية', minimum: 'الحد الأدنى', location: 'الموقع',
    status: 'الحالة', actions: 'إجراءات', inStock: 'في المخزون', movementType: 'نوع الحركة',
    date: 'التاريخ', reference: 'المرجع', reason: 'السبب', allTypes: 'كل الحركات',
    purchaseIn: 'شراء وارد', productionIn: 'إنتاج وارد', saleOut: 'بيع صادر',
    lossOut: 'فاقد / تلف', adjustment: 'تعديل مخزون', transfer: 'تحويل موقع',
    batch: 'الدفعة', stage: 'المرحلة', readyDate: 'موعد الجاهزية', sown: 'الكمية المزروعة',
    newBatch: 'دفعة إنتاج', markReady: 'تسجيل كجاهز', supplier: 'المورد', city: 'المدينة',
    phone: 'الهاتف', supplierType: 'التخصص', purchaseOrders: 'طلبات الشراء', newOrder: 'طلب شراء',
    order: 'الطلب', lines: 'الأصناف', total: 'الإجمالي', payment: 'الدفع',
    paid: 'مدفوع', credit: 'آجل', customer: 'العميل', customerType: 'نوع العميل',
    individual: 'فرد', landscaper: 'بستاني', municipality: 'بلدية',
    createSale: 'تأكيد البيع', addLine: 'إضافة صنف', alertsTitle: 'التنبيهات النشطة',
    purchaseShortcut: 'إنشاء طلب شراء', inventoryReport: 'تقييم المخزون',
    lossReport: 'الخسائر حسب السبب', bestSellers: 'الأكثر مبيعاً حسب الموسم',
    customerSales: 'المبيعات حسب العميل', exportExcel: 'تصدير Excel', exportPdf: 'تصدير PDF',
    permission: 'الصلاحية', role: 'الدور', admin: 'مدير / المالك', storekeeper: 'أمين المخزن',
    seller: 'بائع', viewer: 'مشاهد', save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق',
    edit: 'تعديل', delete: 'حذف', noResults: 'لا توجد نتائج مطابقة', quantityAvailable: 'المتاح',
    all: 'الكل', ready: 'جاهز للبيع', inProgress: 'قيد الإنتاج', draft: 'مسودة',
    sent: 'مرسل', received: 'مستلم', receive: 'استلام', send: 'إرسال', newPurchase: 'طلب شراء جديد',
    nameAr: 'الاسم بالعربية', nameFr: 'الاسم بالفرنسية', scientific: 'الاسم العلمي (اختياري)',
    purchasePrice: 'سعر الشراء', salePrice: 'سعر البيع', minStock: 'الحد الأدنى للمخزون',
    imageUrl: 'رابط الصورة (اختياري)', choose: 'اختر', amount: 'الكمية', update: 'تحديث',
    productName: 'المنتج', selectProduct: 'اختر المنتج', selectCustomer: 'اختر العميل',
    selectSupplier: 'اختر المورد', removeLine: 'حذف الصنف', batchSeed: 'نوع البذور',
    sowingDate: 'تاريخ البذر', expectedDate: 'تاريخ الجاهزية المتوقع', add: 'إضافة',
    welcome: 'صباح الخير، سيّد الزاهي', welcomeSub: 'إليك ملخص مشتل الزاهي لهذا اليوم.',
    overviewPeriod: 'آخر 30 يوماً', monthlyRevenue: 'المبيعات', stockIn: 'وارد', stockOut: 'صادر',
    day: 'اليوم', week: 'هذا الأسبوع', allLocations: 'كل المواقع', greenhouse: 'مشتل',
    noImage: 'نبات', actionsSoon: 'قريباً', rows: 'حركة', salesUnit: 'عملية',
    creditBalance: 'الرصيد الآجل', customers: 'العملاء', orders: 'الطلبات',
    createOrder: 'إنشاء الطلب', print: 'طباعة', done: 'تم', confirmDelete: 'هل أنت متأكد من حذف هذا المنتج؟',
    highLoss: 'معدل فاقد مرتفع', readySoon: 'دفعات جاهزة قريباً',
    logout: 'تسجيل الخروج', loading: 'جارٍ تحميل بيانات المشتل...', batchProduct: 'صنف الشتلات الجاهزة',
  },
  fr: {
    dashboard: 'Tableau de bord', products: 'Produits', movements: 'Mouvements',
    production: 'Production', purchasing: 'Fournisseurs & achats', sales: 'Clients & ventes',
    alerts: 'Alertes', reports: 'Rapports', users: 'Utilisateurs & rôles',
    overview: 'Vue générale', inventory: 'Gestion de stock', operations: 'Opérations',
    settings: 'Paramètres', search: 'Rechercher un produit, client...', today: "Aujourd'hui",
    totalProducts: 'Total produits', stockValue: 'Valeur du stock', lowStock: 'Stock faible',
    monthlyLosses: 'Pertes ce mois', todaySales: "Ventes du jour", productsUnit: 'produits',
    items: 'articles', tnd: 'TND', stockFlow: 'Mouvements du stock', categoryValue: 'Valeur par catégorie',
    salesTrend: 'Ventes mensuelles', lowStockList: 'Produits en stock faible', seeAll: 'Voir tout',
    seasonalTip: 'Conseil de saison', tip: "Période idéale pour planter oliviers et agrumes. Préparez vos plants avant les pluies d'automne.",
    addProduct: 'Ajouter produit', newMovement: 'Nouveau mouvement', newSale: 'Nouvelle vente',
    filter: 'Filtrer', allCategories: 'Toutes catégories', allSizes: 'Toutes tailles', allStatuses: 'Tous statuts',
    available: 'Disponible', low: 'Faible', out: 'Épuisé', searchProducts: 'Rechercher par nom ou catégorie...',
    table: 'Tableau', cards: 'Cartes', product: 'Produit', category: 'Catégorie', size: 'Taille',
    price: 'Prix de vente', quantity: 'Quantité', minimum: 'Stock min.', location: 'Emplacement',
    status: 'Statut', actions: 'Actions', inStock: 'En stock', movementType: 'Type de mouvement',
    date: 'Date', reference: 'Référence', reason: 'Motif', allTypes: 'Tous mouvements',
    purchaseIn: 'Achat entrant', productionIn: 'Production entrante', saleOut: 'Vente sortante',
    lossOut: 'Perte / dommage', adjustment: 'Ajustement', transfer: 'Transfert',
    batch: 'Lot', stage: 'Étape', readyDate: 'Date de disponibilité', sown: 'Quantité semée',
    newBatch: 'Nouveau lot', markReady: 'Marquer prêt', supplier: 'Fournisseur', city: 'Ville',
    phone: 'Téléphone', supplierType: 'Spécialité', purchaseOrders: 'Commandes', newOrder: 'Nouvelle commande',
    order: 'Commande', lines: 'Articles', total: 'Total', payment: 'Paiement',
    paid: 'Payé', credit: 'Crédit', customer: 'Client', customerType: 'Type de client',
    individual: 'Particulier', landscaper: 'Paysagiste', municipality: 'Municipalité',
    createSale: 'Confirmer la vente', addLine: 'Ajouter un article', alertsTitle: 'Alertes actives',
    purchaseShortcut: 'Créer une commande', inventoryReport: 'Valorisation du stock',
    lossReport: 'Pertes par motif', bestSellers: 'Meilleures ventes saisonnières',
    customerSales: 'Ventes par client', exportExcel: 'Exporter Excel', exportPdf: 'Exporter PDF',
    permission: 'Permission', role: 'Rôle', admin: 'Admin / propriétaire', storekeeper: 'Magasinier',
    seller: 'Vendeur', viewer: 'Consultation', save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer',
    edit: 'Modifier', delete: 'Supprimer', noResults: 'Aucun résultat', quantityAvailable: 'Disponible',
    all: 'Tout', ready: 'Prêt à vendre', inProgress: 'En production', draft: 'Brouillon',
    sent: 'Envoyée', received: 'Reçue', receive: 'Réceptionner', send: 'Envoyer', newPurchase: 'Nouvelle commande',
    nameAr: 'Nom en arabe', nameFr: 'Nom en français', scientific: 'Nom scientifique (facultatif)',
    purchasePrice: "Prix d'achat", salePrice: 'Prix de vente', minStock: 'Stock minimum',
    imageUrl: "URL de l'image (facultatif)", choose: 'Choisir', amount: 'Quantité', update: 'Mettre à jour',
    productName: 'Produit', selectProduct: 'Choisir un produit', selectCustomer: 'Choisir un client',
    selectSupplier: 'Choisir un fournisseur', removeLine: "Retirer l'article", batchSeed: 'Type de semence',
    sowingDate: 'Date de semis', expectedDate: 'Date prévue', add: 'Ajouter',
    welcome: 'Bonjour, M. Ezzahi', welcomeSub: 'Voici le résumé de votre pépinière aujourd’hui.',
    overviewPeriod: '30 derniers jours', monthlyRevenue: 'Ventes', stockIn: 'Entrées', stockOut: 'Sorties',
    day: "Aujourd'hui", week: 'Cette semaine', allLocations: 'Tous emplacements', greenhouse: 'Serre',
    noImage: 'Plante', actionsSoon: 'Bientôt', rows: 'mouvements', salesUnit: 'ventes',
    creditBalance: 'Solde crédit', customers: 'Clients', orders: 'Commandes',
    createOrder: 'Créer commande', print: 'Imprimer', done: 'Terminé', confirmDelete: 'Supprimer ce produit ?',
    highLoss: 'Taux de perte élevé', readySoon: 'Lots bientôt prêts',
    logout: 'Déconnexion', loading: 'Chargement des données...', batchProduct: 'Produit à stocker',
  },
};

const navGroups = [
  { title: 'overview', items: [['dashboard', LayoutDashboard]] },
  { title: 'inventory', items: [['products', Package], ['movements', ArrowLeftRight], ['production', Flower2]] },
  { title: 'operations', items: [['purchasing', ShoppingCart], ['sales', Users], ['alerts', Bell]] },
  { title: 'settings', items: [['reports', Activity], ['users', ShieldCheck]] },
];
const frenchCategoryLabels = {
  'نباتات زينة': 'Plantes ornementales',
  'أشجار مثمرة': 'Arbres fruitiers',
  'نباتات داخلية': "Plantes d'intérieur",
  'زهور وشتلات': 'Fleurs et plants',
  'صبار وعصاريات': 'Cactus et succulentes',
  'نباتات عطرية': 'Plantes aromatiques',
  'بذور': 'Graines',
  'أصص وحاويات': 'Pots et contenants',
  'تربة وأسمدة': 'Terreaux et engrais',
  'أدوات وري': 'Outils et irrigation',
};

const chartTooltip = { contentStyle: { borderRadius: 12, border: '1px solid #e8eee8', fontFamily: 'Cairo', fontSize: 12 } };
const currency = (value) => `${Number(value || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ت`;
const dateLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' });

function IconButton({ children, onClick, label, className = '' }) {
  return <button aria-label={label} title={label} onClick={onClick} className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-forest dark:hover:bg-slate-700 ${className}`}>{children}</button>;
}

function Badge({ children, tone = 'green' }) {
  const tones = {
    green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    gray: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">{title}</h2>
          <IconButton label="إغلاق" onClick={onClose}><X size={19} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400"><Leaf size={30} className="mb-2 text-green-300" /><p className="text-sm">{text}</p></div>;
}

export default function App() {
  const [language, setLanguage] = useState('ar');
  const [dark, setDark] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productSize, setProductSize] = useState('');
  const [productStatus, setProductStatus] = useState('');
  const [movementFilter, setMovementFilter] = useState('');
  const [productView, setProductView] = useState('table');
  const t = (key) => translations[language][key] || key;
  const categoryLabel = (category) => language === 'fr' ? frenchCategoryLabels[category] || category : category;
  const isRtl = language === 'ar';

  const refreshWorkspace = async (token = getAccessToken()) => {
    const [productsData, movementsData, batchesData, ordersData, customersData, suppliersData, salesData] = await Promise.all([
      apiRequest('/products', { token }),
      apiRequest('/movements', { token }),
      apiRequest('/production/batches', { token }),
      apiRequest('/purchase-orders', { token }),
      apiRequest('/customers', { token }),
      apiRequest('/suppliers', { token }),
      apiRequest('/sales', { token }),
    ]);
    const data = normalizeWorkspace({
      products: productsData, movements: movementsData, batches: batchesData,
      orders: ordersData, customers: customersData, suppliers: suppliersData, sales: salesData,
    });
    setProducts(data.products);
    setMovements(data.movements);
    setBatches(data.batches);
    setOrders(data.orders);
    setCustomers(data.customers);
    setSuppliers(data.suppliers);
    setSales(data.sales);
  };

  useEffect(() => {
    const expireSession = () => {
      clearAccessToken();
      setUser(null);
      setProducts([]);
      setMovements([]);
      setDataError('انتهت صلاحية الجلسة. سجّل الدخول مجدداً.');
    };
    window.addEventListener('mashtal:auth-expired', expireSession);
    const token = getAccessToken();
    if (!token) {
      setAppLoading(false);
      return () => window.removeEventListener('mashtal:auth-expired', expireSession);
    }
    let active = true;
    Promise.all([apiRequest('/auth/me', { token }), refreshWorkspace(token)])
      .then(([profile]) => { if (active) setUser(profile); })
      .catch(() => {
        if (active) {
          clearAccessToken();
          setDataError('تعذر الاتصال بالخادم. تحقق من تشغيل واجهة API.');
        }
      })
      .finally(() => { if (active) setAppLoading(false); });
    return () => {
      active = false;
      window.removeEventListener('mashtal:auth-expired', expireSession);
    };
  }, []);

  const handleLogin = async (email, password) => {
    const profile = await login(email, password);
    setDataLoading(true);
    try {
      await refreshWorkspace();
      setDataError('');
      setUser(profile);
    } catch (error) {
      clearAccessToken();
      throw error;
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      notify(`تعذر إنهاء الجلسة على الخادم: ${error.message}`);
    } finally {
      clearAccessToken();
      setUser(null);
      setProducts([]);
      setMovements([]);
      setBatches([]);
      setCustomers([]);
      setSuppliers([]);
      setOrders([]);
      setSales([]);
      setActivePage('dashboard');
    }
  };

  const quantities = useMemo(() => movements.reduce((totals, movement) => {
    const sign = movement.type.endsWith('IN') ? 1 : movement.type.endsWith('OUT') ? -1 : 0;
    totals[movement.productId] = (totals[movement.productId] || 0) + movement.quantity * sign;
    return totals;
  }, {}), [movements]);
  const getQty = (productId) => Math.max(0, quantities[productId] || 0);
  const productById = (id) => products.find((p) => p.id === id);
  const lowProducts = products.filter((p) => getQty(p.id) <= p.minimum).sort((a, b) => getQty(a.id) - getQty(b.id));
  const stockValue = products.reduce((sum, p) => sum + getQty(p.id) * p.purchasePrice, 0);
  const monthlyLoss = movements.filter((m) => m.type === 'Loss OUT' && m.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((sum, m) => sum + m.quantity, 0);
  const navigate = (page) => { setActivePage(page); setMobileNav(false); setQuery(''); };
  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2800); };

  const addMovement = async (data) => {
    const typeMap = {
      'Purchase IN': 'PURCHASE_IN',
      'Production IN': 'PRODUCTION_IN',
      'Sale OUT': 'SALE_OUT',
      'Loss OUT': 'LOSS_OUT',
      Adjustment: data.direction === 'OUT' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN',
      Transfer: 'TRANSFER',
    };
    const isOut = data.type.endsWith('OUT') || (data.type === 'Adjustment' && data.direction === 'OUT');
    const body = {
      productId: data.productId,
      type: typeMap[data.type],
      quantity: Number(data.quantity),
      reason: data.reason || undefined,
      reference: data.reference || undefined,
      ...(data.date && { effectiveAt: new Date(`${data.date}T12:00:00`).toISOString() }),
      ...(data.type === 'Transfer'
        ? { fromLocation: data.fromLocation || productById(data.productId)?.location, toLocation: data.toLocation }
        : isOut ? { fromLocation: data.location } : { toLocation: data.location }),
    };
    try {
      await apiRequest('/movements', { method: 'POST', body });
      await refreshWorkspace();
      notify('تم تسجيل حركة المخزون بنجاح');
      setModal(null);
    } catch (error) {
      notify(error.message);
    }
  };

  const openProductForm = (product = null) => setModal({ type: 'product', product });
  const saveProduct = async (data) => {
    const required = ['nameAr', 'nameFr', 'category', 'size', 'purchasePrice', 'salePrice', 'minimum', 'location'];
    if (required.some((key) => !String(data[key] ?? '').trim()) || Number(data.salePrice) < 0 || Number(data.purchasePrice) < 0) {
      return notify('يرجى استكمال الحقول المطلوبة بقيم صحيحة');
    }
    const body = {
      nameAr: data.nameAr.trim(),
      nameFr: data.nameFr.trim(),
      scientific: data.scientific || '',
      category: data.category,
      size: data.size,
      purchasePrice: Number(data.purchasePrice),
      salePrice: Number(data.salePrice),
      minimum: Number(data.minimum),
      location: data.location,
      image: data.image || '',
      ...(!data.id && { initialQuantity: Number(data.initialQuantity || 0) }),
    };
    try {
      await apiRequest(data.id ? `/products/${data.id}` : '/products', {
        method: data.id ? 'PATCH' : 'POST',
        body,
      });
      await refreshWorkspace();
      notify(data.id ? 'تم تحديث بيانات المنتج' : 'تمت إضافة المنتج');
      setModal(null);
    } catch (error) {
      notify(error.message);
    }
  };

  const deleteProduct = async (product) => {
    if (getQty(product.id) > 0) return notify('لا يمكن حذف منتج لديه رصيد. سجّل حركة تسوية أولاً.');
    if (window.confirm(t('confirmDelete'))) {
      try {
        await apiRequest(`/products/${product.id}`, { method: 'DELETE' });
        await refreshWorkspace();
        notify('تم حذف المنتج');
      } catch (error) {
        notify(error.message);
      }
    }
  };

  const markBatchReady = async (batch) => {
    if (batch.stage === 'ready') return;
    try {
      await apiRequest(`/production/batches/${batch.id}/ready`, { method: 'POST' });
      await refreshWorkspace();
      notify('تم تحويل الدفعة إلى المخزون الجاهز');
    } catch (error) {
      notify(error.message);
    }
  };

  const submitSale = async (data) => {
    if (!data.customerId || !data.lines.length) return notify('اختر عميلاً وأضف منتجاً واحداً على الأقل');
    const requestedQuantities = data.lines.reduce((totals, line) => {
      totals[line.productId] = (totals[line.productId] || 0) + Number(line.quantity || 0);
      return totals;
    }, {});
    for (const line of data.lines) {
      if (!line.productId || Number(line.quantity) <= 0) return notify('تحقق من المنتجات والكميات');
      if (requestedQuantities[line.productId] > getQty(line.productId)) return notify(`المخزون غير كافٍ لمنتج ${productById(line.productId)?.nameAr || ''}`);
    }
    try {
      const sale = await apiRequest('/sales', {
        method: 'POST',
        body: {
          customerId: data.customerId,
          payment: data.payment.toUpperCase(),
          lines: data.lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
        },
      });
      await refreshWorkspace();
      notify(`تم تسجيل البيع ${sale.code} بنجاح`);
      setModal(null);
    } catch (error) {
      notify(error.message);
    }
  };

  const receiveOrder = async (order) => {
    if (order.status === 'Received') return;
    try {
      await apiRequest(`/purchase-orders/${order.id}/receive`, { method: 'PATCH' });
      await refreshWorkspace();
      notify('تم استلام الطلب وتحديث المخزون');
    } catch (error) {
      notify(error.message);
    }
  };
  const sendOrder = async (order) => {
    try {
      await apiRequest(`/purchase-orders/${order.id}/send`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(`تم إرسال الطلب ${order.code || order.id}`);
    } catch (error) {
      notify(error.message);
    }
  };
  const createBatch = async (batch) => {
    if (!batch.seed.trim() || !batch.productId || !batch.sown || !batch.readyDate) {
      return notify('يرجى استكمال بيانات الدفعة');
    }
    try {
      await apiRequest('/production/batches', {
        method: 'POST',
        body: {
          code: `B-${Date.now().toString(36).toUpperCase()}`,
          seedType: batch.seed.trim(),
          productId: batch.productId,
          sowingDate: new Date(`${batch.sowing}T12:00:00`).toISOString(),
          quantitySown: Number(batch.sown),
          expectedReadyDate: new Date(`${batch.readyDate}T12:00:00`).toISOString(),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify('تم إنشاء دفعة الإنتاج');
    } catch (error) {
      notify(error.message);
    }
  };
  const createPurchaseOrder = async (order) => {
    if (!order.supplierId || !order.lines.length || order.lines.some((line) => !line.productId || Number(line.quantity) <= 0)) {
      return notify('يرجى استكمال بيانات الطلب');
    }
    try {
      await apiRequest('/purchase-orders', {
        method: 'POST',
        body: {
          supplierId: order.supplierId,
          lines: order.lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify('تم إنشاء طلب الشراء كمسودة');
    } catch (error) {
      notify(error.message);
    }
  };

  const totalTodaySales = sales.filter((sale) => sale.date === new Date().toISOString().slice(0, 10)).reduce((sum, sale) => sum + sale.total, 0);
  const filteredProducts = products.filter((product) => {
    const searchText = `${product.nameAr} ${product.nameFr} ${product.scientific} ${product.category}`.toLowerCase();
    const status = getQty(product.id) === 0 ? 'out' : getQty(product.id) <= product.minimum ? 'low' : 'available';
    return (!query || searchText.includes(query.toLowerCase())) &&
      (!productCategory || product.category === productCategory) &&
      (!productSize || product.size === productSize) && (!productStatus || status === productStatus);
  });
  const filteredMovements = movements.filter((m) => (!movementFilter || (movementFilter === 'Adjustment' ? m.type.startsWith('Adjustment') : m.type === movementFilter)) &&
    (!query || `${m.reference} ${m.reason} ${productById(m.productId)?.nameAr || ''}`.toLowerCase().includes(query.toLowerCase())));

  const showMovementModal = (seedType = '') => setModal({ type: 'movement', seedType });
  const firstProductName = (id) => (productById(id)?.[isRtl ? 'nameAr' : 'nameFr'] || productById(id)?.nameAr || '—');

  const renderDashboard = () => {
    const metricCards = [
      { title: t('totalProducts'), value: products.length, suffix: t('productsUnit'), icon: Package, color: 'bg-green-50 text-forest', change: '+4.8%', positive: true },
      { title: t('stockValue'), value: currency(stockValue), suffix: '', icon: Wallet, color: 'bg-amber-50 text-amber-700', change: '+2.6%', positive: true },
      { title: t('lowStock'), value: lowProducts.length, suffix: t('items'), icon: AlertTriangle, color: 'bg-orange-50 text-orange-700', change: 'تحتاج متابعة', positive: false },
      { title: t('monthlyLosses'), value: monthlyLoss, suffix: t('items'), icon: Flower2, color: 'bg-rose-50 text-rose-600', change: 'هذا الشهر', positive: false },
      { title: t('todaySales'), value: currency(totalTodaySales), suffix: '', icon: ShoppingBag, color: 'bg-sky-50 text-sky-700', change: '+12.4%', positive: true },
    ];
    const flowData = Array.from({ length: 10 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (9 - i) * 3);
      const key = date.toISOString().slice(0, 10);
      const slice = movements.filter((m) => m.date === key);
      return { day: date.toLocaleDateString(isRtl ? 'ar-TN' : 'fr-TN', { day: 'numeric', month: 'short' }), inbound: slice.filter((m) => m.type.endsWith('IN')).reduce((n, m) => n + m.quantity, 0), outbound: slice.filter((m) => m.type.endsWith('OUT')).reduce((n, m) => n + m.quantity, 0) };
    });
    const catData = categories.map((category) => ({
      name: categoryLabel(category), value: products.filter((p) => p.category === category).reduce((sum, p) => sum + getQty(p.id) * p.purchasePrice, 0),
    })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
    const salesData = [
      { month: isRtl ? 'جانفي' : 'Janv.', sales: 3250 }, { month: isRtl ? 'فيفري' : 'Févr.', sales: 4180 }, { month: isRtl ? 'مارس' : 'Mars', sales: 7620 },
      { month: isRtl ? 'أفريل' : 'Avr.', sales: 9840 }, { month: isRtl ? 'ماي' : 'Mai', sales: 11200 }, { month: isRtl ? 'جوان' : 'Juin', sales: 7650 },
      { month: isRtl ? 'جويلية' : 'Juil.', sales: 5890 }, { month: isRtl ? 'أوت' : 'Août', sales: 5120 }, { month: isRtl ? 'سبتمبر' : 'Sept.', sales: 8230 },
      { month: isRtl ? 'أكتوبر' : 'Oct.', sales: 10450 }, { month: isRtl ? 'نوفمبر' : 'Nov.', sales: 7830 }, { month: isRtl ? 'ديسمبر' : 'Déc.', sales: 4360 },
    ];
    const colors = ['#2E7D32', '#75A86D', '#F9A825', '#8D6E63', '#63A9A1', '#A4C676'];
    return <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-sm font-semibold text-slate-400">{t('today')} · {new Date().toLocaleDateString(isRtl ? 'ar-TN' : 'fr-TN', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">{t('welcome')} <span className="text-2xl">🌿</span></h1><p className="mt-1 text-sm text-slate-500">{t('welcomeSub')}</p></div>
        <button onClick={() => showMovementModal()} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"><Plus size={17} />{t('newMovement')}</button>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card, index) => <div key={card.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}><card.icon size={20} /></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${card.positive ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'}`}>{card.positive && <span className="me-1">↗</span>}{card.change}</span></div>
          <p className="mt-4 text-xs font-semibold text-slate-500">{card.title}</p><p className={`${index === 1 || index === 4 ? 'text-[17px]' : 'text-2xl'} mt-1 font-extrabold text-slate-800 dark:text-white`}>{card.value} <span className="text-xs font-medium text-slate-400">{card.suffix}</span></p>
        </div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-extrabold text-slate-800 dark:text-white">{t('stockFlow')}</h2><p className="text-xs text-slate-400">{t('overviewPeriod')}</p></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2 w-2 rounded-full bg-forest" />{t('stockIn')}</span><span className="flex items-center gap-2 text-slate-500"><i className="h-2 w-2 rounded-full bg-amber-400" />{t('stockOut')}</span></div></div>
          <ResponsiveContainer width="100%" height={235}><AreaChart data={flowData} margin={{ left: -18, right: 6, top: 8 }}><defs><linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2E7D32" stopOpacity={0.2} /><stop offset="95%" stopColor="#2E7D32" stopOpacity={0} /></linearGradient><linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F9A825" stopOpacity={0.2} /><stop offset="95%" stopColor="#F9A825" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef2ed" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip {...chartTooltip} /><Area type="monotone" dataKey="inbound" name={t('stockIn')} stroke="#2E7D32" fill="url(#inGrad)" strokeWidth={2.5} /><Area type="monotone" dataKey="outbound" name={t('stockOut')} stroke="#F9A825" fill="url(#outGrad)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
          <div className="mb-4"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('categoryValue')}</h2><p className="text-xs text-slate-400">{t('tnd')}</p></div>
          {catData.length ? <div className="flex items-center gap-1"><ResponsiveContainer width="55%" height={220}><PieChart><Pie data={catData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={83} paddingAngle={3} stroke="none">{catData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => currency(value)} {...chartTooltip} /></PieChart></ResponsiveContainer><div className="min-w-0 flex-1 space-y-2">{catData.slice(0, 5).map((item, index) => <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-2 text-slate-500"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} /><span className="truncate">{item.name}</span></span><b className="text-slate-700 dark:text-slate-200">{Math.round(item.value).toLocaleString('fr-TN')}</b></div>)}</div></div> : <Empty text={t('noResults')} />}
        </section>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold text-slate-800 dark:text-white">{t('salesTrend')}</h2><p className="text-xs text-slate-400">TND · 2026</p></div><button className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-bold text-forest">{t('overviewPeriod')} <ChevronDown size={13} className="inline" /></button></div>
          <ResponsiveContainer width="100%" height={190}><ComposedChart data={salesData} margin={{ left: -18, right: 6, top: 8 }}><CartesianGrid stroke="#eef2ed" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip {...chartTooltip} formatter={(value) => currency(value)} /><Bar dataKey="sales" name={t('monthlyRevenue')} fill="#dceddc" radius={[5, 5, 0, 0]} /><Line type="monotone" dataKey="sales" stroke="#2E7D32" strokeWidth={2.5} dot={false} /></ComposedChart></ResponsiveContainer>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('lowStockList')}</h2><button onClick={() => navigate('products')} className="text-xs font-bold text-forest">{t('seeAll')} <ChevronLeft size={13} className="inline" /></button></div>
          <div className="space-y-3">{lowProducts.slice(0, 5).map((product) => <div key={product.id} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-forest"><Leaf size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{firstProductName(product.id)}</p><p className="text-[10px] text-slate-400">{product.location}</p></div><Badge tone={getQty(product.id) === 0 ? 'red' : 'amber'}>{getQty(product.id)} / {product.minimum}</Badge></div>)}
          {!lowProducts.length && <Empty text={t('noResults')} />}</div>
        </section>
      </div>
      <div className="flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-l from-green-800 to-forest px-5 py-4 text-white shadow-soft"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Sun size={25} /></div><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{t('seasonalTip')} <span className="text-sun">✦</span></p><p className="mt-1 text-xs leading-6 text-green-50/90">{t('tip')}</p></div><Flower2 size={54} className="hidden shrink-0 text-white/20 sm:block" /></div>
    </div>;
  };

  const renderProducts = () => <div className="space-y-5">
    <PageHeading title={t('products')} subtitle={`${products.length} ${t('productsUnit')} · ${t('inStock')} ${products.reduce((sum, p) => sum + getQty(p.id), 0).toLocaleString('fr-TN')}`} action={<button onClick={() => openProductForm()} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('addProduct')}</button>} />
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 ltr:left-3" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('searchProducts')} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-9 ps-3 text-xs outline-none focus:border-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" /></label>
        <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allCategories')}</option>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select>
        <select value={productSize} onChange={(e) => setProductSize(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allSizes')}</option>{[...new Set(products.map((p) => p.size))].map((size) => <option key={size}>{size}</option>)}</select>
        <select value={productStatus} onChange={(e) => setProductStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allStatuses')}</option><option value="available">{t('available')}</option><option value="low">{t('low')}</option><option value="out">{t('out')}</option></select>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-700"><button onClick={() => setProductView('table')} className={`rounded-lg px-3 text-xs font-bold ${productView === 'table' ? 'bg-white text-forest shadow-sm dark:bg-slate-600' : 'text-slate-500'}`}>{t('table')}</button><button onClick={() => setProductView('cards')} className={`rounded-lg px-3 text-xs font-bold ${productView === 'cards' ? 'bg-white text-forest shadow-sm dark:bg-slate-600' : 'text-slate-500'}`}>{t('cards')}</button></div>
      </div>
    </div>
    {productView === 'table' ? <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-right text-xs"><thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-slate-700/70"><tr>{[t('product'), t('category'), t('size'), t('price'), t('quantity'), t('minimum'), t('location'), t('status'), t('actions')].map((name) => <th key={name} className="px-4 py-3.5">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{filteredProducts.map((product) => {
      const qty = getQty(product.id); const tone = qty === 0 ? 'red' : qty <= product.minimum ? 'amber' : 'green';
      return <tr key={product.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-700/30"><td className="px-4 py-3"><div className="flex items-center gap-3"><ProductPhoto product={product} /><div><p className="font-bold text-slate-700 dark:text-slate-100">{firstProductName(product.id)}</p><p className="mt-0.5 text-[10px] text-slate-400" dir="ltr">{product.scientific || product.nameFr}</p></div></div></td><td className="px-4 py-3 text-slate-500">{categoryLabel(product.category)}</td><td className="px-4 py-3 text-slate-500">{product.size}</td><td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{currency(product.salePrice)}</td><td className="px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200">{qty}</td><td className="px-4 py-3 text-slate-500">{product.minimum}</td><td className="px-4 py-3 text-slate-500">{product.location}</td><td className="px-4 py-3"><Badge tone={tone}>{qty === 0 ? t('out') : qty <= product.minimum ? t('low') : t('available')}</Badge></td><td className="px-4 py-3"><div className="flex gap-1"><IconButton label={t('edit')} onClick={() => openProductForm(product)}><Settings2 size={16} /></IconButton><IconButton label={t('delete')} onClick={() => deleteProduct(product)}><MoreHorizontal size={17} /></IconButton></div></td></tr>;
    })}</tbody></table>{!filteredProducts.length && <Empty text={t('noResults')} />}</div><div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-700">{filteredProducts.length} {t('productsUnit')}</div></div> :
      filteredProducts.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} quantity={getQty(product.id)} t={t} isRtl={isRtl} categoryLabel={categoryLabel} onEdit={() => openProductForm(product)} onDelete={() => deleteProduct(product)} />)}</div> : <Empty text={t('noResults')} />}
  </div>;

  const renderMovements = () => <div className="space-y-5">
    <PageHeading title={t('movements')} subtitle={`${movements.length} ${t('rows')} · ${t('overviewPeriod')}`} action={<button onClick={() => showMovementModal()} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newMovement')}</button>} />
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('searchProducts')} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-9 ps-3 text-xs outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white" /></label>
      <select value={movementFilter} onChange={(e) => setMovementFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allTypes')}</option>{['Purchase IN', 'Production IN', 'Sale OUT', 'Loss OUT', 'Adjustment', 'Transfer'].map((type) => <option key={type} value={type}>{movementTypeLabel(type, t)}</option>)}</select>
      <button onClick={() => { setQuery(''); setMovementFilter(''); }} className="rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-500 dark:border-slate-600">{t('filter')}</button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-xs"><thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-slate-700/70"><tr>{[t('date'), t('product'), t('movementType'), t('amount'), t('reason'), t('location'), t('reference')].map((name) => <th key={name} className="px-4 py-3.5">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{filteredMovements.slice(0, 100).map((movement) => <tr key={movement.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30"><td className="px-4 py-3 text-slate-500">{dateLabel(movement.date)}</td><td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-100">{firstProductName(movement.productId)}</td><td className="px-4 py-3"><Badge tone={movement.type.endsWith('IN') ? 'green' : movement.type.endsWith('OUT') ? movement.type === 'Loss OUT' ? 'red' : 'amber' : 'blue'}>{movement.type.endsWith('IN') ? <ArrowDownLeft size={13} /> : movement.type.endsWith('OUT') ? <ArrowUpRight size={13} /> : <ArrowLeftRight size={13} />}{movementTypeLabel(movement.type, t)}</Badge></td><td className={`px-4 py-3 font-extrabold ${movement.type.endsWith('OUT') ? 'text-rose-600' : movement.type.endsWith('IN') ? 'text-forest' : 'text-slate-600'}`}>{movement.type.endsWith('OUT') ? '−' : '+'}{movement.quantity}</td><td className="px-4 py-3 text-slate-500">{movement.reason}</td><td className="px-4 py-3 text-slate-500">{movement.location}</td><td className="px-4 py-3 font-semibold text-slate-400" dir="ltr">{movement.reference}</td></tr>)}</tbody></table>{!filteredMovements.length && <Empty text={t('noResults')} />}</div></div>
  </div>;

  const renderProduction = () => <div className="space-y-5">
    <PageHeading title={t('production')} subtitle={`${batches.length} ${t('batch')} · من البذور إلى الشتلات الجاهزة`} action={<button onClick={() => setModal({ type: 'batch' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newBatch')}</button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(stageLabels).map(([stage, label], index) => <div key={stage} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><span className={`h-2.5 w-2.5 rounded-full ${['bg-amber-400', 'bg-sky-400', 'bg-green-500', 'bg-forest'][index]}`} /></div><p className="mt-3 text-2xl font-extrabold text-slate-800 dark:text-white">{batches.filter((b) => b.stage === stage).length}</p><p className="mt-1 text-[11px] text-slate-400">{t('batch')}</p></div>)}</div>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">دفعات الإنتاج</h2><span className="text-xs text-slate-400">{batches.reduce((sum, batch) => sum + batch.sown - batch.loss, 0)} شتلة قيد المتابعة</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right text-xs"><thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('batch'), t('batchSeed'), t('sowingDate'), t('sown'), t('stage'), t('readyDate'), t('actions')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{batches.map((batch) => <tr key={batch.id}><td className="px-4 py-4 font-extrabold text-forest">{batch.id}</td><td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-100">{batch.seed}</td><td className="px-4 py-4 text-slate-500">{dateLabel(batch.sowing)}</td><td className="px-4 py-4 text-slate-600 dark:text-slate-300">{batch.sown} <span className="text-[10px] text-slate-400">· {batch.loss} فاقد</span></td><td className="px-4 py-4"><BatchBadge stage={batch.stage} /></td><td className="px-4 py-4 text-slate-500">{dateLabel(batch.readyDate)}</td><td className="px-4 py-4">{batch.stage !== 'ready' && <button onClick={() => markBatchReady(batch)} className="rounded-lg bg-green-50 px-3 py-1.5 text-[11px] font-bold text-forest hover:bg-green-100">{t('markReady')}</button>}{batch.stage === 'ready' && <Badge>{t('done')}</Badge>}</td></tr>)}</tbody></table></div></div>
    <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4 text-xs leading-6 text-green-900"><div className="flex gap-3"><Flower2 className="mt-1 shrink-0" size={18} /><p><b>مراحل الإنتاج:</b> عند تحويل الدفعة إلى «جاهز للبيع»، تُسجّل الكمية الصالحة تلقائياً كحركة إنتاج واردة في المخزون، مع خصم الفاقد المسجّل.</p></div></div>
  </div>;

  const renderPurchasing = () => <div className="space-y-5">
    <PageHeading title={t('purchasing')} subtitle={`${suppliers.length} موردين · ${orders.length} طلبات شراء`} action={<button onClick={() => setModal({ type: 'order' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newOrder')}</button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => <div key={supplier.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-forest"><Truck size={19} /></div><Badge tone="blue">{supplier.type}</Badge></div><h3 className="mt-3 font-extrabold text-slate-800 dark:text-white">{supplier.name}</h3><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><Building2 size={13} />{supplier.city}</span><span dir="ltr">{supplier.phone}</span></div></div>)}</div>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('purchaseOrders')}</h2><span className="text-xs text-slate-400">{orders.filter((o) => o.status !== 'Received').length} طلب مفتوح</span></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-right text-xs"><thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('order'), t('supplier'), t('date'), t('lines'), t('total'), t('status'), t('actions')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{orders.map((order) => <tr key={order.id}><td className="px-4 py-4 font-extrabold text-forest" dir="ltr">{order.code || order.id}</td><td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-100">{order.supplier}</td><td className="px-4 py-4 text-slate-500">{dateLabel(order.date)}</td><td className="px-4 py-4 text-slate-500">{order.lines}</td><td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-200">{currency(order.total)}</td><td className="px-4 py-4"><OrderBadge status={order.status} t={t} /></td><td className="px-4 py-4"><div className="flex gap-2">{order.status === 'Draft' && <button onClick={() => sendOrder(order)} className="rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700">{t('send')}</button>}{order.status !== 'Received' && <button onClick={() => receiveOrder(order)} className="rounded-lg bg-green-50 px-3 py-1.5 text-[11px] font-bold text-forest">{t('receive')}</button>}</div></td></tr>)}</tbody></table>{!orders.length && <Empty text={t('noResults')} />}</div></div>
  </div>;

  const renderSales = () => {
    const totalCredits = customers.reduce((sum, customer) => sum + customer.credit, 0);
    return <div className="space-y-5">
      <PageHeading title={t('sales')} subtitle={`${customers.length} ${t('customers')} · ${sales.length} ${t('salesUnit')}`} action={<button onClick={() => setModal({ type: 'sale' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newSale')}</button>} />
      <div className="grid gap-4 sm:grid-cols-3"><MiniStat title={t('customers')} value={customers.length} icon={Users} /><MiniStat title={t('sales')} value={sales.length} icon={ShoppingBag} /><MiniStat title={t('creditBalance')} value={currency(totalCredits)} icon={CreditCard} /></div>
      <div className="grid gap-4 xl:grid-cols-3"><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-2"><h2 className="mb-4 font-extrabold text-slate-800 dark:text-white">آخر المبيعات</h2><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-right text-xs"><thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('reference'), t('customer'), t('date'), t('total'), t('payment')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{sales.map((sale) => <tr key={sale.id}><td className="px-4 py-4 font-extrabold text-forest" dir="ltr">{sale.id}</td><td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-100">{sale.customer}</td><td className="px-4 py-4 text-slate-500">{dateLabel(sale.date)}</td><td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-100">{currency(sale.total)}</td><td className="px-4 py-4"><Badge tone={sale.payment === 'paid' ? 'green' : 'amber'}>{sale.payment === 'paid' ? t('paid') : t('credit')}</Badge></td></tr>)}</tbody></table></div></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800"><h2 className="mb-4 font-extrabold text-slate-800 dark:text-white">{t('customers')}</h2><div className="max-h-[390px] space-y-3 overflow-auto">{customers.map((customer) => <div key={customer.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-forest"><UserRound size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-100">{customer.name}</p><p className="text-[10px] text-slate-400">{customerTypeLabel(customer.type, t)}</p></div>{customer.credit > 0 && <span className="text-[10px] font-bold text-amber-700">{currency(customer.credit)}</span>}</div>)}</div></div></div>
    </div>;
  };

  const renderAlerts = () => {
    const alerts = [
      ...products.filter((p) => getQty(p.id) === 0).map((p) => ({ id: `out-${p.id}`, title: `نفد المخزون: ${p.nameAr}`, detail: `${p.location} · الحد الأدنى ${p.minimum}`, tone: 'red', action: true })),
      ...lowProducts.filter((p) => getQty(p.id) > 0).map((p) => ({ id: `low-${p.id}`, title: `مخزون منخفض: ${p.nameAr}`, detail: `المتاح ${getQty(p.id)} فقط · الحد الأدنى ${p.minimum}`, tone: 'amber', action: true })),
      ...batches.filter((b) => b.stage !== 'ready' && (new Date(`${b.readyDate}T00:00:00`) - new Date()) / 86400000 < 10).map((b) => ({ id: `batch-${b.id}`, title: `${t('readySoon')}: ${b.seed}`, detail: `${b.id} · ${dateLabel(b.readyDate)}`, tone: 'blue' })),
      ...(monthlyLoss > 8 ? [{ id: 'loss-rate', title: t('highLoss'), detail: `${monthlyLoss} شتلة تالفة أو مفقودة هذا الشهر`, tone: 'red' }] : []),
    ];
    return <div className="space-y-5"><PageHeading title={t('alerts')} subtitle={`${alerts.length} تنبيهات تحتاج إلى متابعة`} action={<button onClick={() => setModal({ type: 'order' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><ShoppingCart size={16} />{t('purchaseShortcut')}</button>} />
      <div className="grid gap-4 lg:grid-cols-2">{alerts.map((alert) => <div key={alert.id} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.tone === 'red' ? 'bg-rose-50 text-rose-600' : alert.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}><AlertTriangle size={19} /></div><div className="min-w-0 flex-1"><p className="font-extrabold text-slate-800 dark:text-white">{alert.title}</p><p className="mt-1 text-xs text-slate-500">{alert.detail}</p></div>{alert.action && <button onClick={() => setModal({ type: 'order' })} className="shrink-0 rounded-lg bg-green-50 px-3 py-2 text-[10px] font-extrabold text-forest">{t('newOrder')}</button>}</div>)}
      {!alerts.length && <div className="col-span-full rounded-2xl bg-white p-12 text-center shadow-card dark:bg-slate-800"><Check size={30} className="mx-auto text-forest" /><p className="mt-3 font-bold text-slate-600">لا توجد تنبيهات نشطة حالياً</p></div>}</div>
    </div>;
  };

  const renderReports = () => <div className="space-y-5"><PageHeading title={t('reports')} subtitle="ملخص الأداء والمخزون · نوفمبر 2026" action={<div className="flex gap-2"><button onClick={() => notify('تم تجهيز ملف Excel التجريبي')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><FileSpreadsheet size={16} className="text-green-700" />{t('exportExcel')}</button><button onClick={() => notify('تم تجهيز ملف PDF التجريبي')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><Download size={15} />{t('exportPdf')}</button></div>} />
      <div className="grid gap-4 sm:grid-cols-2">{[
        [t('inventoryReport'), 'تفاصيل الكميات والقيمة الحالية لكل صنف', Package, currency(stockValue)],
        [t('lossReport'), 'الفاقد حسب المرض والصقيع والجفاف والتلف', AlertTriangle, `${monthlyLoss} شتلة`],
        [t('bestSellers'), 'ذروة الربيع والخريف · آخر 12 شهراً', Activity, `${sales.length} ${t('salesUnit')}`],
        [t('customerSales'), 'الأفراد والبستانيون والبلديات', Users, currency(sales.reduce((sum, sale) => sum + sale.total, 0))],
      ].map(([title, subtitle, Icon, amount], index) => <div key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-forest"><Icon size={19} /></span><button onClick={() => notify(`تم فتح تقرير: ${title}`)} className="text-xs font-bold text-forest">{t('seeAll')} <ChevronLeft size={13} className="inline" /></button></div><h2 className="mt-4 font-extrabold text-slate-800 dark:text-white">{title}</h2><p className="mt-1 text-xs text-slate-400">{subtitle}</p><p className="mt-4 text-xl font-extrabold text-forest">{amount}</p>{index === 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[72%] rounded-full bg-gradient-to-l from-green-600 to-lime-400" /></div>}</div>)}</div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="mb-4 flex justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">ملخص تقييم المخزون</h2><span className="text-xs text-slate-400">{products.length} صنف</span></div><div className="overflow-x-auto"><table className="w-full min-w-[550px] text-right text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/70"><tr>{[t('category'), t('products'), t('quantity'), t('stockValue')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{categories.map((category) => { const items = products.filter((p) => p.category === category); if (!items.length) return null; return <tr key={category}><td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-100">{category}</td><td className="px-4 py-3 text-slate-500">{items.length}</td><td className="px-4 py-3 text-slate-500">{items.reduce((sum, p) => sum + getQty(p.id), 0)}</td><td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-100">{currency(items.reduce((sum, p) => sum + getQty(p.id) * p.purchasePrice, 0))}</td></tr>; })}</tbody></table></div></div>
    </div>;
  const renderUsers = () => {
    const permissions = [
      ['عرض لوحة التحكم', true, true, true, true], ['إدارة المنتجات', true, true, false, false],
      ['حركات المخزون', true, true, false, false], ['تسجيل المبيعات', true, false, true, false],
      ['إدارة المشتريات', true, true, false, false], ['التقارير المالية', true, false, false, false],
      ['إدارة المستخدمين', true, false, false, false],
    ];
    return <div className="space-y-5"><PageHeading title={t('users')} subtitle="إدارة الأدوار وصلاحيات فريق العمل" action={<button onClick={() => notify('إضافة المستخدمين متاحة في النسخة الكاملة')} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />إضافة مستخدم</button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['A', t('admin'), 'كامل الصلاحيات', 'bg-green-100 text-forest'], ['م', t('storekeeper'), 'المخزون والمشتريات', 'bg-amber-100 text-amber-800'], ['ب', t('seller'), 'المبيعات والعملاء', 'bg-sky-100 text-sky-800'], ['ش', t('viewer'), 'عرض البيانات فقط', 'bg-slate-100 text-slate-700']].map(([initial, name, desc, classes]) => <div key={name} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold ${classes}`}>{initial}</div><div><p className="font-extrabold text-slate-800 dark:text-white">{name}</p><p className="text-[11px] text-slate-400">{desc}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-700"><span>مستخدم نشط</span><Badge>نشط</Badge></div></div>)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="p-5"><h2 className="font-extrabold text-slate-800 dark:text-white">مصفوفة الصلاحيات</h2><p className="mt-1 text-xs text-slate-400">إدارة الوصول إلى أقسام النظام حسب الدور</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-center text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/70"><tr><th className="px-4 py-3 text-right">{t('permission')}</th>{[t('admin'), t('storekeeper'), t('seller'), t('viewer')].map((role) => <th key={role} className="px-4 py-3">{role}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{permissions.map(([label, ...allowed]) => <tr key={label}><td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-100">{label}</td>{allowed.map((yes, index) => <td key={index} className="px-4 py-3">{yes ? <Check size={17} className="mx-auto text-forest" /> : <X size={15} className="mx-auto text-slate-300" />}</td>)}</tr>)}</tbody></table></div></div>
    </div>;
  };

  const pageRenderers = { dashboard: renderDashboard, products: renderProducts, movements: renderMovements, production: renderProduction, purchasing: renderPurchasing, sales: renderSales, alerts: renderAlerts, reports: renderReports, users: renderUsers };
  const activeTitle = t(activePage);

  if (appLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f9f6] text-sm font-bold text-forest dark:bg-[#121b15]">{t('loading')}</div>;
  }
  if (!user) {
    return <LoginScreen language={language} initialError={dataError} onLanguageChange={() => setLanguage(language === 'ar' ? 'fr' : 'ar')} onLogin={handleLogin} />;
  }

  return <div className={`${dark ? 'dark' : ''} min-h-screen bg-[#f7f9f6] text-slate-800 dark:bg-[#121b15] dark:text-slate-100`} dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="min-h-screen">
      {mobileNav && <button aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 z-40 flex w-[248px] flex-col border-e border-slate-100 bg-white px-4 pb-4 pt-5 transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 ${isRtl ? 'right-0' : 'left-0'} ${mobileNav ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="mb-7 flex items-center gap-3 px-2"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-white shadow-md shadow-green-900/15"><Leaf size={24} /></div><div><h1 className="text-[17px] font-extrabold leading-tight text-slate-800 dark:text-white">مشتل الزاهي</h1><p className="mt-0.5 text-[10px] font-semibold tracking-wide text-slate-400">MASHTAL EZZAHI · TUNISIE</p></div><button onClick={() => setMobileNav(false)} className="ms-auto text-slate-400 lg:hidden"><X size={19} /></button></div>
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#f5f8f4] p-3 dark:bg-slate-800"><div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-lime-400 text-sm font-extrabold text-white">{user.name?.slice(0, 1) || 'ز'}<span className="absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-white bg-green-400" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-700 dark:text-white">{user.name}</p><p className="text-[10px] text-slate-400">{translations.ar[({ ADMIN: 'admin', STOREKEEPER: 'storekeeper', SELLER: 'seller', VIEWER: 'viewer' })[user.role]] || t('viewer')}</p></div><ChevronDown size={14} className="text-slate-400" /></div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {navGroups.map((group) => <div key={group.title}><p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">{t(group.title)}</p><div className="space-y-1">{group.items.map(([page, Icon]) => {
            const count = page === 'alerts' ? lowProducts.length : 0;
            return <button key={page} onClick={() => navigate(page)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold transition ${activePage === page ? 'bg-green-50 text-forest dark:bg-green-900/30 dark:text-green-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}><Icon size={17} strokeWidth={activePage === page ? 2.4 : 1.8} /><span className="flex-1 text-start">{t(page)}</span>{count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1 text-[10px] font-extrabold text-rose-600">{count}</span>}{activePage === page && <span className="h-1.5 w-1.5 rounded-full bg-forest" />}</button>;
          })}</div></div>)}
        </nav>
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#eef7ed] to-[#f8f4e9] p-3 dark:from-slate-800 dark:to-slate-800"><div className="mb-2 flex items-center gap-2 text-forest dark:text-green-300"><CircleHelp size={15} /><span className="text-xs font-extrabold">تحتاج مساعدة؟</span></div><p className="text-[10px] leading-5 text-slate-500 dark:text-slate-400">فريقنا هنا لمساعدتك في إدارة مشتل الزاهي.</p><button onClick={() => notify('سيتم التواصل مع فريق الدعم')} className="mt-2 text-[10px] font-extrabold text-forest dark:text-green-300">تواصل معنا ←</button></div>
        <p className="mt-4 text-center text-[9px] text-slate-400">© 2026 Mashtal Ezzahi · Démo</p>
      </aside>
      <div className={`min-h-screen transition-[margin] duration-300 ${isRtl ? 'lg:mr-[248px]' : 'lg:ml-[248px]'}`}>
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-slate-100 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 md:px-7">
          <button onClick={() => setMobileNav(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><span>الرئيسية</span><ChevronLeft size={13} /><span className="font-bold text-slate-700 dark:text-slate-200">{activeTitle}</span></div>
          <label className="relative ms-auto hidden w-full max-w-[330px] md:block"><Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')} className={`h-10 w-full rounded-xl border border-slate-100 bg-slate-50 text-xs outline-none transition focus:border-green-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${isRtl ? 'pe-9 ps-3' : 'ps-9 pe-3'}`} /></label>
          <IconButton label={t('alerts')} onClick={() => navigate('alerts')} className="relative"><Bell size={19} /><span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-rose-500" /></IconButton>
          <button onClick={() => setLanguage(language === 'ar' ? 'fr' : 'ar')} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-100 px-2.5 text-[11px] font-extrabold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><Globe2 size={15} />{language === 'ar' ? 'FR' : 'عربي'}</button>
          <IconButton label={dark ? 'Light mode' : 'Dark mode'} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
          <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <button onClick={handleLogout} title={t('logout')} className="flex h-9 items-center gap-2 rounded-xl px-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800"><LogOut size={17} /><span className="hidden text-[11px] font-bold sm:inline">{t('logout')}</span></button>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-7 md:py-7">{dataLoading && <div role="status" className="mb-4 rounded-xl bg-green-50 px-4 py-2 text-xs font-bold text-forest">جارٍ تحديث بيانات المخزون…</div>}{dataError && <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">{dataError}</div>}{(pageRenderers[activePage] || renderDashboard)()}</main>
      </div>
    </div>
    {modal?.type === 'product' && <ProductForm product={modal.product} categories={categories} categoryLabel={categoryLabel} t={t} onClose={() => setModal(null)} onSave={saveProduct} />}
    {modal?.type === 'movement' && <MovementForm products={products} productById={productById} getQty={getQty} seedType={modal.seedType} t={t} onClose={() => setModal(null)} onSave={addMovement} />}
    {modal?.type === 'sale' && <SaleForm products={products} customers={customers} getQty={getQty} t={t} onClose={() => setModal(null)} onSave={submitSale} />}
    {modal?.type === 'batch' && <BatchForm products={products} t={t} onClose={() => setModal(null)} onSave={createBatch} />}
    {modal?.type === 'order' && <OrderForm suppliers={suppliers} products={products} t={t} onClose={() => setModal(null)} onSave={createPurchaseOrder} />}
    {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl"><Check size={16} className="text-green-300" />{notice}</div>}
  </div>;
}

function PageHeading({ title, subtitle, action }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">{title}</h1><p className="mt-1 text-xs text-slate-400">{subtitle}</p></div>{action}</div>;
}

function ProductPhoto({ product, large = false }) {
  const [failed, setFailed] = useState(false);
  return <div className={`${large ? 'h-36 w-full rounded-xl' : 'h-11 w-11 rounded-xl'} flex shrink-0 items-center justify-center overflow-hidden bg-green-50 text-forest`}>
    {product.image && !failed ? <img src={product.image} alt={product.nameAr} onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <Leaf size={large ? 30 : 19} />}
  </div>;
}

function ProductCard({ product, quantity, t, isRtl, categoryLabel, onEdit, onDelete }) {
  const tone = quantity === 0 ? 'red' : quantity <= product.minimum ? 'amber' : 'green';
  return <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="relative"><ProductPhoto product={product} large /><div className="absolute left-2 top-2 flex gap-1 rounded-lg bg-white/90 p-1"><IconButton label={t('edit')} onClick={onEdit}><Settings2 size={15} /></IconButton><IconButton label={t('delete')} onClick={onDelete}><MoreHorizontal size={16} /></IconButton></div></div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-extrabold text-slate-800 dark:text-white">{isRtl ? product.nameAr : product.nameFr}</p><p className="mt-1 text-[10px] text-slate-400">{product.scientific || categoryLabel(product.category)}</p></div><Badge tone={tone}>{quantity === 0 ? t('out') : quantity <= product.minimum ? t('low') : t('available')}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-700"><div><p className="text-[10px] text-slate-400">{t('price')}</p><p className="mt-1 font-extrabold text-forest">{currency(product.salePrice)}</p></div><div><p className="text-[10px] text-slate-400">{t('quantity')}</p><p className="mt-1 font-extrabold text-slate-700 dark:text-slate-100">{quantity} <span className="font-normal text-slate-400">/ {product.minimum} min</span></p></div><div className="col-span-2 flex justify-between text-[10px] text-slate-400"><span>{categoryLabel(product.category)} · {product.size}</span><span>{product.location}</span></div></div></div></article>;
}

function Field({ label, children, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>{children}</label>;
}

const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none transition focus:border-green-500 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:bg-slate-700';
const selectClass = inputClass;
function FormActions({ onClose, t, submitLabel }) {
  return <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 dark:border-slate-600">{t('cancel')}</button><button type="submit" className="rounded-xl bg-forest px-5 py-2 text-xs font-bold text-white">{submitLabel || t('save')}</button></div>;
}

function ProductForm({ product, categories, categoryLabel, t, onClose, onSave }) {
  const [form, setForm] = useState(product || { nameAr: '', nameFr: '', scientific: '', category: categories[0], size: '3L', purchasePrice: '', salePrice: '', minimum: 10, location: 'مشتل 1', image: '', initialQuantity: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={product ? `${t('edit')} ${t('product')}` : t('addProduct')} onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="grid gap-4 sm:grid-cols-2">
    <Field label={t('nameAr')}><input required value={form.nameAr} onChange={update('nameAr')} className={inputClass} /></Field><Field label={t('nameFr')}><input required value={form.nameFr} onChange={update('nameFr')} className={inputClass} /></Field>
    <Field label={t('scientific')}><input value={form.scientific || ''} onChange={update('scientific')} className={inputClass} /></Field><Field label={t('category')}><select value={form.category} onChange={update('category')} className={selectClass}>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
    <Field label={t('size')}><select value={form.size} onChange={update('size')} className={selectClass}>{['1L', '3L', '10L', '20L', 'صينية', 'قطعة', 'كيس', 'ظرف'].map((size) => <option key={size}>{size}</option>)}</select></Field><Field label={t('location')}><select value={form.location} onChange={update('location')} className={selectClass}>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>
    <Field label={t('purchasePrice')}><input required type="number" step="0.001" min="0" value={form.purchasePrice} onChange={update('purchasePrice')} className={inputClass} /></Field><Field label={t('salePrice')}><input required type="number" step="0.001" min="0" value={form.salePrice} onChange={update('salePrice')} className={inputClass} /></Field>
    <Field label={t('minStock')}><input required type="number" min="0" value={form.minimum} onChange={update('minimum')} className={inputClass} /></Field>{!product && <Field label={`${t('quantity')} · رصيد افتتاحي`}><input type="number" min="0" value={form.initialQuantity} onChange={update('initialQuantity')} className={inputClass} /></Field>}
    <Field label={t('imageUrl')} className={!product ? '' : 'sm:col-span-2'}><input value={form.image || ''} onChange={update('image')} className={inputClass} dir="ltr" /></Field>
  </div><FormActions onClose={onClose} t={t} /></form></Modal>;
}

function movementTypeLabel(type, t) {
  return ({ 'Purchase IN': t('purchaseIn'), 'Production IN': t('productionIn'), 'Sale OUT': t('saleOut'), 'Loss OUT': t('lossOut'), Adjustment: t('adjustment'), 'Adjustment IN': t('adjustment'), 'Adjustment OUT': t('adjustment'), Transfer: t('transfer') })[type] || type;
}

function MovementForm({ products, productById, getQty, seedType, t, onClose, onSave }) {
  const [form, setForm] = useState({ productId: '', type: seedType || 'Purchase IN', direction: 'IN', quantity: '', date: new Date().toISOString().slice(0, 10), reason: '', location: '', fromLocation: '', toLocation: '', reference: '' });
  const product = productById(form.productId);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('newMovement')} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="grid gap-4 sm:grid-cols-2">
    <Field label={t('productName')} className="sm:col-span-2"><select required value={form.productId} onChange={update('productId')} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.nameAr} · {p.size}</option>)}</select></Field>
    <Field label={t('movementType')}><select value={form.type} onChange={update('type')} className={selectClass}>{['Purchase IN', 'Production IN', 'Sale OUT', 'Loss OUT', 'Adjustment', 'Transfer'].map((type) => <option key={type} value={type}>{movementTypeLabel(type, t)}</option>)}</select></Field>
    {form.type === 'Adjustment' && <Field label={t('movementType')}><select value={form.direction} onChange={update('direction')} className={selectClass}><option value="IN">زيادة المخزون</option><option value="OUT">نقص المخزون</option></select></Field>}
    <Field label={t('amount')}><input required type="number" min="1" value={form.quantity} onChange={update('quantity')} className={inputClass} />{product && (form.type.endsWith('OUT') || (form.type === 'Adjustment' && form.direction === 'OUT')) && <span className="mt-1 block text-[10px] text-slate-400">المتاح حالياً: {getQty(product.id)}</span>}</Field>
    <Field label={t('date')}><input required type="date" value={form.date} onChange={update('date')} className={inputClass} /></Field>
    {form.type === 'Loss OUT' ? <Field label={t('reason')}><select value={form.reason} onChange={update('reason')} className={selectClass}><option value="">اختر السبب</option>{['مرض', 'صقيع', 'جفاف', 'تلف'].map((reason) => <option key={reason}>{reason}</option>)}</select></Field> : <Field label={t('reason')}><input value={form.reason} onChange={update('reason')} className={inputClass} placeholder={form.type === 'Transfer' ? 'الموقع الجديد أو ملاحظة' : ''} /></Field>}
    {form.type === 'Transfer' ? <>
      <Field label="من الموقع"><select required value={form.fromLocation || product?.location || ''} onChange={update('fromLocation')} className={selectClass}><option value="">اختر موقع المصدر</option>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>
      <Field label="إلى الموقع"><select required value={form.toLocation} onChange={update('toLocation')} className={selectClass}><option value="">اختر موقع الوجهة</option>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>
    </> : <Field label={t('location')}><select value={form.location || product?.location || ''} onChange={update('location')} className={selectClass}>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>}
    <Field label={t('reference')}><input value={form.reference} onChange={update('reference')} className={inputClass} /></Field>
  </div><FormActions onClose={onClose} t={t} /></form></Modal>;
}

function SaleForm({ products, customers, getQty, t, onClose, onSave }) {
  const [customerId, setCustomerId] = useState('');
  const [payment, setPayment] = useState('paid');
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const addLine = () => setLines((current) => [...current, { productId: '', quantity: 1 }]);
  const editLine = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const removeLine = (index) => setLines((current) => current.filter((_, i) => i !== index));
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * (products.find((p) => p.id === line.productId)?.salePrice || 0), 0);
  return <Modal title={t('newSale')} onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); onSave({ customerId, payment, lines }); }}><div className="grid gap-4 sm:grid-cols-2">
    <Field label={t('customer')}><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={selectClass}><option value="">{t('selectCustomer')}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.type}</option>)}</select></Field>
    <Field label={t('payment')}><select value={payment} onChange={(e) => setPayment(e.target.value)} className={selectClass}><option value="paid">{t('paid')}</option><option value="credit">{t('credit')}</option></select></Field>
  </div><div className="mt-5 space-y-3">{lines.map((line, index) => <div key={index} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50 sm:grid-cols-[1fr_130px_120px_36px]"><Field label={t('productName')}><select value={line.productId} onChange={(e) => editLine(index, 'productId', e.target.value)} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.nameAr} · متاح {getQty(p.id)}</option>)}</select></Field><Field label={t('quantity')}><input type="number" min="1" value={line.quantity} onChange={(e) => editLine(index, 'quantity', e.target.value)} className={inputClass} /></Field><div className="pb-2 text-xs font-extrabold text-forest">{currency(Number(line.quantity || 0) * (products.find((p) => p.id === line.productId)?.salePrice || 0))}</div><IconButton label={t('removeLine')} onClick={() => removeLine(index)}><X size={16} /></IconButton></div>)}</div>
    <button type="button" onClick={addLine} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest"><Plus size={15} />{t('addLine')}</button>
    <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20"><span className="text-xs font-bold text-slate-600 dark:text-slate-200">{t('total')}</span><b className="text-lg text-forest">{currency(total)}</b></div><FormActions onClose={onClose} t={t} submitLabel={t('createSale')} /></form></Modal>;
}

function BatchForm({ products, t, onClose, onSave }) {
  const [form, setForm] = useState({ seed: '', productId: '', sowing: new Date().toISOString().slice(0, 10), sown: '', readyDate: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('newBatch')} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, sown: Number(form.sown) }); }}><div className="grid gap-4"><Field label={t('batchSeed')}><input required value={form.seed} onChange={update('seed')} className={inputClass} /></Field><Field label={t('batchProduct')}><select required value={form.productId} onChange={update('productId')} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nameAr}</option>)}</select></Field><Field label={t('sowingDate')}><input required type="date" value={form.sowing} onChange={update('sowing')} className={inputClass} /></Field><Field label={t('sown')}><input required type="number" min="1" value={form.sown} onChange={update('sown')} className={inputClass} /></Field><Field label={t('expectedDate')}><input required type="date" value={form.readyDate} onChange={update('readyDate')} className={inputClass} /></Field></div><FormActions onClose={onClose} t={t} /></form></Modal>;
}

function OrderForm({ suppliers, products, t, onClose, onSave }) {
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * (products.find((item) => item.id === line.productId)?.purchasePrice || 0), 0);
  return <Modal title={t('newPurchase')} onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); onSave({ supplierId, lines }); }}>
    <Field label={t('supplier')}><select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectClass}><option value="">{t('selectSupplier')}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <div className="mt-4 space-y-3">{lines.map((line, index) => <div key={index} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50 sm:grid-cols-[1fr_130px_130px_36px]">
      <Field label={t('productName')}><select required value={line.productId} onChange={(e) => updateLine(index, 'productId', e.target.value)} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((item) => <option key={item.id} value={item.id}>{item.nameAr} · {currency(item.purchasePrice)}</option>)}</select></Field>
      <Field label={t('quantity')}><input required type="number" min="1" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} className={inputClass} /></Field>
      <div className="pb-2 text-xs font-extrabold text-forest">{currency(Number(line.quantity || 0) * (products.find((item) => item.id === line.productId)?.purchasePrice || 0))}</div>
      <IconButton label={t('removeLine')} onClick={() => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}><X size={16} /></IconButton>
    </div>)}</div>
    <button type="button" onClick={() => setLines((current) => [...current, { productId: '', quantity: 1 }])} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest"><Plus size={15} />{t('addLine')}</button>
    <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20"><span className="text-xs font-bold text-slate-600 dark:text-slate-200">{t('total')}</span><b className="text-lg text-forest">{currency(total)}</b></div>
    <FormActions onClose={onClose} t={t} submitLabel={t('createOrder')} />
  </form></Modal>;
}

function BatchBadge({ stage }) {
  const tone = { sowing: 'amber', germination: 'blue', growing: 'green', ready: 'green' }[stage] || 'gray';
  return <Badge tone={tone}>{stageLabels[stage]}</Badge>;
}
function OrderBadge({ status, t }) {
  return <Badge tone={status === 'Received' ? 'green' : status === 'Sent' ? 'blue' : 'gray'}>{t(status.toLowerCase())}</Badge>;
}
function MiniStat({ title, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-400">{title}</p><p className="mt-2 text-xl font-extrabold text-slate-800 dark:text-white">{value}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-forest"><Icon size={19} /></span></div></div>;
}
function customerTypeLabel(type, t) {
  return ({ فرد: t('individual'), بستاني: t('landscaper'), بلدية: t('municipality') })[type] || type;
}
