import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell,
  Boxes, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, ClipboardList, CreditCard, Download, FileSpreadsheet, Flower2,
  Globe2, KeyRound, LayoutDashboard, Leaf, Menu, Moon, MoreHorizontal, Package, Plus,
  Search, Settings2, ShieldCheck, ShoppingBag, ShoppingCart, Sun, Tag, Truck,
  UserRound, Users, Wallet, X, LogOut,
} from 'lucide-react';
import { stageLabels } from './data';
import LoginScreen from './LoginScreen.jsx';
import { apiRequest, clearAccessToken, getAccessToken, login, normalizeWorkspace } from './api.js';

const DashboardCharts = lazy(() => import('./DashboardCharts.jsx'));

const translations = {
  ar: {
    dashboard: 'لوحة التحكم', accounting: 'المحاسبة', expenses: 'المصاريف', products: 'المنتجات', movements: 'حركة المخزون',
    production: 'الإنتاج', purchasing: 'الموردون والشراء', sales: 'العملاء والمبيعات', returns: 'طلبات الإرجاع',
    alerts: 'التنبيهات', reports: 'التقارير', users: 'المستخدمون والصلاحيات', audit: 'سجل التدقيق',
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
    createTask: 'إسناد مهمة', productionTasks: 'المهام اليومية', taskTitle: 'عنوان المهمة',
    taskType: 'نوع المهمة', assignedWorker: 'العامل المكلف', dueDate: 'تاريخ الاستحقاق (اختياري)',
    optionalBatch: 'دفعة مرتبطة (اختياري)', taskPlanting: 'زراعة', taskWatering: 'سقي',
    taskFertilizing: 'تسميد', taskTreatment: 'معالجة', taskPruning: 'تقليم',
    taskInspection: 'تفقد',     taskOther: 'أخرى', open: 'مفتوحة', taskInProgress: 'قيد التنفيذ', completed: 'مكتملة',
    startTask: 'بدء المهمة', completeTask: 'إنهاء المهمة', taskNote: 'ملاحظة العامل (اختياري)',
    careLog: 'تسجيل عناية', careHistory: 'سجل العناية', careWatering: 'سقي',
    careFertilizing: 'تسميد', careTreatment: 'معالجة', carePruning: 'تقليم',
    careObservation: 'ملاحظة', careOther: 'أخرى', performedAt: 'تاريخ التنفيذ',
    reportPlantLoss: 'تسجيل فاقد', lossHistory: 'سجل الفاقد', lossReason: 'سبب الفاقد',
    advanceStage: 'تقدم إلى المرحلة التالية', noProductionTasks: 'لا توجد مهام إنتاج',
    noCareLogs: 'لا توجد سجلات عناية', noLossReports: 'لا توجد بلاغات فاقد',
    productionStageSowing: 'بذر', productionStageGermination: 'إنبات',
    productionStageGrowing: 'نمو', productionStageReady: 'جاهز للبيع',
    noStockUntilApproved: 'تبقى النباتات خارج المخزون المتاح حتى التحقق والموافقة على الجاهزية.',
    phone: 'الهاتف', supplierType: 'التخصص', purchaseOrders: 'طلبات الشراء', newOrder: 'طلب شراء',
    manageSuppliers: 'إدارة الموردين', addSupplier: 'إضافة مورد', supplierQuotes: 'عروض الأسعار',
    recordQuote: 'تسجيل عرض سعر', quoteReference: 'مرجع العرض', quoteDate: 'تاريخ العرض',
    validUntil: 'صالح حتى', selectQuote: 'اختر عرضاً (اختياري)', useProductPrice: 'سعر المنتج الحالي',
    supplierInvoices: 'فواتير الموردين', recordInvoice: 'تسجيل فاتورة مورد', invoiceReference: 'مرجع الفاتورة',
    invoiceDate: 'تاريخ الفاتورة', reviewInvoice: 'مراجعة الفاتورة', recorded: 'مسجلة', reviewed: 'تمت المراجعة',
    supplierReturns: 'طلبات إرجاع المورد', requestSupplierReturn: 'طلب إرجاع للمورد',
    supplierReference: 'مرجع المورد', supplierReturnRequested: 'تم إرسال طلب الإرجاع للموافقة',
    supplierCreated: 'تمت إضافة المورد', supplierUpdated: 'تم تحديث بيانات المورد',
    supplierArchived: 'تمت أرشفة المورد', quoteRecorded: 'تم تسجيل عرض السعر',
    invoiceRecorded: 'تم تسجيل مرجع الفاتورة', invoiceReviewed: 'تمت مراجعة الفاتورة',
    confirmArchiveSupplier: 'هل تريد أرشفة هذا المورد؟',
    archive: 'أرشفة',
    accountingNotice: 'ملخص تشغيلي غير رسمي. لم يتم تطبيق الأداء على القيمة المضافة، ولا تُعرض الأرباح قبل اعتماد محاسبة تكلفة المخزون.',
    recordExpense: 'تسجيل مصروف', expenseCategory: 'فئة المصروف', expenseDescription: 'وصف المصروف', moneyAmount: 'المبلغ',
    incurredAt: 'تاريخ المصروف', approveExpense: 'اعتماد المصروف', rejectExpense: 'رفض المصروف',
    supplierBalance: 'الرصيد المتبقي', invoiceAmount: 'مبلغ الفاتورة', payInvoice: 'تسجيل دفعة للمورد',
    payExpense: 'تسجيل دفعة للمصروف', paymentMethod: 'طريقة الدفع', bankTransfer: 'تحويل بنكي',
    cheque: 'شيك', paymentReference: 'مرجع التحويل أو الشيك', vatRates: 'نسب الأداء',
    addVatRate: 'إضافة نسبة أداء', vatName: 'اسم الأداء', vatPercentage: 'النسبة %', effectiveFrom: 'تاريخ السريان',
    effectiveTo: 'سارية إلى', vatNotApplied: 'إعداد فقط؛ لن تُحتسب الضريبة حتى تأكيد النسب وقاعدة الأسعار.',
    cashReview: 'مراجعة الصندوق', reviewCashSession: 'مراجعة الجلسة', approveVariance: 'اعتماد الفرق',
    cashIn: 'مقبوضات نقدية', cashOut: 'مدفوعات نقدية', cashNet: 'صافي حركة الصندوق',
    customerCollections: 'مقبوضات العملاء', approvedExpenses: 'المصاريف المعتمدة',
    expensePayable: 'مستحقات المصاريف', supplierPayable: 'مستحقات الموردين', cashVarianceTotal: 'إجمالي فروقات الصندوق',
    cashSessionsPendingReview: 'جلسات بانتظار المراجعة',
    cashVariancePending: 'فروقات بانتظار الاعتماد', invoiceBalanceUnknown: 'فواتير قديمة بلا مبالغ',
    noReturnStockPosting: 'الموافقة توثق الطلب فقط ولا تغيّر المخزون.',
    lowStockPurchases: 'منتجات تحتاج إلى مراجعة للشراء',
    exportPurchasing: 'تصدير تقرير المشتريات',
    order: 'الطلب', lines: 'الأصناف', total: 'الإجمالي', payment: 'الدفع',
    paid: 'مدفوع', credit: 'آجل', customer: 'العميل', customerType: 'نوع العميل',
    individual: 'فرد', landscaper: 'بستاني', municipality: 'بلدية',
    createSale: 'تأكيد البيع', addLine: 'إضافة صنف', alertsTitle: 'التنبيهات النشطة',
    purchaseShortcut: 'إنشاء طلب شراء', inventoryReport: 'تقييم المخزون',
    lossReport: 'الخسائر حسب السبب', bestSellers: 'الأكثر مبيعاً حسب الموسم',
    customerSales: 'المبيعات حسب العميل', exportExcel: 'تصدير Excel', exportPdf: 'تصدير PDF',
    permission: 'الصلاحية', role: 'الدور', admin: 'مدير / المالك', storekeeper: 'أمين المخزن',
    seller: 'بائع', purchasingRole: 'مسؤول المشتريات', nurseryWorker: 'عامل المشتل',
    accountant: 'محاسب', viewer: 'مشاهد', save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق',
    edit: 'تعديل', delete: 'حذف', noResults: 'لا توجد نتائج مطابقة', quantityAvailable: 'المتاح',
    all: 'الكل', ready: 'جاهز للبيع', inProgress: 'قيد الإنتاج', draft: 'مسودة',
    sent: 'مرسل', received: 'مستلم', partiallyReceived: 'مستلم جزئياً', receive: 'استلام', send: 'إرسال', newPurchase: 'طلب شراء جديد',
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
    paidAmount: 'المبلغ المدفوع', remaining: 'المتبقي', collectPayment: 'تسجيل دفعة',
    paymentAmount: 'مبلغ الدفعة', paymentNote: 'ملاحظة (اختياري)', recordPayment: 'تأكيد استلام الدفعة',
    paymentHistory: 'سجل الدفعات',
    cashSession: 'جلسة الصندوق', openCashSession: 'فتح الصندوق', closeCashSession: 'إغلاق الصندوق',
    openingFloat: 'الرصيد الافتتاحي', closingCash: 'النقد الفعلي عند الإغلاق', expectedCash: 'النقد المتوقع',
    variance: 'الفرق', activeSession: 'جلسة مفتوحة', noCashSession: 'افتح جلسة صندوق قبل البيع النقدي',
    approveCredit: 'اعتماد البيع الآجل', rejectCredit: 'رفض البيع الآجل', pendingCredit: 'بانتظار اعتماد المدير',
    requestReturn: 'طلب إرجاع', returnReason: 'سبب الإرجاع', returnRequests: 'طلبات الإرجاع',
    verifyReturn: 'تأكيد استلام الإرجاع', restockQuantity: 'الكمية الصالحة لإعادة التخزين',
    receipt: 'وصل بيع', invoice: 'فاتورة', taxFreeNote: 'الضريبة غير مهيأة؛ الإجمالي دون ضريبة',
    cash: 'نقداً', sessionRequired: 'يلزم فتح جلسة صندوق', returnCompleted: 'تم التحقق من الإرجاع',
    reportFrom: 'من تاريخ', reportTo: 'إلى تاريخ', exportCsv: 'تنزيل Excel (CSV)',
    reportSales: 'إجمالي المبيعات', reportCount: 'عدد المبيعات', reportStock: 'قيمة المخزون',
    reportLoss: 'وحدات الفاقد', reportCredit: 'الرصيد الآجل المفتوح', reportInventory: 'المخزون الحالي',
    reportLoading: 'جارٍ إعداد التقرير...', reportError: 'تعذر تحميل بيانات التقرير',
    userName: 'الاسم', userEmail: 'البريد الإلكتروني', initialPassword: 'كلمة مرور أولية (12 حرفاً على الأقل)',
    createUser: 'إضافة مستخدم', updateUser: 'تحديث المستخدم', resetPassword: 'إعادة تعيين كلمة المرور',
    resetPasswordFor: 'تعيين كلمة مرور جديدة', activeUser: 'نشط', inactiveUser: 'موقوف',
    createdAt: 'تاريخ الإنشاء', userActions: 'إجراءات المستخدم', passwordResetHint: 'عيّن كلمة مرور مؤقتة وشاركها مع المستخدم بأمان.',
    createOrder: 'إنشاء الطلب', print: 'طباعة', done: 'تم', confirmDelete: 'هل أنت متأكد من حذف هذا المنتج؟',
    highLoss: 'معدل فاقد مرتفع', readySoon: 'دفعات جاهزة قريباً',
    logout: 'تسجيل الخروج', loading: 'جارٍ تحميل بيانات المشتل...', batchProduct: 'صنف الشتلات الجاهزة',
    manageCategories: 'إدارة الفئات', addCategory: 'إضافة فئة', editCategory: 'تعديل الفئة',
    categoryInUse: 'لا يمكن حذف فئة تحتوي على منتجات. انقل المنتجات إلى فئة أخرى أولاً.',
    categorySaved: 'تم حفظ الفئة', categoryDeleted: 'تم حذف الفئة',
    pendingApproval: 'بانتظار الموافقة', approved: 'تمت الموافقة', rejected: 'مرفوض',
    pending: 'قيد الانتظار', verified: 'تم التحقق',
    approve: 'موافقة', reject: 'رفض', submitReadyProposal: 'اقتراح جاهزية',
    readyProposalQuantity: 'الكمية الجاهزة المقترحة', verify: 'تحقق', reviewReason: 'سبب الرفض',
    requestAdjustment: 'طلب تسوية مخزون', adjustmentRequests: 'طلبات تسوية المخزون',
    internalIssue: 'صرف للاستخدام الداخلي', stockCount: 'جرد فعلي', stockCountHistory: 'سجل الجرد',
    systemQuantity: 'الكمية في النظام', countedQuantity: 'الكمية الفعلية', receivedQuantity: 'الكمية المستلمة',
    damagedQuantity: 'الكمية التالفة', receiptNote: 'ملاحظة الاستلام', exportMovements: 'تصدير الحركات',
    countApprovalHint: 'سيحسب النظام الرصيد الحالي للموقع عند الحفظ. أي فرق يحتاج موافقة المدير قبل تحديث المخزون.',
    auditHistory: 'سجل الإجراءات الحساسة', actor: 'المستخدم', event: 'الإجراء',
    entity: 'السجل', details: 'التفاصيل', noAuditEvents: 'لا توجد إجراءات مسجلة',
  },
  fr: {
    dashboard: 'Tableau de bord', accounting: 'Comptabilité', expenses: 'Dépenses', products: 'Produits', movements: 'Mouvements',
    production: 'Production', purchasing: 'Fournisseurs & achats', sales: 'Clients & ventes', returns: 'Demandes de retour',
    alerts: 'Alertes', reports: 'Rapports', users: 'Utilisateurs & rôles', audit: 'Journal d’audit',
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
    createTask: 'Assigner une tâche', productionTasks: 'Tâches quotidiennes', taskTitle: 'Titre de la tâche',
    taskType: 'Type de tâche', assignedWorker: 'Ouvrier assigné', dueDate: "Échéance (facultative)",
    optionalBatch: 'Lot associé (facultatif)', taskPlanting: 'Plantation', taskWatering: 'Arrosage',
    taskFertilizing: 'Fertilisation', taskTreatment: 'Traitement', taskPruning: 'Taille',
    taskInspection: 'Inspection', taskOther: 'Autre', open: 'Ouverte', taskInProgress: 'En cours', completed: 'Terminée',
    startTask: 'Commencer', completeTask: 'Terminer', taskNote: 'Note de l’ouvrier (facultative)',
    careLog: 'Enregistrer un soin', careHistory: 'Historique des soins', careWatering: 'Arrosage',
    careFertilizing: 'Fertilisation', careTreatment: 'Traitement', carePruning: 'Taille',
    careObservation: 'Observation', careOther: 'Autre', performedAt: 'Date d’exécution',
    reportPlantLoss: 'Signaler une perte', lossHistory: 'Historique des pertes', lossReason: 'Motif de la perte',
    advanceStage: 'Passer à l’étape suivante', noProductionTasks: 'Aucune tâche de production',
    noCareLogs: 'Aucun soin enregistré', noLossReports: 'Aucune perte signalée',
    productionStageSowing: 'Semis', productionStageGermination: 'Germination',
    productionStageGrowing: 'Croissance', productionStageReady: 'Prêt à vendre',
    noStockUntilApproved: 'Les plants restent hors du stock disponible jusqu’à la vérification et l’approbation.',
    phone: 'Téléphone', supplierType: 'Spécialité', purchaseOrders: 'Commandes', newOrder: 'Nouvelle commande',
    manageSuppliers: 'Gérer les fournisseurs', addSupplier: 'Ajouter un fournisseur', supplierQuotes: 'Devis fournisseurs',
    recordQuote: 'Enregistrer un devis', quoteReference: 'Référence du devis', quoteDate: 'Date du devis',
    validUntil: "Valable jusqu'au", selectQuote: 'Choisir un devis (facultatif)', useProductPrice: "Prix d'achat actuel",
    supplierInvoices: 'Factures fournisseurs', recordInvoice: 'Enregistrer une facture', invoiceReference: 'Référence de facture',
    invoiceDate: 'Date de facture', reviewInvoice: 'Vérifier la facture', recorded: 'Enregistrée', reviewed: 'Vérifiée',
    supplierReturns: 'Demandes de retour fournisseur', requestSupplierReturn: 'Demander un retour fournisseur',
    supplierReference: 'Référence fournisseur', supplierReturnRequested: 'Demande de retour envoyée pour approbation',
    supplierCreated: 'Fournisseur ajouté', supplierUpdated: 'Fournisseur modifié',
    supplierArchived: 'Fournisseur archivé', quoteRecorded: 'Devis enregistré',
    invoiceRecorded: 'Référence de facture enregistrée', invoiceReviewed: 'Facture vérifiée',
    confirmArchiveSupplier: 'Archiver ce fournisseur ?',
    archive: 'Archiver',
    accountingNotice: 'Synthèse opérationnelle non statutaire. TVA non appliquée et aucun bénéfice affiché avant la mise en place du coût de stock.',
    recordExpense: 'Enregistrer une dépense', expenseCategory: 'Catégorie', expenseDescription: 'Description', moneyAmount: 'Montant',
    incurredAt: 'Date de dépense', approveExpense: 'Approuver la dépense', rejectExpense: 'Refuser la dépense',
    supplierBalance: 'Solde restant', invoiceAmount: 'Montant de la facture', payInvoice: 'Enregistrer un paiement fournisseur',
    payExpense: 'Enregistrer le paiement', paymentMethod: 'Mode de paiement', bankTransfer: 'Virement bancaire',
    cheque: 'Chèque', paymentReference: 'Référence du virement ou chèque', vatRates: 'Taux de TVA',
    addVatRate: 'Ajouter un taux', vatName: 'Nom de la taxe', vatPercentage: 'Taux %', effectiveFrom: 'Date de début',
    effectiveTo: 'Valable jusqu’au', vatNotApplied: 'Configuration uniquement ; la TVA reste inactive jusqu’à validation des taux et de la base de prix.',
    cashReview: 'Revue de caisse', reviewCashSession: 'Examiner la session', approveVariance: 'Approuver l’écart',
    cashIn: 'Entrées espèces', cashOut: 'Sorties espèces', cashNet: 'Flux net de caisse',
    customerCollections: 'Encaissements clients', approvedExpenses: 'Dépenses approuvées',
    expensePayable: 'Dépenses à payer', supplierPayable: 'Dettes fournisseurs', cashVarianceTotal: 'Écart total de caisse',
    cashSessionsPendingReview: 'Sessions à examiner',
    cashVariancePending: 'Écarts à approuver', invoiceBalanceUnknown: 'Anciennes factures sans montant',
    noReturnStockPosting: 'L’approbation enregistre la demande sans modifier le stock.',
    lowStockPurchases: 'Produits à examiner pour achat',
    exportPurchasing: 'Exporter le rapport des achats',
    order: 'Commande', lines: 'Articles', total: 'Total', payment: 'Paiement',
    paid: 'Payé', credit: 'Crédit', customer: 'Client', customerType: 'Type de client',
    individual: 'Particulier', landscaper: 'Paysagiste', municipality: 'Municipalité',
    createSale: 'Confirmer la vente', addLine: 'Ajouter un article', alertsTitle: 'Alertes actives',
    purchaseShortcut: 'Créer une commande', inventoryReport: 'Valorisation du stock',
    lossReport: 'Pertes par motif', bestSellers: 'Meilleures ventes saisonnières',
    customerSales: 'Ventes par client', exportExcel: 'Exporter Excel', exportPdf: 'Exporter PDF',
    permission: 'Permission', role: 'Rôle', admin: 'Admin / propriétaire', storekeeper: 'Magasinier',
    seller: 'Vendeur', purchasingRole: 'Responsable achats', nurseryWorker: 'Ouvrier pépinière',
    accountant: 'Comptable', viewer: 'Consultation', save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer',
    edit: 'Modifier', delete: 'Supprimer', noResults: 'Aucun résultat', quantityAvailable: 'Disponible',
    all: 'Tout', ready: 'Prêt à vendre', inProgress: 'En production', draft: 'Brouillon',
    sent: 'Envoyée', received: 'Reçue', partiallyReceived: 'Reçue partiellement', receive: 'Réceptionner', send: 'Envoyer', newPurchase: 'Nouvelle commande',
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
    paidAmount: 'Montant payé', remaining: 'Solde restant', collectPayment: 'Enregistrer un paiement',
    paymentAmount: 'Montant du paiement', paymentNote: 'Note (facultative)', recordPayment: 'Confirmer le paiement',
    paymentHistory: 'Historique des paiements',
    cashSession: 'Session de caisse', openCashSession: 'Ouvrir la caisse', closeCashSession: 'Clôturer la caisse',
    openingFloat: 'Fonds initial', closingCash: 'Espèces comptées à la clôture', expectedCash: 'Espèces attendues',
    variance: 'Écart', activeSession: 'Session ouverte', noCashSession: 'Ouvrez une session avant une vente en espèces',
    approveCredit: 'Approuver la vente à crédit', rejectCredit: 'Refuser le crédit', pendingCredit: 'En attente d’approbation',
    requestReturn: 'Demander un retour', returnReason: 'Motif du retour', returnRequests: 'Demandes de retour',
    verifyReturn: 'Vérifier le retour', restockQuantity: 'Quantité remise en stock',
    receipt: 'Reçu de vente', invoice: 'Facture', taxFreeNote: 'Taxe non configurée ; total hors taxe',
    cash: 'Espèces', sessionRequired: 'Session de caisse requise', returnCompleted: 'Retour vérifié',
    reportFrom: 'Du', reportTo: 'Au', exportCsv: 'Télécharger Excel (CSV)',
    reportSales: 'Ventes totales', reportCount: 'Nombre de ventes', reportStock: 'Valeur du stock',
    reportLoss: 'Unités perdues', reportCredit: 'Crédit restant', reportInventory: 'Stock actuel',
    reportLoading: 'Préparation du rapport...', reportError: 'Impossible de charger le rapport',
    userName: 'Nom', userEmail: 'Adresse e-mail', initialPassword: 'Mot de passe initial (12 caractères minimum)',
    createUser: 'Ajouter un utilisateur', updateUser: "Modifier l'utilisateur", resetPassword: 'Réinitialiser le mot de passe',
    resetPasswordFor: 'Définir un nouveau mot de passe', activeUser: 'Actif', inactiveUser: 'Désactivé',
    createdAt: 'Créé le', userActions: 'Actions', passwordResetHint: 'Définissez un mot de passe temporaire et communiquez-le de manière sécurisée.',
    createOrder: 'Créer commande', print: 'Imprimer', done: 'Terminé', confirmDelete: 'Supprimer ce produit ?',
    highLoss: 'Taux de perte élevé', readySoon: 'Lots bientôt prêts',
    logout: 'Déconnexion', loading: 'Chargement des données...', batchProduct: 'Produit à stocker',
    manageCategories: 'Gérer les catégories', addCategory: 'Ajouter une catégorie',
    editCategory: 'Modifier la catégorie',
    categoryInUse: 'Impossible de supprimer une catégorie contenant des produits. Réaffectez-les d’abord.',
    categorySaved: 'Catégorie enregistrée', categoryDeleted: 'Catégorie supprimée',
    pendingApproval: 'En attente d’approbation', approved: 'Approuvée', rejected: 'Refusée',
    pending: 'En attente', verified: 'Vérifiée',
    approve: 'Approuver', reject: 'Refuser', submitReadyProposal: 'Proposer la disponibilité',
    readyProposalQuantity: 'Quantité proposée', verify: 'Vérifier', reviewReason: 'Motif du refus',
    requestAdjustment: 'Demander un ajustement', adjustmentRequests: 'Demandes d’ajustement',
    internalIssue: 'Sortie pour usage interne', stockCount: 'Inventaire physique', stockCountHistory: 'Historique des inventaires',
    systemQuantity: 'Quantité système', countedQuantity: 'Quantité comptée', receivedQuantity: 'Quantité reçue',
    damagedQuantity: 'Quantité endommagée', receiptNote: 'Note de réception', exportMovements: 'Exporter les mouvements',
    countApprovalHint: 'Le solde actuel de cet emplacement sera calculé à l’enregistrement. Tout écart doit être approuvé par le gérant avant la mise à jour.',
    auditHistory: 'Historique des actions sensibles', actor: 'Utilisateur', event: 'Action',
    entity: 'Enregistrement', details: 'Détails', noAuditEvents: 'Aucune action enregistrée',
  },
};

const navGroups = [
  { title: 'overview', items: [['dashboard', LayoutDashboard]] },
  { title: 'inventory', items: [['products', Package], ['movements', ArrowLeftRight], ['production', Flower2]] },
  { title: 'operations', items: [['purchasing', ShoppingCart], ['sales', Users], ['returns', ArrowDownLeft], ['alerts', Bell]] },
  { title: 'settings', items: [['accounting', Wallet], ['reports', Activity], ['users', ShieldCheck], ['audit', ClipboardList]] },
];
const rolePages = {
  ADMIN: ['dashboard', 'products', 'movements', 'production', 'purchasing', 'sales', 'returns', 'alerts', 'accounting', 'reports', 'users', 'audit'],
  STOREKEEPER: ['dashboard', 'products', 'movements', 'production', 'purchasing', 'returns', 'alerts'],
  SELLER: ['dashboard', 'products', 'sales', 'returns'],
  PURCHASING: ['dashboard', 'products', 'purchasing', 'alerts'],
  NURSERY_WORKER: ['dashboard', 'products', 'production'],
  ACCOUNTANT: ['dashboard', 'products', 'movements', 'production', 'purchasing', 'sales', 'accounting', 'reports'],
  VIEWER: ['dashboard', 'products', 'movements'],
};
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
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [productionTasks, setProductionTasks] = useState([]);
  const [productionWorkers, setProductionWorkers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierQuotes, setSupplierQuotes] = useState([]);
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [supplierReturns, setSupplierReturns] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vatRates, setVatRates] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [cashSessions, setCashSessions] = useState([]);
  const [printDocument, setPrintDocument] = useState(null);
  const [users, setUsers] = useState([]);
  const [adjustmentRequests, setAdjustmentRequests] = useState([]);
  const [stockCounts, setStockCounts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditError, setAuditError] = useState('');
  const [paymentHistoryFor, setPaymentHistoryFor] = useState(null);
  const [usersError, setUsersError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportError, setReportError] = useState('');
  const [reportFrom, setReportFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));
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
  const categoryLabel = (nameAr) => {
    const category = categories.find((item) => item.nameAr === nameAr);
    return language === 'fr' ? category?.nameFr || frenchCategoryLabels[nameAr] || nameAr : nameAr;
  };
  const hasRole = (...roles) => roles.includes(user?.role);
  const isRtl = language === 'ar';

  const refreshWorkspace = async (token = getAccessToken(), role = user?.role) => {
    if (!role || !rolePages[role]) throw new Error('Your account role is not recognized. Ask an administrator to review it.');
    const canRead = (...roles) => roles.includes(role);
    const [productsData, movementsData, batchesData, ordersData, customersData, suppliersData, salesData, categoriesData, adjustmentData, stockCountsData, cashSessionsData, salesReturnsData, supplierQuotesData, supplierInvoicesData, supplierReturnsData, productionTasksData, productionWorkersData, expensesData, vatRatesData] = await Promise.all([
      apiRequest('/products', { token }),
      canRead('ADMIN', 'STOREKEEPER', 'ACCOUNTANT', 'VIEWER') ? apiRequest('/movements', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'STOREKEEPER', 'NURSERY_WORKER', 'ACCOUNTANT') ? apiRequest('/production/batches', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'STOREKEEPER', 'PURCHASING', 'ACCOUNTANT') ? apiRequest('/purchase-orders', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'SELLER', 'ACCOUNTANT') ? apiRequest('/customers', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'STOREKEEPER', 'PURCHASING', 'ACCOUNTANT') ? apiRequest('/suppliers', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'SELLER', 'ACCOUNTANT') ? apiRequest('/sales', { token }) : Promise.resolve([]),
      apiRequest('/categories', { token }),
      canRead('ADMIN', 'STOREKEEPER') ? apiRequest('/adjustment-requests', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'STOREKEEPER') ? apiRequest('/stock-counts', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'SELLER', 'ACCOUNTANT') ? apiRequest('/cash-sessions', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'STOREKEEPER', 'SELLER') ? apiRequest('/sales/returns', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'PURCHASING', 'ACCOUNTANT') ? apiRequest('/supplier-quotes', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'PURCHASING', 'ACCOUNTANT') ? apiRequest('/supplier-invoices', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'STOREKEEPER', 'PURCHASING', 'ACCOUNTANT') ? apiRequest('/supplier-returns', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'STOREKEEPER', 'NURSERY_WORKER', 'ACCOUNTANT') ? apiRequest('/production/tasks', { token }) : Promise.resolve([]),
      canRead('ADMIN') ? apiRequest('/production/workers', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'ACCOUNTANT') ? apiRequest('/expenses', { token }) : Promise.resolve([]),
      canRead('ADMIN', 'ACCOUNTANT') ? apiRequest('/vat-rates', { token }) : Promise.resolve({ rates: [] }),
    ]);
    const data = normalizeWorkspace({
      products: productsData, movements: movementsData, batches: batchesData,
      orders: ordersData, customers: customersData, suppliers: suppliersData, sales: salesData,
      supplierQuotes: supplierQuotesData, supplierInvoices: supplierInvoicesData, supplierReturns: supplierReturnsData,
    });
    setProducts(data.products);
    setCategories(categoriesData);
    setMovements(data.movements);
    setBatches(data.batches);
    setProductionTasks(productionTasksData);
    setProductionWorkers(productionWorkersData);
    setOrders(data.orders);
    setCustomers(data.customers);
    setSuppliers(data.suppliers);
    setSupplierQuotes(data.supplierQuotes);
    setSupplierInvoices(data.supplierInvoices);
    setSupplierReturns(data.supplierReturns);
    setExpenses(expensesData);
    setVatRates(vatRatesData.rates || []);
    setSales(data.sales);
    setAdjustmentRequests(adjustmentData);
    setStockCounts(stockCountsData);
    setCashSessions(cashSessionsData);
    setSalesReturns(salesReturnsData);
  };

  useEffect(() => {
    const expireSession = () => {
      clearAccessToken();
      setUser(null);
      setProducts([]);
      setCategories([]);
      setMovements([]);
      setBatches([]);
      setProductionTasks([]);
      setProductionWorkers([]);
      setSuppliers([]);
      setSupplierQuotes([]);
      setSupplierInvoices([]);
      setSupplierReturns([]);
      setExpenses([]);
      setVatRates([]);
      setDataError('انتهت صلاحية الجلسة. سجّل الدخول مجدداً.');
    };
    window.addEventListener('mashtal:auth-expired', expireSession);
    const token = getAccessToken();
    if (!token) {
      setAppLoading(false);
      return () => window.removeEventListener('mashtal:auth-expired', expireSession);
    }
    let active = true;
    apiRequest('/auth/me', { token })
      .then(async (profile) => {
        await refreshWorkspace(token, profile.role);
        if (active) setUser(profile);
      })
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

  useEffect(() => {
    if (activePage !== 'reports' || !user) return undefined;
    let active = true;
    setReportError('');
    apiRequest(`/reports?from=${encodeURIComponent(reportFrom)}&to=${encodeURIComponent(reportTo)}`)
      .then((report) => { if (active) setReportData(report); })
      .catch((error) => { if (active) setReportError(error.message); });
    return () => { active = false; };
  }, [activePage, reportFrom, reportTo, user]);

  useEffect(() => {
    if (activePage !== 'users' || user?.role !== 'ADMIN') return undefined;
    let active = true;
    setUsersError('');
    apiRequest('/users')
      .then((data) => { if (active) setUsers(data); })
      .catch((error) => { if (active) setUsersError(error.message); });
    return () => { active = false; };
  }, [activePage, user]);

  useEffect(() => {
    if (activePage !== 'audit' || user?.role !== 'ADMIN') return undefined;
    let active = true;
    setAuditError('');
    apiRequest('/audit-logs?limit=200')
      .then((data) => { if (active) setAuditLogs(data); })
      .catch((error) => { if (active) setAuditError(error.message); });
    return () => { active = false; };
  }, [activePage, user]);

  const handleLogin = async (email, password) => {
    const profile = await login(email, password);
    setDataLoading(true);
    try {
      await refreshWorkspace(getAccessToken(), profile.role);
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
      setCategories([]);
      setMovements([]);
      setBatches([]);
      setCustomers([]);
      setSuppliers([]);
      setSupplierQuotes([]);
      setSupplierInvoices([]);
      setSupplierReturns([]);
      setOrders([]);
      setSales([]);
      setUsers([]);
      setAdjustmentRequests([]);
      setStockCounts([]);
      setAuditLogs([]);
      setReportData(null);
      setActivePage('dashboard');
    }
  };

  const quantities = useMemo(() => movements.reduce((totals, movement) => {
    const sign = movement.type.endsWith('IN') ? 1 : movement.type.endsWith('OUT') ? -1 : 0;
    totals[movement.productId] = (totals[movement.productId] || 0) + movement.quantity * sign;
    return totals;
  }, {}), [movements]);
  const productById = (id) => products.find((p) => p.id === id);
  const getQty = (productId) => Math.max(0, quantities[productId] ?? productById(productId)?.quantity ?? 0);
  const lowProducts = products.filter((p) => getQty(p.id) <= p.minimum).sort((a, b) => getQty(a.id) - getQty(b.id));
  const stockValue = products.reduce((sum, p) => sum + getQty(p.id) * p.purchasePrice, 0);
  const monthlyLoss = movements.filter((m) => m.type === 'Loss OUT' && m.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((sum, m) => sum + m.quantity, 0);
  const navigate = (page) => {
    if (!rolePages[user?.role]?.includes(page)) return;
    setActivePage(page);
    setMobileNav(false);
    setQuery('');
  };
  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2800); };
  const saveUser = async (data) => {
    try {
      await apiRequest(data.id ? `/users/${data.id}` : '/users', {
        method: data.id ? 'PATCH' : 'POST',
        body: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.email !== undefined && { email: data.email.trim() }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.active !== undefined && { active: data.active }),
          ...(data.password && { password: data.password }),
        },
      });
      setUsers(await apiRequest('/users'));
      setModal(null);
      notify(data.id ? t('updateUser') : t('createUser'));
    } catch (error) {
      notify(error.message);
    }
  };
  const resetUserPassword = async (data) => {
    try {
      await apiRequest(`/users/${data.id}/password`, {
        method: 'POST',
        body: { password: data.password },
      });
      setModal(null);
      if (data.id === user.id) {
        await handleLogout();
      } else {
        notify(t('resetPassword'));
      }
    } catch (error) {
      notify(error.message);
    }
  };
  const submitSalePayment = async (data) => {
    try {
      await apiRequest(`/customers/${data.customer.id}/payments`, {
        method: 'POST',
        body: {
          amount: Number(data.amount),
          method: data.method,
          reference: data.reference || undefined,
          note: data.note || undefined,
          cashSessionId: data.method === 'CASH' ? data.cashSessionId || undefined : undefined,
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('recordPayment'));
    } catch (error) {
      notify(error.message);
    }
  };

  const openCashSession = async ({ openingFloat }) => {
    try {
      await apiRequest('/cash-sessions', { method: 'POST', body: { openingFloat: Number(openingFloat) } });
      await refreshWorkspace();
      setModal(null);
      notify(t('openCashSession'));
    } catch (error) {
      notify(error.message);
    }
  };
  const closeCashSession = async ({ session, closingCash }) => {
    try {
      await apiRequest(`/cash-sessions/${session.id}/close`, {
        method: 'PATCH',
        body: { closingCash: Number(closingCash) },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('closeCashSession'));
    } catch (error) {
      notify(error.message);
    }
  };
  const approveCreditSale = async (sale) => {
    try {
      await apiRequest(`/sales/${sale.recordId}/approve`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('approved'));
    } catch (error) {
      notify(error.message);
    }
  };
  const rejectCreditSale = async ({ item, reason }) => {
    try {
      await apiRequest(`/sales/${item.recordId}/reject`, { method: 'PATCH', body: { reason } });
      await refreshWorkspace();
      setModal(null);
      notify(t('rejected'));
    } catch (error) {
      notify(error.message);
    }
  };
  const requestSaleReturn = async (data) => {
    try {
      await apiRequest(`/sales/${data.sale.recordId}/returns`, {
        method: 'POST',
        body: {
          reason: data.reason,
          lines: data.lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('requestReturn'));
    } catch (error) {
      notify(error.message);
    }
  };
  const approveSalesReturn = async (item) => {
    try {
      await apiRequest(`/sales/returns/${item.id}/approve`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('approved'));
    } catch (error) {
      notify(error.message);
    }
  };
  const rejectSalesReturn = async ({ item, reason }) => {
    try {
      await apiRequest(`/sales/returns/${item.id}/reject`, { method: 'PATCH', body: { reason } });
      await refreshWorkspace();
      setModal(null);
      notify(t('rejected'));
    } catch (error) {
      notify(error.message);
    }
  };
  const verifySalesReturn = async (data) => {
    try {
      await apiRequest(`/sales/returns/${data.item.id}/verify`, {
        method: 'PATCH',
        body: { lines: data.lines },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('returnCompleted'));
    } catch (error) {
      notify(error.message);
    }
  };

  const addMovement = async (data) => {
    const typeMap = {
      'Loss OUT': 'LOSS_OUT',
      'Internal issue OUT': 'INTERNAL_ISSUE_OUT',
      Transfer: 'TRANSFER',
    };
    const isOut = data.type.endsWith('OUT');
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
  const saveCategory = async (data) => {
    const id = data.id;
    await apiRequest(id ? `/categories/${id}` : '/categories', {
      method: id ? 'PATCH' : 'POST',
      body: { nameAr: data.nameAr.trim(), nameFr: data.nameFr.trim() },
    });
    await refreshWorkspace();
    notify(t('categorySaved'));
  };
  const deleteCategory = async (category) => {
    await apiRequest(`/categories/${category.id}`, { method: 'DELETE' });
    await refreshWorkspace();
    notify(t('categoryDeleted'));
  };
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

  const proposeBatchReady = async ({ batch, quantity }) => {
    try {
      await apiRequest(`/production/batches/${batch.id}/ready-proposal`, {
        method: 'POST',
        body: { quantity: Number(quantity) },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('submitReadyProposal'));
    } catch (error) {
      notify(error.message);
    }
  };

  const createProductionTask = async (input) => {
    try {
      await apiRequest('/production/tasks', {
        method: 'POST',
        body: {
          title: input.title.trim(),
          type: input.type,
          assignedToId: input.assignedToId,
          ...(input.batchId && { batchId: input.batchId }),
          ...(input.dueAt && { dueAt: new Date(`${input.dueAt}T12:00:00`).toISOString() }),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('createTask'));
    } catch (error) {
      notify(error.message);
    }
  };

  const updateProductionTask = async ({ task, status, workerNote }) => {
    try {
      await apiRequest(`/production/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: { status, workerNote },
      });
      await refreshWorkspace();
      setModal(null);
      notify(status === 'COMPLETED' ? t('completeTask') : t('startTask'));
    } catch (error) {
      notify(error.message);
    }
  };

  const recordProductionCare = async ({ batch, type, performedAt, note }) => {
    try {
      await apiRequest(`/production/batches/${batch.id}/care-logs`, {
        method: 'POST',
        body: {
          type,
          performedAt: new Date(`${performedAt}T12:00:00`).toISOString(),
          ...(note.trim() && { note: note.trim() }),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('careLog'));
    } catch (error) {
      notify(error.message);
    }
  };

  const reportProductionLoss = async ({ batch, quantity, reason, occurredAt }) => {
    try {
      await apiRequest(`/production/batches/${batch.id}/losses`, {
        method: 'POST',
        body: {
          quantity: Number(quantity),
          reason: reason.trim(),
          occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('reportPlantLoss'));
    } catch (error) {
      notify(error.message);
    }
  };

  const advanceProductionStage = async (batch) => {
    const nextStage = { SOWING: 'GERMINATION', GERMINATION: 'GROWING' }[batch.stage.toUpperCase()];
    if (!nextStage) return;
    try {
      await apiRequest(`/production/batches/${batch.id}/stage`, {
        method: 'PATCH',
        body: { stage: nextStage },
      });
      await refreshWorkspace();
      notify(t('advanceStage'));
    } catch (error) {
      notify(error.message);
    }
  };

  const verifyBatchReady = async (batch) => {
    try {
      await apiRequest(`/production/batches/${batch.id}/verify-ready`, { method: 'POST' });
      await refreshWorkspace();
      notify(t('verify'));
    } catch (error) {
      notify(error.message);
    }
  };

  const rejectBatchReady = async ({ item, reason }) => {
    try {
      await apiRequest(`/production/batches/${item.id}/reject-ready`, {
        method: 'POST',
        body: { reason },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('rejected'));
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
      notify(sale.approvalStatus === 'PENDING' ? t('pendingCredit') : `تم تسجيل البيع ${sale.code} بنجاح`);
      setModal(null);
    } catch (error) {
      notify(error.message);
    }
  };

  const receiveOrder = async (order, receipt) => {
    try {
      await apiRequest(`/purchase-orders/${order.id}/receipts`, {
        method: 'POST',
        body: {
          lines: receipt.lines.map((line) => ({
            orderLineId: line.orderLineId,
            receivedQuantity: Number(line.receivedQuantity),
            damagedQuantity: Number(line.damagedQuantity),
          })),
          note: receipt.note,
        },
      });
      await refreshWorkspace();
      setModal(null);
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
  const approveOrder = async (order) => {
    try {
      await apiRequest(`/purchase-orders/${order.id}/approve`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('approved'));
    } catch (error) {
      notify(error.message);
    }
  };
  const rejectOrder = async ({ item, reason }) => {
    try {
      await apiRequest(`/purchase-orders/${item.id}/reject`, { method: 'PATCH', body: { reason } });
      await refreshWorkspace();
      setModal(null);
      notify(t('rejected'));
    } catch (error) {
      notify(error.message);
    }
  };
  const saveSupplier = async (input) => {
    try {
      await apiRequest(input.id ? `/suppliers/${input.id}` : '/suppliers', {
        method: input.id ? 'PATCH' : 'POST',
        body: { name: input.name, city: input.city, type: input.type, phone: input.phone, email: input.email || undefined },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t(input.id ? 'supplierUpdated' : 'supplierCreated'));
    } catch (error) {
      notify(error.message);
    }
  };
  const archiveSupplier = async (supplier) => {
    if (!window.confirm(t('confirmArchiveSupplier'))) return;
    try {
      await apiRequest(`/suppliers/${supplier.id}`, { method: 'DELETE' });
      await refreshWorkspace();
      notify(t('supplierArchived'));
    } catch (error) {
      notify(error.message);
    }
  };
  const createSupplierQuote = async (input) => {
    try {
      await apiRequest('/supplier-quotes', {
        method: 'POST',
        body: {
          ...input,
          quoteDate: input.quoteDate || undefined,
          validUntil: input.validUntil || undefined,
          lines: input.lines.map((line) => ({ ...line, unitPrice: Number(line.unitPrice) })),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('quoteRecorded'));
    } catch (error) {
      notify(error.message);
    }
  };
  const recordSupplierInvoice = async (input) => {
    try {
      await apiRequest('/supplier-invoices', {
        method: 'POST',
        body: { ...input, totalAmount: Number(input.totalAmount), purchaseOrderId: input.purchaseOrderId || undefined, invoiceDate: input.invoiceDate || undefined },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('invoiceRecorded'));
    } catch (error) {
      notify(error.message);
    }
  };
  const reviewSupplierInvoice = async (invoice) => {
    try {
      await apiRequest(`/supplier-invoices/${invoice.id}/review`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('invoiceReviewed'));
    } catch (error) {
      notify(error.message);
    }
  };
  const recordExpense = async (input) => {
    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: { ...input, amount: Number(input.amount) },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('recordExpense'));
    } catch (error) {
      notify(error.message);
    }
  };
  const approveExpense = async (expense) => {
    try {
      await apiRequest(`/expenses/${expense.id}/approve`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('approveExpense'));
    } catch (error) {
      notify(error.message);
    }
  };
  const rejectExpense = async ({ item, reason }) => {
    try {
      await apiRequest(`/expenses/${item.id}/reject`, { method: 'PATCH', body: { note: reason } });
      await refreshWorkspace();
      setModal(null);
      notify(t('rejectExpense'));
    } catch (error) {
      notify(error.message);
    }
  };
  const submitAccountingPayment = async ({ document, documentType, amount, method, reference, cashSessionId }) => {
    const path = documentType === 'expense' ? `/expenses/${document.id}/payments` : `/supplier-invoices/${document.id}/payments`;
    try {
      await apiRequest(path, {
        method: 'POST',
        body: {
          amount: Number(amount),
          method,
          reference: reference || undefined,
          cashSessionId: method === 'CASH' ? cashSessionId : undefined,
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t(documentType === 'expense' ? 'payExpense' : 'payInvoice'));
    } catch (error) {
      notify(error.message);
    }
  };
  const reviewCashSession = async (session) => {
    try {
      await apiRequest(`/cash-sessions/${session.id}/review`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('reviewCashSession'));
    } catch (error) {
      notify(error.message);
    }
  };
  const approveCashVariance = async (session) => {
    try {
      await apiRequest(`/cash-sessions/${session.id}/approve-variance`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('approveVariance'));
    } catch (error) {
      notify(error.message);
    }
  };
  const saveVatRate = async (input) => {
    const { id, ...values } = input;
    try {
      await apiRequest(id ? `/vat-rates/${id}` : '/vat-rates', {
        method: id ? 'PATCH' : 'POST',
        body: {
          ...values,
          percentage: Number(values.percentage),
          effectiveTo: values.effectiveTo || undefined,
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('vatRates'));
    } catch (error) {
      notify(error.message);
    }
  };
  const createSupplierReturn = async (input) => {
    try {
      await apiRequest('/supplier-returns', {
        method: 'POST',
        body: {
          ...input,
          purchaseOrderId: input.purchaseOrderId || undefined,
          supplierReference: input.supplierReference || undefined,
          lines: input.lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('supplierReturnRequested'));
    } catch (error) {
      notify(error.message);
    }
  };
  const approveSupplierReturn = async (item) => {
    try {
      await apiRequest(`/supplier-returns/${item.id}/approve`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('approved'));
    } catch (error) {
      notify(error.message);
    }
  };
  const rejectSupplierReturn = async ({ item, reason }) => {
    try {
      await apiRequest(`/supplier-returns/${item.id}/reject`, { method: 'PATCH', body: { reason } });
      await refreshWorkspace();
      setModal(null);
      notify(t('rejected'));
    } catch (error) {
      notify(error.message);
    }
  };
  const createStockCount = async (input) => {
    try {
      const count = await apiRequest('/stock-counts', {
        method: 'POST',
        body: {
          productId: input.productId,
          countedQuantity: Number(input.countedQuantity),
          reason: input.reason,
          location: input.location,
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(count.adjustmentRequest ? t('requestAdjustment') : t('stockCount'));
    } catch (error) {
      notify(error.message);
    }
  };
  const approveAdjustment = async (request) => {
    try {
      await apiRequest(`/adjustment-requests/${request.id}/approve`, { method: 'PATCH' });
      await refreshWorkspace();
      notify(t('approved'));
    } catch (error) {
      notify(error.message);
    }
  };
  const rejectAdjustment = async ({ item, reason }) => {
    try {
      await apiRequest(`/adjustment-requests/${item.id}/reject`, { method: 'PATCH', body: { reason } });
      await refreshWorkspace();
      setModal(null);
      notify(t('rejected'));
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
          lines: order.lines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
            ...(line.supplierQuoteLineId && { supplierQuoteLineId: line.supplierQuoteLineId }),
          })),
        },
      });
      await refreshWorkspace();
      setModal(null);
      notify(t('pendingApproval'));
    } catch (error) {
      notify(error.message);
    }
  };
  const exportPurchasingReport = () => {
    const rows = [
      ['Type', 'Reference', 'Supplier', 'Status', 'Date', 'Purchase order', 'Details'],
      ...supplierQuotes.flatMap((quote) => quote.lines.map((line) => [
        'Quote', quote.reference, quote.supplier.name, quote.validUntil ? `Valid until ${quote.validUntil.slice(0, 10)}` : 'No expiry',
        quote.quoteDate.slice(0, 10), '', `${line.product.nameAr} · ${Number(line.unitPrice)}`,
      ])),
      ...orders.map((order) => ['Purchase order', order.code, order.supplier, order.status, order.date, '', order.total]),
      ...supplierInvoices.map((invoice) => ['Supplier invoice', invoice.reference, invoice.supplier.name, invoice.status,
        (invoice.invoiceDate || invoice.createdAt).slice(0, 10), invoice.purchaseOrder?.code || '', 'Reference only']),
      ...supplierReturns.map((item) => ['Supplier return', item.supplierReference || item.id, item.supplier.name, item.status,
        item.createdAt.slice(0, 10), item.purchaseOrder?.code || '', item.lines.reduce((sum, line) => sum + line.quantity, 0)]),
    ];
    downloadCsv('purchasing-report.csv', rows);
  };

  const totalTodaySales = sales.filter((sale) => sale.date === new Date().toISOString().slice(0, 10) && sale.approvalStatus === 'APPROVED')
    .reduce((sum, sale) => sum + Math.max(0, sale.total - sale.returnedAmount), 0);
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
      { title: t('totalProducts'), value: products.length, suffix: t('productsUnit'), icon: Package, color: 'bg-green-50 text-forest', change: '+4.8%', positive: true, roles: ['ADMIN', 'STOREKEEPER', 'SELLER', 'PURCHASING', 'NURSERY_WORKER', 'ACCOUNTANT', 'VIEWER'] },
      { title: t('stockValue'), value: currency(stockValue), suffix: '', icon: Wallet, color: 'bg-amber-50 text-amber-700', change: '+2.6%', positive: true, roles: ['ADMIN', 'ACCOUNTANT'] },
      { title: t('lowStock'), value: lowProducts.length, suffix: t('items'), icon: AlertTriangle, color: 'bg-orange-50 text-orange-700', change: 'تحتاج متابعة', positive: false, roles: ['ADMIN', 'STOREKEEPER', 'SELLER', 'PURCHASING', 'VIEWER'] },
      { title: t('monthlyLosses'), value: monthlyLoss, suffix: t('items'), icon: Flower2, color: 'bg-rose-50 text-rose-600', change: 'هذا الشهر', positive: false, roles: ['ADMIN', 'STOREKEEPER'] },
      { title: t('todaySales'), value: currency(totalTodaySales), suffix: '', icon: ShoppingBag, color: 'bg-sky-50 text-sky-700', change: '+12.4%', positive: true, roles: ['ADMIN', 'SELLER', 'ACCOUNTANT'] },
    ].filter((card) => card.roles.includes(user.role));
    const flowData = Array.from({ length: 10 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (9 - i) * 3);
      const key = date.toISOString().slice(0, 10);
      const slice = movements.filter((m) => m.date === key);
      return { day: date.toLocaleDateString(isRtl ? 'ar-TN' : 'fr-TN', { day: 'numeric', month: 'short' }), inbound: slice.filter((m) => m.type.endsWith('IN')).reduce((n, m) => n + m.quantity, 0), outbound: slice.filter((m) => m.type.endsWith('OUT')).reduce((n, m) => n + m.quantity, 0) };
    });
    const catData = categories.map((category) => ({
      name: categoryLabel(category.nameAr), value: products.filter((p) => p.category === category.nameAr).reduce((sum, p) => sum + getQty(p.id) * p.purchasePrice, 0),
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
        {hasRole('ADMIN', 'STOREKEEPER') && <button onClick={() => showMovementModal()} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"><Plus size={17} />{t('newMovement')}</button>}
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card, index) => <div key={card.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}><card.icon size={20} /></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${card.positive ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'}`}>{card.positive && <span className="me-1">↗</span>}{card.change}</span></div>
          <p className="mt-4 text-xs font-semibold text-slate-500">{card.title}</p><p className={`${index === 1 || index === 4 ? 'text-[17px]' : 'text-2xl'} mt-1 font-extrabold text-slate-800 dark:text-white`}>{card.value} <span className="text-xs font-medium text-slate-400">{card.suffix}</span></p>
        </div>)}
      </div>
      <Suspense fallback={<div className="min-h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" aria-busy="true" />}>
        <DashboardCharts
          flowData={flowData}
          catData={catData}
          salesData={salesData}
          colors={colors}
          t={t}
          currency={currency}
          showStockFlow={hasRole('ADMIN', 'STOREKEEPER', 'ACCOUNTANT')}
          showCategoryValue={hasRole('ADMIN', 'ACCOUNTANT')}
          showSalesTrend={hasRole('ADMIN')}
        />
      </Suspense>
      {hasRole('ADMIN', 'STOREKEEPER', 'SELLER', 'PURCHASING', 'VIEWER') && <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('lowStockList')}</h2><button onClick={() => navigate('products')} className="text-xs font-bold text-forest">{t('seeAll')} <ChevronLeft size={13} className="inline" /></button></div>
          <div className="space-y-3">{lowProducts.slice(0, 5).map((product) => <div key={product.id} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-forest"><Leaf size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{firstProductName(product.id)}</p><p className="text-[10px] text-slate-400">{product.location}</p></div><Badge tone={getQty(product.id) === 0 ? 'red' : 'amber'}>{getQty(product.id)} / {product.minimum}</Badge></div>)}
          {!lowProducts.length && <Empty text={t('noResults')} />}</div>
        </section>
      </div>}
      <div className="flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-l from-green-800 to-forest px-5 py-4 text-white shadow-soft"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Sun size={25} /></div><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{t('seasonalTip')} <span className="text-sun">✦</span></p><p className="mt-1 text-xs leading-6 text-green-50/90">{t('tip')}</p></div><Flower2 size={54} className="hidden shrink-0 text-white/20 sm:block" /></div>
    </div>;
  };

  const renderProducts = () => <div className="space-y-5">
    <PageHeading title={t('products')} subtitle={`${products.length} ${t('productsUnit')} · ${t('inStock')} ${products.reduce((sum, p) => sum + getQty(p.id), 0).toLocaleString('fr-TN')}`} action={<div className="flex flex-wrap gap-2">{hasRole('ADMIN') && <button onClick={() => setModal({ type: 'categories' })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><Settings2 size={16} />{t('manageCategories')}</button>}{hasRole('ADMIN') && <button onClick={() => openProductForm()} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('addProduct')}</button>}</div>} />
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 ltr:left-3" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('searchProducts')} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-9 ps-3 text-xs outline-none focus:border-green-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" /></label>
        <select aria-label={t('allCategories')} value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allCategories')}</option>{categories.map((category) => <option key={category.id} value={category.nameAr}>{categoryLabel(category.nameAr)}</option>)}</select>
        <select value={productSize} onChange={(e) => setProductSize(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allSizes')}</option>{[...new Set(products.map((p) => p.size))].map((size) => <option key={size}>{size}</option>)}</select>
        <select value={productStatus} onChange={(e) => setProductStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allStatuses')}</option><option value="available">{t('available')}</option><option value="low">{t('low')}</option><option value="out">{t('out')}</option></select>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-700"><button onClick={() => setProductView('table')} className={`rounded-lg px-3 text-xs font-bold ${productView === 'table' ? 'bg-white text-forest shadow-sm dark:bg-slate-600' : 'text-slate-500'}`}>{t('table')}</button><button onClick={() => setProductView('cards')} className={`rounded-lg px-3 text-xs font-bold ${productView === 'cards' ? 'bg-white text-forest shadow-sm dark:bg-slate-600' : 'text-slate-500'}`}>{t('cards')}</button></div>
      </div>
    </div>
    {productView === 'table' ? <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-right text-xs"><thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-slate-700/70"><tr>{[t('product'), t('category'), t('size'), t('price'), t('quantity'), t('minimum'), t('location'), t('status'), t('actions')].map((name) => <th key={name} className="px-4 py-3.5">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{filteredProducts.map((product) => {
      const qty = getQty(product.id); const tone = qty === 0 ? 'red' : qty <= product.minimum ? 'amber' : 'green';
      return <tr key={product.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-700/30"><td className="px-4 py-3"><div className="flex items-center gap-3"><ProductPhoto product={product} /><div><p className="font-bold text-slate-700 dark:text-slate-100">{firstProductName(product.id)}</p><p className="mt-0.5 text-[10px] text-slate-400" dir="ltr">{product.scientific || product.nameFr}</p></div></div></td><td className="px-4 py-3 text-slate-500">{categoryLabel(product.category)}</td><td className="px-4 py-3 text-slate-500">{product.size}</td><td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{currency(product.salePrice)}</td><td className="px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200">{qty}</td><td className="px-4 py-3 text-slate-500">{product.minimum}</td><td className="px-4 py-3 text-slate-500">{product.location}</td><td className="px-4 py-3"><Badge tone={tone}>{qty === 0 ? t('out') : qty <= product.minimum ? t('low') : t('available')}</Badge></td><td className="px-4 py-3">{hasRole('ADMIN') && <div className="flex gap-1"><IconButton label={t('edit')} onClick={() => openProductForm(product)}><Settings2 size={16} /></IconButton><IconButton label={t('delete')} onClick={() => deleteProduct(product)}><MoreHorizontal size={17} /></IconButton></div>}</td></tr>;
    })}</tbody></table>{!filteredProducts.length && <Empty text={t('noResults')} />}</div><div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-700">{filteredProducts.length} {t('productsUnit')}</div></div> :
      filteredProducts.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} quantity={getQty(product.id)} t={t} isRtl={isRtl} categoryLabel={categoryLabel} canManage={hasRole('ADMIN')} onEdit={() => openProductForm(product)} onDelete={() => deleteProduct(product)} />)}</div> : <Empty text={t('noResults')} />}
  </div>;

  const renderMovements = () => <div className="space-y-5">
    <PageHeading title={t('movements')} subtitle={`${movements.length} ${t('rows')} · ${t('overviewPeriod')}`} action={<div className="flex flex-wrap gap-2">{hasRole('ADMIN', 'STOREKEEPER') && <button onClick={() => showMovementModal()} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newMovement')}</button>}{hasRole('STOREKEEPER') && <button onClick={() => setModal({ type: 'stockCount' })} className="inline-flex items-center gap-2 rounded-xl border border-forest px-4 py-2.5 text-sm font-bold text-forest"><Plus size={17} />{t('stockCount')}</button>}<button onClick={() => downloadCsv(`movements-${new Date().toISOString().slice(0, 10)}.csv`, [[t('date'), t('product'), t('movementType'), t('amount'), t('reason'), t('location'), t('reference')], ...filteredMovements.map((item) => [item.date, firstProductName(item.productId), movementTypeLabel(item.type, t), item.quantity, item.reason, item.location, item.reference])])} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-600 dark:text-slate-200"><Download size={16} />{t('exportMovements')}</button></div>} />
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('searchProducts')} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-9 ps-3 text-xs outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white" /></label>
      <select value={movementFilter} onChange={(e) => setMovementFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">{t('allTypes')}</option>{['Purchase IN', 'Production IN', 'Sale OUT', 'Loss OUT', 'Internal issue OUT', 'Adjustment', 'Transfer'].map((type) => <option key={type} value={type}>{movementTypeLabel(type, t)}</option>)}</select>
      <button onClick={() => { setQuery(''); setMovementFilter(''); }} className="rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-500 dark:border-slate-600">{t('filter')}</button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-xs"><thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-slate-700/70"><tr>{[t('date'), t('product'), t('movementType'), t('amount'), t('reason'), t('location'), t('reference')].map((name) => <th key={name} className="px-4 py-3.5">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{filteredMovements.slice(0, 100).map((movement) => <tr key={movement.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30"><td className="px-4 py-3 text-slate-500">{dateLabel(movement.date)}</td><td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-100">{firstProductName(movement.productId)}</td><td className="px-4 py-3"><Badge tone={movement.type.endsWith('IN') ? 'green' : movement.type.endsWith('OUT') ? movement.type === 'Loss OUT' ? 'red' : 'amber' : 'blue'}>{movement.type.endsWith('IN') ? <ArrowDownLeft size={13} /> : movement.type.endsWith('OUT') ? <ArrowUpRight size={13} /> : <ArrowLeftRight size={13} />}{movementTypeLabel(movement.type, t)}</Badge></td><td className={`px-4 py-3 font-extrabold ${movement.type.endsWith('OUT') ? 'text-rose-600' : movement.type.endsWith('IN') ? 'text-forest' : 'text-slate-600'}`}>{movement.type.endsWith('OUT') ? '−' : '+'}{movement.quantity}</td><td className="px-4 py-3 text-slate-500">{movement.reason}</td><td className="px-4 py-3 text-slate-500">{movement.location}</td><td className="px-4 py-3 font-semibold text-slate-400" dir="ltr">{movement.reference}</td></tr>)}</tbody></table>{!filteredMovements.length && <Empty text={t('noResults')} />}</div></div>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700"><h2 className="font-extrabold">{t('adjustmentRequests')}</h2></div>
      {!adjustmentRequests.length ? <Empty text={t('noResults')} /> : <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {adjustmentRequests.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4 text-xs">
          <div className="min-w-[180px] flex-1"><b>{item.product.nameAr}</b><p className="mt-1 text-slate-500">{item.stockCount ? `${t('systemQuantity')}: ${item.stockCount.systemQuantity} → ${t('countedQuantity')}: ${item.stockCount.countedQuantity} · ` : ''}{item.quantity} · {item.location} · {item.reason}</p></div>
          <Badge tone={item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'amber'}>{t(item.status.toLowerCase())}</Badge>
          {item.status === 'PENDING' && hasRole('ADMIN') && <div className="flex gap-2"><button onClick={() => approveAdjustment(item)} className="rounded-lg bg-green-50 px-3 py-1.5 font-bold text-forest">{t('approve')}</button><button onClick={() => setModal({ type: 'reviewReason', item, onSave: rejectAdjustment })} className="rounded-lg bg-rose-50 px-3 py-1.5 font-bold text-rose-700">{t('reject')}</button></div>}
        </div>)}
      </div>}
    </section>
    {hasRole('ADMIN', 'STOREKEEPER') && <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700"><h2 className="font-extrabold">{t('stockCountHistory')}</h2></div>
      {!stockCounts.length ? <Empty text={t('noResults')} /> : <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {stockCounts.map((count) => <div key={count.id} className="flex flex-wrap items-center gap-3 px-5 py-4 text-xs">
          <div className="min-w-[180px] flex-1"><b>{count.product.nameAr}</b><p className="mt-1 text-slate-500">{count.location} · {t('systemQuantity')}: {count.systemQuantity} · {t('countedQuantity')}: {count.countedQuantity} · {count.reason}</p></div>
          {count.adjustmentRequest && <Badge tone={count.adjustmentRequest.status === 'APPROVED' ? 'green' : count.adjustmentRequest.status === 'REJECTED' ? 'red' : 'amber'}>{t(count.adjustmentRequest.status.toLowerCase())}</Badge>}
        </div>)}
      </div>}
    </section>}
  </div>;

  const renderProduction = () => <div className="space-y-5">
    <PageHeading
      title={t('production')}
      subtitle={`${batches.length} ${t('batch')}`}
      action={<div className="flex flex-wrap gap-2">
        {hasRole('ADMIN') && <button onClick={() => setModal({ type: 'productionTask' })} className="inline-flex items-center gap-2 rounded-xl border border-forest px-3 py-2.5 text-sm font-bold text-forest"><Plus size={16} />{t('createTask')}</button>}
        {hasRole('ADMIN', 'NURSERY_WORKER') && <button onClick={() => setModal({ type: 'batch' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newBatch')}</button>}
      </div>}
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.keys(stageLabels).map((stage, index) => <div key={stage} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{t(`productionStage${stage[0].toUpperCase()}${stage.slice(1)}`)}</span><span className={`h-2.5 w-2.5 rounded-full ${['bg-amber-400', 'bg-sky-400', 'bg-green-500', 'bg-forest'][index]}`} /></div><p className="mt-3 text-2xl font-extrabold text-slate-800 dark:text-white">{batches.filter((batch) => batch.stage === stage).length}</p><p className="mt-1 text-[11px] text-slate-400">{t('batch')}</p></div>)}</div>

    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('productionTasks')}</h2><span className="text-xs text-slate-400">{productionTasks.length}</span></div>
      {!productionTasks.length ? <Empty text={t('noProductionTasks')} /> : <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {productionTasks.map((task) => <div key={task.id} className="flex flex-wrap items-center gap-3 py-3 text-xs">
          <div className="min-w-[220px] flex-1"><b>{task.title}</b><p className="mt-1 text-slate-500">{t(`task${task.type[0]}${task.type.slice(1).toLowerCase()}`)} · {task.batch?.code || t('batch')} · {task.assignedTo?.name}{task.dueAt ? ` · ${dateLabel(task.dueAt.slice(0, 10))}` : ''}</p>{task.workerNote && <p className="mt-1 text-slate-500">{task.workerNote}</p>}</div>
          <Badge tone={task.status === 'COMPLETED' ? 'green' : task.status === 'IN_PROGRESS' ? 'blue' : 'amber'}>{t(task.status === 'IN_PROGRESS' ? 'taskInProgress' : task.status.toLowerCase())}</Badge>
          {hasRole('NURSERY_WORKER') && task.status !== 'COMPLETED' && <button onClick={() => setModal({ type: 'productionTaskUpdate', item: task, status: task.status === 'OPEN' ? 'IN_PROGRESS' : 'COMPLETED' })} className="rounded-lg bg-green-50 px-3 py-2 font-bold text-forest">{t(task.status === 'OPEN' ? 'startTask' : 'completeTask')}</button>}
        </div>)}
      </div>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('production')} · {t('batch')}</h2><span className="text-xs text-slate-400">{batches.reduce((sum, batch) => sum + batch.sown - batch.loss, 0)}</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-right text-xs">
        <thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('batch'), t('batchSeed'), t('sowingDate'), t('sown'), t('stage'), t('readyDate'), t('actions')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{batches.map((batch) => {
          const canAdvance = hasRole('ADMIN', 'NURSERY_WORKER') && ['sowing', 'germination'].includes(batch.stage)
            && !['PENDING', 'VERIFIED'].includes(batch.proposalStatus);
          const canRecord = hasRole('NURSERY_WORKER') && batch.stage !== 'ready';
          return <tr key={batch.id}>
            <td className="px-4 py-4 font-extrabold text-forest">{batch.code || batch.id}</td>
            <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-100">{batch.seed}</td>
            <td className="px-4 py-4 text-slate-500">{dateLabel(batch.sowing)}</td>
            <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{batch.sown} <span className="text-[10px] text-slate-400">· {batch.loss} فاقد</span></td>
            <td className="px-4 py-4"><BatchBadge stage={batch.stage} t={t} />{batch.proposalStatus && batch.proposalStatus !== 'NONE' && <p className="mt-1 text-[10px] text-slate-500">{t(batch.proposalStatus === 'PENDING' ? 'pendingApproval' : batch.proposalStatus.toLowerCase())}{batch.readyQuantity ? ` · ${batch.readyQuantity}` : ''}</p>}</td>
            <td className="px-4 py-4 text-slate-500">{dateLabel(batch.readyDate)}</td>
            <td className="px-4 py-4"><div className="flex flex-wrap gap-1">
              {canRecord && <><button onClick={() => setModal({ type: 'productionCare', item: batch })} className="rounded-lg bg-sky-50 px-2 py-1.5 text-[10px] font-bold text-sky-700">{t('careLog')}</button><button onClick={() => setModal({ type: 'productionLoss', item: batch })} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700">{t('reportPlantLoss')}</button></>}
              {canAdvance && <button onClick={() => advanceProductionStage(batch)} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-700">{t('advanceStage')}</button>}
              {batch.stage === 'growing' && user.role === 'NURSERY_WORKER' && (!batch.proposalStatus || ['NONE', 'REJECTED'].includes(batch.proposalStatus)) && <button onClick={() => setModal({ type: 'readyProposal', item: batch })} className="rounded-lg bg-sky-50 px-2 py-1.5 text-[10px] font-bold text-sky-700">{t('submitReadyProposal')}</button>}
              {batch.proposalStatus === 'PENDING' && hasRole('STOREKEEPER') && <button onClick={() => verifyBatchReady(batch)} className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-800">{t('verify')}</button>}
              {batch.proposalStatus === 'VERIFIED' && hasRole('ADMIN') && <button onClick={() => markBatchReady(batch)} className="rounded-lg bg-green-50 px-2 py-1.5 text-[10px] font-bold text-forest">{t('approve')}</button>}
              {['PENDING', 'VERIFIED'].includes(batch.proposalStatus) && (hasRole('ADMIN') || (hasRole('STOREKEEPER') && batch.proposalStatus === 'PENDING')) && <button onClick={() => setModal({ type: 'reviewReason', item: batch, onSave: rejectBatchReady })} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700">{t('reject')}</button>}
              {batch.stage === 'ready' && <Badge>{t('done')}</Badge>}
            </div>
              {(batch.careLogs?.length > 0 || batch.lossReports?.length > 0) && <details className="mt-2 text-[10px] text-slate-500"><summary className="cursor-pointer">{t('careHistory')} · {batch.careLogs.length} / {t('lossHistory')} · {batch.lossReports.length}</summary>
                <div className="mt-2 space-y-1">{batch.careLogs.map((log) => <p key={log.id}>{t(`care${log.type[0]}${log.type.slice(1).toLowerCase()}`)} · {dateLabel(log.performedAt.slice(0, 10))}{log.note ? ` · ${log.note}` : ''}</p>)}{batch.lossReports.map((loss) => <p key={loss.id}>{t('reportPlantLoss')} · {loss.quantity} · {dateLabel(loss.occurredAt.slice(0, 10))} · {loss.reason}</p>)}</div>
              </details>}
            </td>
          </tr>;
        })}</tbody>
      </table></div>
      {!batches.length && <Empty text={t('noResults')} />}
    </section>
    <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4 text-xs leading-6 text-green-900"><div className="flex gap-3"><Flower2 className="mt-1 shrink-0" size={18} /><p>{t('noStockUntilApproved')}</p></div></div>
  </div>;

  const renderPurchasing = () => <div className="space-y-5">
    <PageHeading
      title={t('purchasing')}
      subtitle={`${suppliers.length} ${t('supplier')} · ${orders.length} ${t('purchaseOrders')}`}
      action={<div className="flex flex-wrap gap-2">
        {hasRole('ADMIN', 'PURCHASING', 'ACCOUNTANT') && <button onClick={exportPurchasingReport} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">{t('exportPurchasing')}</button>}
        {hasRole('ADMIN', 'PURCHASING') && <button onClick={() => setModal({ type: 'supplier' })} className="rounded-xl border border-forest px-3 py-2 text-xs font-bold text-forest">{t('addSupplier')}</button>}
        {hasRole('PURCHASING') && <>
          <button onClick={() => setModal({ type: 'supplierQuote' })} className="rounded-xl border border-forest px-3 py-2 text-xs font-bold text-forest">{t('recordQuote')}</button>
          <button onClick={() => setModal({ type: 'supplierInvoice' })} className="rounded-xl border border-forest px-3 py-2 text-xs font-bold text-forest">{t('recordInvoice')}</button>
          <button onClick={() => setModal({ type: 'supplierReturn' })} className="rounded-xl border border-forest px-3 py-2 text-xs font-bold text-forest">{t('requestSupplierReturn')}</button>
          <button onClick={() => setModal({ type: 'order' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newOrder')}</button>
        </>}
      </div>}
    />
    {hasRole('ADMIN', 'PURCHASING') && <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-900/10">
      <h2 className="mb-3 font-extrabold">{t('lowStockPurchases')}</h2>
      <div className="space-y-2">{products.filter((product) => product.active && getQty(product.id) <= product.minimum).map((product) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-xs dark:bg-slate-800">
        <div><b>{product.nameAr}</b><p className="mt-1 text-slate-500">{t('quantityAvailable')}: {getQty(product.id)} · {t('minimum')}: {product.minimum}</p></div>
        {hasRole('PURCHASING') && <button onClick={() => setModal({ type: 'order', productId: product.id })} className="rounded-lg bg-forest px-3 py-2 font-bold text-white">{t('purchaseShortcut')}</button>}
      </div>)}</div>
      {!products.some((product) => product.active && getQty(product.id) <= product.minimum) && <p className="text-xs text-slate-500">{t('noResults')}</p>}
    </section>}
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold">{t('manageSuppliers')}</h2><span className="text-xs text-slate-400">{suppliers.length}</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => <div key={supplier.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
        <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-forest"><Truck size={19} /></div><Badge tone="blue">{supplier.type}</Badge></div>
        <h3 className="mt-3 font-extrabold text-slate-800 dark:text-white">{supplier.name}</h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="flex items-center gap-1"><Building2 size={13} />{supplier.city}</span><span dir="ltr">{supplier.phone}</span></div>
        {supplier.email && <p className="mt-1 text-xs text-slate-500" dir="ltr">{supplier.email}</p>}
        {hasRole('ADMIN', 'PURCHASING') && <div className="mt-3 flex gap-2">
          <button onClick={() => setModal({ type: 'supplier', item: supplier })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold">{t('edit')}</button>
          <button onClick={() => archiveSupplier(supplier)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">{t('archive')}</button>
        </div>}
      </div>)}</div>
      {!suppliers.length && <Empty text={t('noResults')} />}
    </section>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 font-extrabold">{t('supplierQuotes')}</h2>
        <div className="space-y-3">{supplierQuotes.map((quote) => <div key={quote.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
          <div className="flex flex-wrap justify-between gap-2"><b>{quote.supplier.name} · <span dir="ltr">{quote.reference}</span></b><span className="text-xs text-slate-500">{dateLabel(quote.quoteDate)}</span></div>
          {quote.validUntil && <p className="mt-1 text-xs text-slate-500">{t('validUntil')}: {dateLabel(quote.validUntil)}</p>}
          <div className="mt-2 space-y-1 text-xs">{quote.lines.map((line) => <p key={line.id} className="flex justify-between gap-3"><span>{line.product.nameAr}</span><b>{currency(Number(line.unitPrice))}</b></p>)}</div>
        </div>)}</div>
        {!supplierQuotes.length && <Empty text={t('noResults')} />}
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-2 font-extrabold">{t('supplierInvoices')}</h2>
        <p className="mb-4 text-xs text-slate-500">{t('vatNotApplied')}</p>
        <div className="space-y-3">{supplierInvoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-700">
          <div><b>{invoice.supplier.name} · <span dir="ltr">{invoice.reference}</span></b><p className="mt-1 text-xs text-slate-500">{invoice.purchaseOrder?.code || '—'} · {invoice.invoiceDate ? dateLabel(invoice.invoiceDate) : dateLabel(invoice.createdAt)} · {invoice.totalAmount == null ? t('invoiceBalanceUnknown') : currency(invoice.totalAmount)}</p></div>
          <div className="flex items-center gap-2"><Badge tone={invoice.status === 'REVIEWED' ? 'green' : 'amber'}>{t(invoice.status.toLowerCase())}</Badge>{invoice.status === 'RECORDED' && hasRole('ADMIN', 'ACCOUNTANT') && <button onClick={() => reviewSupplierInvoice(invoice)} className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-forest">{t('reviewInvoice')}</button>}</div>
        </div>)}</div>
        {!supplierInvoices.length && <Empty text={t('noResults')} />}
      </section>
    </div>
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-2 font-extrabold">{t('supplierReturns')}</h2>
      <p className="mb-4 text-xs text-slate-500">{t('noReturnStockPosting')}</p>
      <div className="space-y-3">{supplierReturns.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-700">
        <div className="min-w-[220px] flex-1"><b>{item.supplier.name}{item.supplierReference ? ` · ${item.supplierReference}` : ''}</b><p className="mt-1 text-xs text-slate-500">{item.purchaseOrder?.code || '—'} · {item.reason}</p><p className="mt-1 text-xs text-slate-500">{item.lines.map((line) => `${line.product.nameAr} × ${line.quantity}`).join(' · ')}</p></div>
        <div className="flex items-center gap-2"><Badge tone={item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'amber'}>{t(item.status === 'PENDING_APPROVAL' ? 'pendingApproval' : item.status.toLowerCase())}</Badge>{item.status === 'PENDING_APPROVAL' && hasRole('ADMIN') && <><button onClick={() => approveSupplierReturn(item)} className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-forest">{t('approve')}</button><button onClick={() => setModal({ type: 'reviewReason', item, onSave: rejectSupplierReturn })} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">{t('reject')}</button></>}</div>
      </div>)}</div>
      {!supplierReturns.length && <Empty text={t('noResults')} />}
    </section>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('purchaseOrders')}</h2><span className="text-xs text-slate-400">{orders.filter((o) => !['Received', 'Rejected'].includes(o.status)).length} {t('pending')}</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-right text-xs">
        <thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('order'), t('supplier'), t('date'), t('lines'), t('total'), t('status'), t('actions')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{orders.map((order) => <tr key={order.id}>
          <td className="px-4 py-4 font-extrabold text-forest" dir="ltr">{order.code || order.id}</td><td className="px-4 py-4 font-bold">{order.supplier}</td><td className="px-4 py-4 text-slate-500">{dateLabel(order.date)}</td><td className="px-4 py-4 text-slate-500">{order.lines}</td><td className="px-4 py-4 font-bold">{currency(order.total)}</td>
          <td className="px-4 py-4"><OrderBadge status={order.status} t={t} /></td><td className="px-4 py-4"><div className="flex gap-2">
            {['Pending approval', 'Draft'].includes(order.status) && hasRole('ADMIN') && <><button onClick={() => approveOrder(order)} className="rounded-lg bg-green-50 px-2 py-1.5 text-[10px] font-bold text-forest">{t('approve')}</button><button onClick={() => setModal({ type: 'reviewReason', item: order, onSave: rejectOrder })} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700">{t('reject')}</button></>}
            {order.status === 'Approved' && hasRole('ADMIN', 'PURCHASING') && <button onClick={() => sendOrder(order)} className="rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700">{t('send')}</button>}
            {['Sent', 'Partially received'].includes(order.status) && hasRole('ADMIN', 'STOREKEEPER') && <button onClick={() => setModal({ type: 'purchaseReceipt', order })} className="rounded-lg bg-green-50 px-3 py-1.5 text-[11px] font-bold text-forest">{t('receive')}</button>}
          </div></td>
        </tr>)}</tbody>
      </table>{!orders.length && <Empty text={t('noResults')} />}</div>
    </div>
  </div>;

  const renderSales = () => {
    const totalCredits = customers.reduce((sum, customer) => sum + customer.credit, 0);
    const ownSession = cashSessions.find((session) => session.userId === user.id && !session.closedAt);
    const activeSessions = cashSessions.filter((session) => !session.closedAt);
    return <div className="space-y-5">
      <PageHeading title={t('sales')} subtitle={`${customers.length} ${t('customers')} · ${sales.length} ${t('salesUnit')}`} action={hasRole('ADMIN', 'SELLER') && <button onClick={() => setModal({ type: 'sale' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('newSale')}</button>} />
      <div className="grid gap-4 sm:grid-cols-3"><MiniStat title={t('customers')} value={customers.length} icon={Users} /><MiniStat title={t('sales')} value={sales.length} icon={ShoppingBag} /><MiniStat title={t('creditBalance')} value={currency(totalCredits)} icon={CreditCard} /></div>
      {hasRole('ADMIN', 'SELLER', 'ACCOUNTANT') && <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
        <div><h2 className="font-extrabold">{t('cashSession')}</h2>{ownSession
          ? <p className="mt-1 text-xs text-slate-500">{t('activeSession')} · {t('expectedCash')}: {currency(ownSession.expectedCash)}</p>
          : <p className="mt-1 text-xs text-slate-500">{hasRole('SELLER', 'ADMIN') ? t('noCashSession') : `${activeSessions.length} ${t('activeSession')}`}</p>}
        </div>
        {ownSession && hasRole('ADMIN', 'SELLER')
          ? <button onClick={() => setModal({ type: 'closeCashSession', session: ownSession })} className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">{t('closeCashSession')}</button>
          : !ownSession && hasRole('ADMIN', 'SELLER')
            ? <button onClick={() => setModal({ type: 'openCashSession' })} className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">{t('openCashSession')}</button>
            : null}
      </section>}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
          <h2 className="mb-4 font-extrabold text-slate-800 dark:text-white">آخر المبيعات</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs">
            <thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('reference'), t('customer'), t('date'), t('total'), t('paidAmount'), t('remaining'), t('payment'), t('actions')].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{sales.map((sale) => <tr key={sale.recordId}>
              <td className="px-3 py-4 font-extrabold text-forest" dir="ltr">{sale.code || sale.id}</td>
              <td className="px-3 py-4 font-bold text-slate-700 dark:text-slate-100">{sale.customer}</td>
              <td className="px-3 py-4 text-slate-500">{dateLabel(sale.date)}</td>
              <td className="px-3 py-4 font-bold">{currency(sale.total - sale.returnedAmount)}</td>
              <td className="px-3 py-4 text-slate-500">{currency(sale.paidAmount)}</td>
              <td className="px-3 py-4 font-bold text-amber-700">{currency(sale.balance)}</td>
              <td className="px-3 py-4"><Badge tone={sale.approvalStatus === 'PENDING' ? 'blue' : sale.approvalStatus === 'REJECTED' ? 'red' : sale.payment === 'paid' ? 'green' : 'amber'}>{sale.approvalStatus === 'PENDING' ? t('pendingCredit') : sale.approvalStatus === 'REJECTED' ? t('rejected') : sale.payment === 'paid' ? t('paid') : t('credit')}</Badge></td>
              <td className="px-3 py-4"><div className="flex flex-wrap gap-1">
                {sale.approvalStatus === 'PENDING' && hasRole('ADMIN') && <><button onClick={() => approveCreditSale(sale)} className="rounded-lg bg-green-50 px-2 py-1.5 text-[10px] font-bold text-forest">{t('approveCredit')}</button><button onClick={() => setModal({ type: 'reviewReason', item: sale, onSave: rejectCreditSale })} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700">{t('rejectCredit')}</button></>}
                {sale.approvalStatus === 'APPROVED' && <><button onClick={() => setPrintDocument({ sale, kind: 'receipt' })} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold">{t('receipt')}</button><button onClick={() => setPrintDocument({ sale, kind: 'invoice' })} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold">{t('invoice')}</button></>}
                {sale.approvalStatus === 'APPROVED' && sale.returnedAmount < sale.total && hasRole('ADMIN', 'SELLER') && <button onClick={() => setModal({ type: 'salesReturn', sale })} className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-800">{t('requestReturn')}</button>}
              </div></td>
            </tr>)}</tbody>
          </table>{!sales.length && <Empty text={t('noResults')} />}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-extrabold text-slate-800 dark:text-white">{t('customers')}</h2>
          <div className="max-h-[450px] space-y-3 overflow-auto">{customers.map((customer) => <div key={customer.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-forest"><UserRound size={17} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-100">{customer.name}</p><p className="text-[10px] text-slate-400">{customerTypeLabel(customer.type, t)}</p>
              {paymentHistoryFor === customer.id && customer.payments?.length > 0 && <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 dark:border-slate-600">{customer.payments.slice(0, 5).map((payment) => <div key={payment.id} className="flex justify-between gap-2 text-[10px] text-slate-500"><span>{new Date(payment.receivedAt).toLocaleDateString(language === 'fr' ? 'fr-TN' : 'ar-TN')}{payment.method ? ` · ${payment.method}` : ''}{payment.reference ? ` · ${payment.reference}` : ''}{payment.note ? ` · ${payment.note}` : ''}</span><b className="shrink-0 text-forest">{currency(payment.amount)}</b></div>)}</div>}
            </div>
            {customer.credit > 0 && <div className="text-end"><span className="block text-[10px] font-bold text-amber-700">{currency(customer.credit)}</span>{hasRole('ADMIN', 'SELLER', 'ACCOUNTANT') && <button onClick={() => setModal({ type: 'payment', customer })} className="mt-1 block text-[10px] font-bold text-forest">{t('collectPayment')}</button>}</div>}
            {customer.payments?.length > 0 && <button onClick={() => setPaymentHistoryFor((current) => current === customer.id ? null : customer.id)} className="shrink-0 text-[10px] font-bold text-slate-500">{t('paymentHistory')} ({customer.payments.length})</button>}
          </div>)}</div>
        </div>
      </div>
    </div>;
  };

  const renderReturns = () => <div className="space-y-5">
    <PageHeading title={t('returnRequests')} subtitle={`${salesReturns.length} ${t('returnRequests')}`} />
    <div className="grid gap-4 lg:grid-cols-2">{salesReturns.map((item) => <section key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-extrabold text-forest" dir="ltr">{item.code} · {item.saleCode}</h2>{item.customer && <p className="mt-1 text-xs text-slate-500">{item.customer}</p>}</div><Badge tone={item.status === 'APPROVED' ? 'blue' : item.status === 'REJECTED' ? 'red' : item.status === 'COMPLETED' ? 'green' : 'amber'}>{item.status === 'APPROVED' ? t('approved') : item.status === 'REJECTED' ? t('rejected') : item.status === 'COMPLETED' ? t('returnCompleted') : t('pending')}</Badge></div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{item.reason}</p>
      <ul className="mt-3 space-y-1 text-xs text-slate-500">{item.lines.map((line) => <li key={line.id}>{line.productName} · {line.quantity} · {t('restockQuantity')}: {line.restockedQuantity ?? '—'}</li>)}</ul>
      {item.reviewNote && <p className="mt-2 text-xs text-rose-700">{item.reviewNote}</p>}
      <div className="mt-4 flex gap-2">{item.status === 'PENDING' && hasRole('ADMIN') && <><button onClick={() => approveSalesReturn(item)} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-forest">{t('approve')}</button><button onClick={() => setModal({ type: 'reviewReason', item, onSave: rejectSalesReturn })} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{t('reject')}</button></>}{item.status === 'APPROVED' && hasRole('ADMIN', 'STOREKEEPER') && <button onClick={() => setModal({ type: 'verifyReturn', item })} className="rounded-lg bg-forest px-3 py-2 text-xs font-bold text-white">{t('verifyReturn')}</button>}</div>
    </section>)}</div>
    {!salesReturns.length && <Empty text={t('noResults')} />}
  </div>;

  const renderAlerts = () => {
    const alerts = [
      ...products.filter((p) => getQty(p.id) === 0).map((p) => ({ id: `out-${p.id}`, title: `نفد المخزون: ${p.nameAr}`, detail: `${p.location} · الحد الأدنى ${p.minimum}`, tone: 'red', action: true })),
      ...lowProducts.filter((p) => getQty(p.id) > 0).map((p) => ({ id: `low-${p.id}`, title: `مخزون منخفض: ${p.nameAr}`, detail: `المتاح ${getQty(p.id)} فقط · الحد الأدنى ${p.minimum}`, tone: 'amber', action: true })),
      ...batches.filter((b) => b.stage !== 'ready' && (new Date(`${b.readyDate}T00:00:00`) - new Date()) / 86400000 < 10).map((b) => ({ id: `batch-${b.id}`, title: `${t('readySoon')}: ${b.seed}`, detail: `${b.id} · ${dateLabel(b.readyDate)}`, tone: 'blue' })),
      ...(monthlyLoss > 8 ? [{ id: 'loss-rate', title: t('highLoss'), detail: `${monthlyLoss} شتلة تالفة أو مفقودة هذا الشهر`, tone: 'red' }] : []),
    ];
    return <div className="space-y-5"><PageHeading title={t('alerts')} subtitle={`${alerts.length} تنبيهات تحتاج إلى متابعة`} action={hasRole('ADMIN', 'PURCHASING') && <button onClick={() => setModal({ type: 'order' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><ShoppingCart size={16} />{t('purchaseShortcut')}</button>} />
      <div className="grid gap-4 lg:grid-cols-2">{alerts.map((alert) => <div key={alert.id} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.tone === 'red' ? 'bg-rose-50 text-rose-600' : alert.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}><AlertTriangle size={19} /></div><div className="min-w-0 flex-1"><p className="font-extrabold text-slate-800 dark:text-white">{alert.title}</p><p className="mt-1 text-xs text-slate-500">{alert.detail}</p></div>{alert.action && hasRole('ADMIN', 'PURCHASING') && <button onClick={() => setModal({ type: 'order' })} className="shrink-0 rounded-lg bg-green-50 px-3 py-2 text-[10px] font-extrabold text-forest">{t('newOrder')}</button>}</div>)}
      {!alerts.length && <div className="col-span-full rounded-2xl bg-white p-12 text-center shadow-card dark:bg-slate-800"><Check size={30} className="mx-auto text-forest" /><p className="mt-3 font-bold text-slate-600">لا توجد تنبيهات نشطة حالياً</p></div>}</div>
    </div>;
  };

  const renderReports = () => {
    const report = reportData;
    const downloadExcelCsv = () => {
      if (!report) return;
      const csvRows = [
        ['Report', 'Date', 'SKU', 'Product', 'Category', 'Customer', 'Quantity', 'Minimum stock', 'Amount (TND)', 'Details'],
        ...report.inventory.map((item) => ['Inventory', '', item.sku, item.nameAr, item.categoryAr, '', item.quantity, item.minimum, item.stockValue, `${item.size} · ${item.location}`]),
        ...report.salesByDay.map((item) => ['Daily sales', item.date, '', '', '', '', item.count, '', item.total, 'Sale count']),
        ...report.salesByCustomer.map((item) => ['Sales by customer', '', '', '', '', item.customer, item.count, '', item.total, 'Sale count']),
        ...report.salesByProduct.map((item) => ['Sales by product', '', item.sku, item.productAr, '', '', item.quantity, '', item.total, '']),
        ...report.losses.map((item) => ['Loss', item.date, item.sku, item.productAr, '', '', item.quantity, '', '', item.reason]),
        ...(report.expensesByCategory || []).map((item) => ['Approved expense', report.from, '', '', item.category, '', item.count, '', item.amount, 'Expense category total']),
        ['Customer collections', report.from, '', '', '', '', '', '', report.summary.customerCollections || 0, 'Includes all payment methods'],
        ['Supplier payments', report.from, '', '', '', '', '', '', report.summary.supplierPayments || 0, 'Includes all payment methods'],
        ['Cash in', report.from, '', '', '', '', '', '', report.summary.cashIn || 0, 'Cash ledger inflows'],
        ['Cash out', report.from, '', '', '', '', '', '', report.summary.cashOut || 0, 'Cash ledger outflows'],
        ['Supplier payables outstanding', report.to, '', '', '', '', '', '', report.summary.supplierPayableOutstanding || 0, 'Reviewed amount-bearing invoices only'],
        ['Expense payables outstanding', report.to, '', '', '', '', '', '', report.summary.expensePayableOutstanding || 0, 'Approved expenses only'],
      ];
      downloadCsv(`inventory-${report.from}-${report.to}.csv`, csvRows);
    };
    const printPdf = () => {
      if (!report) return;
      const popup = window.open('', '_blank');
      if (!popup) {
        notify(isRtl ? 'اسمح بالنوافذ المنبثقة لطباعة التقرير' : 'Autorisez les fenêtres pop-up pour imprimer le rapport');
        return;
      }
      popup.document.write(buildReportPrintHtml(report, isRtl));
      popup.document.close();
      popup.focus();
      window.setTimeout(() => popup.print(), 250);
    };
    return <div className="space-y-5">
      <PageHeading title={t('reports')} subtitle={`${report?.from || reportFrom} – ${report?.to || reportTo}`} action={<div className="flex flex-wrap gap-2">
        <button disabled={!report} onClick={downloadExcelCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><FileSpreadsheet size={16} className="text-green-700" />{t('exportCsv')}</button>
        <button disabled={!report} onClick={printPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"><Download size={15} />{t('exportPdf')}</button>
      </div>} />
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800">
        <Field label={t('reportFrom')}><input type="date" value={reportFrom} max={reportTo} onChange={(event) => setReportFrom(event.target.value)} className={inputClass} /></Field>
        <Field label={t('reportTo')}><input type="date" value={reportTo} min={reportFrom} onChange={(event) => setReportTo(event.target.value)} className={inputClass} /></Field>
      </div>
      {reportError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{t('reportError')}: {reportError}</p>}
      {!report && !reportError && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-forest">{t('reportLoading')}</p>}
      {report && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat title={t('reportSales')} value={currency(report.summary.salesTotal)} icon={Activity} />
          <MiniStat title={t('reportCount')} value={report.summary.salesCount} icon={ShoppingBag} />
          <MiniStat title={t('reportStock')} value={currency(report.summary.inventoryValue)} icon={Package} />
          <MiniStat title={t('reportCredit')} value={currency(report.summary.creditOutstanding)} icon={CreditCard} />
          <MiniStat title={t('customerCollections')} value={currency(report.summary.customerCollections || 0)} icon={CreditCard} />
          <MiniStat title={t('approvedExpenses')} value={currency(report.summary.approvedExpenses || 0)} icon={Wallet} />
          <MiniStat title={t('supplierPayable')} value={currency(report.summary.supplierPayableOutstanding || 0)} icon={Truck} />
          <MiniStat title={t('cashNet')} value={currency(report.summary.cashNet || 0)} icon={Wallet} />
          <MiniStat title={t('expensePayable')} value={currency(report.summary.expensePayableOutstanding || 0)} icon={Wallet} />
          <MiniStat title={t('cashVarianceTotal')} value={currency(report.summary.cashVarianceTotal || 0)} icon={Activity} />
        </div>
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">{report.summary.financialReportNotice || t('accountingNotice')}</p>
        <div className="grid gap-4 xl:grid-cols-2">
          <ReportTable title={t('reportInventory')} headers={[t('product'), t('category'), t('quantity'), t('minimum'), t('stockValue')]} rows={report.inventory.map((item) => [isRtl ? item.nameAr : item.nameFr, categoryLabel(isRtl ? item.categoryAr : item.categoryFr), item.quantity, item.minimum, currency(item.stockValue)])} t={t} />
          <ReportTable title={t('customerSales')} headers={[t('customer'), t('reportCount'), t('total')]} rows={report.salesByCustomer.map((item) => [item.customer, item.count, currency(item.total)])} t={t} />
          <ReportTable title={t('bestSellers')} headers={[t('date'), t('reportCount'), t('total')]} rows={report.salesByDay.map((item) => [item.date, item.count, currency(item.total)])} t={t} />
          <ReportTable title={t('lossReport')} headers={[t('reason'), t('quantity'), t('reportCount')]} rows={report.lossesByReason.map((item) => [item.reason, item.quantity, item.entries])} t={t} />
          <ReportTable title={isRtl ? 'الأكثر مبيعاً حسب المنتج' : 'Ventes par produit'} headers={[t('product'), t('quantity'), t('total')]} rows={report.salesByProduct.map((item) => [isRtl ? item.productAr : item.productFr, item.quantity, currency(item.total)])} t={t} />
          <ReportTable title={t('expenses')} headers={[t('expenseCategory'), t('reportCount'), t('total')]} rows={(report.expensesByCategory || []).map((item) => [item.category, item.count, currency(item.amount)])} t={t} />
        </div>
      </>}
    </div>;
  };
  const renderAccounting = () => {
    const closedSessions = cashSessions.filter((session) => session.closedAt);
    const sessionVariance = (session) => Number(session.variance || 0);
    const supplierInvoiceBalance = (invoice) => Math.max(
      0,
      Number(invoice.totalAmount || 0) - (invoice.payments || []).reduce((sum, payment) => sum + Number(payment.amount), 0),
    );
    return <div className="space-y-5">
      <PageHeading
        title={t('accounting')}
        subtitle={t('accountingNotice')}
        action={hasRole('ACCOUNTANT') && <button onClick={() => setModal({ type: 'expense' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('recordExpense')}</button>}
      />
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950">{t('accountingNotice')}</div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-extrabold">{t('expenses')}</h2>
          <div className="space-y-3">{expenses.map((expense) => <div key={expense.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><b>{expense.category} · {currency(expense.amount)}</b><p className="mt-1 text-xs text-slate-500">{expense.description} · {dateLabel(expense.incurredAt)}</p>
                <p className="mt-1 text-xs text-slate-500">{t('supplierBalance')}: {currency(expense.balance)} · {t('paidAmount')}: {currency(expense.paid)}</p></div>
              <Badge tone={expense.status === 'APPROVED' ? 'green' : expense.status === 'REJECTED' ? 'red' : 'amber'}>{t(expense.status === 'PENDING_APPROVAL' ? 'pendingApproval' : expense.status.toLowerCase())}</Badge>
            </div>
            {expense.status === 'PENDING_APPROVAL' && hasRole('ADMIN') && <div className="mt-3 flex gap-2">
              <button onClick={() => approveExpense(expense)} className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-forest">{t('approveExpense')}</button>
              <button onClick={() => setModal({ type: 'reviewReason', item: expense, onSave: rejectExpense })} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">{t('rejectExpense')}</button>
            </div>}
            {expense.status === 'APPROVED' && expense.balance > 0 && hasRole('ACCOUNTANT') && <button onClick={() => setModal({ type: 'accountingPayment', document: expense, documentType: 'expense' })} className="mt-3 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white">{t('payExpense')}</button>}
          </div>)}</div>
          {!expenses.length && <Empty text={t('noResults')} />}
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-extrabold">{t('supplierInvoices')}</h2>
          <div className="space-y-3">{supplierInvoices.map((invoice) => {
            const balance = invoice.totalAmount === null ? null : supplierInvoiceBalance(invoice);
            return <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-700">
              <div><b>{invoice.supplier.name} · <span dir="ltr">{invoice.reference}</span></b>
                <p className="mt-1 text-xs text-slate-500">{invoice.totalAmount === null ? t('invoiceBalanceUnknown') : `${t('invoiceAmount')}: ${currency(invoice.totalAmount)} · ${t('supplierBalance')}: ${currency(balance)}`}</p></div>
              <div className="flex items-center gap-2"><Badge tone={invoice.status === 'REVIEWED' ? 'green' : 'amber'}>{t(invoice.status.toLowerCase())}</Badge>
                {invoice.status === 'REVIEWED' && balance > 0 && hasRole('ACCOUNTANT') && <button onClick={() => setModal({ type: 'accountingPayment', document: { ...invoice, balance }, documentType: 'supplier' })} className="rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white">{t('payInvoice')}</button>}
              </div>
            </div>;
          })}</div>
          {!supplierInvoices.length && <Empty text={t('noResults')} />}
        </section>
      </div>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 font-extrabold">{t('cashReview')}</h2>
        <div className="space-y-3">{closedSessions.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-700">
          <div><b>{session.user.name} · {dateLabel(session.closedAt)}</b><p className="mt-1 text-xs text-slate-500">{t('expectedCash')}: {currency(session.expectedCash)} · {t('closingCash')}: {currency(session.closingCash)} · {t('variance')}: {currency(session.variance)}</p>
            {session.reviewedAt && <p className="mt-1 text-xs text-slate-500">{t('reviewCashSession')}: {session.reviewedBy?.name || '—'}</p>}</div>
          <div className="flex flex-wrap gap-2">
            {!session.reviewedAt && hasRole('ACCOUNTANT') && <button onClick={() => reviewCashSession(session)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">{t('reviewCashSession')}</button>}
            {session.reviewedAt && sessionVariance(session) !== 0 && !session.varianceApprovedAt && hasRole('ADMIN') && <button onClick={() => approveCashVariance(session)} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">{t('approveVariance')}</button>}
            {session.varianceApprovedAt && <Badge tone="green">{t('approveVariance')}</Badge>}
          </div>
        </div>)}</div>
        {!closedSessions.length && <Empty text={t('noResults')} />}
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-extrabold">{t('vatRates')}</h2>{hasRole('ADMIN') && <button onClick={() => setModal({ type: 'vatRate' })} className="rounded-xl border border-forest px-3 py-2 text-xs font-bold text-forest">{t('addVatRate')}</button>}</div>
        <p className="mb-4 text-xs text-slate-500">{t('vatNotApplied')}</p>
        <div className="space-y-2">{vatRates.map((rate) => <div key={rate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs dark:bg-slate-700/50">
          <b>{rate.name} · {Number(rate.percentage)}%</b><span>{dateLabel(rate.effectiveFrom)} – {rate.effectiveTo ? dateLabel(rate.effectiveTo) : '—'}</span>
          {hasRole('ADMIN') && new Date(rate.effectiveFrom) > new Date() && <button onClick={() => setModal({ type: 'vatRate', item: rate })} className="font-bold text-forest">{t('edit')}</button>}
        </div>)}</div>
        {!vatRates.length && <Empty text={t('noResults')} />}
      </section>
    </div>;
  };

  const renderUsers = () => {
    if (user.role !== 'ADMIN') return <PageHeading title={t('users')} subtitle={t('permission')} />;
    const roleLabel = {
      ADMIN: t('admin'),
      STOREKEEPER: t('storekeeper'),
      SELLER: t('seller'),
      PURCHASING: t('purchasingRole'),
      NURSERY_WORKER: t('nurseryWorker'),
      ACCOUNTANT: t('accountant'),
      VIEWER: t('viewer'),
    };
    return <div className="space-y-5">
      <PageHeading title={t('users')} subtitle={t('userActions')} action={<button onClick={() => setModal({ type: 'userEdit' })} className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{t('createUser')}</button>} />
      {usersError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{usersError}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(roleLabel).map(([role, label]) => <MiniStat key={role} title={label} value={users.filter((item) => item.role === role && item.active).length} icon={Users} />)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-xs">
          <thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('userName'), t('userEmail'), t('role'), t('status'), t('createdAt'), t('userActions')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{users.map((item) => <tr key={item.id}>
            <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-100">{item.name}</td>
            <td className="px-4 py-4 text-slate-500" dir="ltr">{item.email}</td>
            <td className="px-4 py-4">{roleLabel[item.role]}</td>
            <td className="px-4 py-4"><Badge tone={item.active ? 'green' : 'gray'}>{item.active ? t('activeUser') : t('inactiveUser')}</Badge></td>
            <td className="px-4 py-4 text-slate-500">{new Date(item.createdAt).toLocaleDateString(language === 'fr' ? 'fr-TN' : 'ar-TN')}</td>
            <td className="px-4 py-4"><div className="flex gap-1">
              <button onClick={() => setModal({ type: 'userEdit', item })} className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-700 dark:bg-slate-700 dark:text-white">{t('edit')}</button>
              <button onClick={() => setModal({ type: 'userPassword', item })} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 font-bold text-amber-800"><KeyRound size={13} />{t('resetPassword')}</button>
            </div></td>
          </tr>)}</tbody>
        </table>{!users.length && !usersError && <Empty text={t('noResults')} />}</div>
      </div>
      <p className="text-xs text-slate-400">{t('passwordResetHint')}</p>
    </div>;
  };

  const renderAudit = () => <div className="space-y-5">
    <PageHeading title={t('audit')} subtitle={t('auditHistory')} />
    {auditError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{auditError}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-xs">
        <thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-700/70"><tr>{[t('date'), t('actor'), t('event'), t('entity'), t('details')].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{auditLogs.map((entry) => <tr key={entry.id}>
          <td className="px-4 py-3 text-slate-500">{new Date(entry.createdAt).toLocaleString(language === 'fr' ? 'fr-TN' : 'ar-TN')}</td>
          <td className="px-4 py-3"><b>{entry.actor.name}</b><p className="mt-1 text-slate-400" dir="ltr">{entry.actor.email}</p></td>
          <td className="px-4 py-3 font-bold">{entry.action}</td>
          <td className="px-4 py-3">{entry.entity} · <span dir="ltr">{entry.entityId}</span></td>
          <td className="max-w-[360px] px-4 py-3 text-slate-500"><code className="whitespace-pre-wrap break-words">{JSON.stringify(entry.details)}</code></td>
        </tr>)}</tbody>
      </table>{!auditLogs.length && !auditError && <Empty text={t('noAuditEvents')} />}</div>
    </div>
  </div>;

  const pageRenderers = { dashboard: renderDashboard, products: renderProducts, movements: renderMovements, production: renderProduction, purchasing: renderPurchasing, sales: renderSales, returns: renderReturns, alerts: renderAlerts, accounting: renderAccounting, reports: renderReports, users: renderUsers, audit: renderAudit };
  const activeTitle = t(activePage);

  if (appLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f9f6] text-sm font-bold text-forest dark:bg-[#121b15]">{t('loading')}</div>;
  }
  if (!user) {
    return <LoginScreen language={language} initialError={dataError} onLanguageChange={() => setLanguage(language === 'ar' ? 'fr' : 'ar')} onLogin={handleLogin} />;
  }
  if (printDocument) {
    return <PrintDocument
      sale={printDocument.sale}
      kind={printDocument.kind}
      t={t}
      language={language}
      onClose={() => setPrintDocument(null)}
    />;
  }

  return <div className={`${dark ? 'dark' : ''} min-h-screen bg-[#f7f9f6] text-slate-800 dark:bg-[#121b15] dark:text-slate-100`} dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="min-h-screen">
      {mobileNav && <button aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 z-40 flex w-[248px] flex-col border-e border-slate-100 bg-white px-4 pb-4 pt-5 transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 ${isRtl ? 'right-0' : 'left-0'} ${mobileNav ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="mb-7 flex items-center gap-3 px-2"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-white shadow-md shadow-green-900/15"><Leaf size={24} /></div><div><h1 className="text-[17px] font-extrabold leading-tight text-slate-800 dark:text-white">مشتل الزاهي</h1><p className="mt-0.5 text-[10px] font-semibold tracking-wide text-slate-400">MASHTAL EZZAHI · TUNISIE</p></div><button onClick={() => setMobileNav(false)} className="ms-auto text-slate-400 lg:hidden"><X size={19} /></button></div>
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#f5f8f4] p-3 dark:bg-slate-800"><div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-lime-400 text-sm font-extrabold text-white">{user.name?.slice(0, 1) || 'ز'}<span className="absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-white bg-green-400" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-700 dark:text-white">{user.name}</p><p className="text-[10px] text-slate-400">{t(({ ADMIN: 'admin', STOREKEEPER: 'storekeeper', SELLER: 'seller', PURCHASING: 'purchasingRole', NURSERY_WORKER: 'nurseryWorker', ACCOUNTANT: 'accountant', VIEWER: 'viewer' })[user.role] || 'viewer')}</p></div><ChevronDown size={14} className="text-slate-400" /></div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {navGroups.map((group) => {
            const items = group.items.filter(([page]) => rolePages[user.role].includes(page));
            if (!items.length) return null;
            return <div key={group.title}><p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">{t(group.title)}</p><div className="space-y-1">{items.map(([page, Icon]) => {
            const count = page === 'alerts' ? lowProducts.length : 0;
            return <button key={page} onClick={() => navigate(page)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold transition ${activePage === page ? 'bg-green-50 text-forest dark:bg-green-900/30 dark:text-green-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}><Icon size={17} strokeWidth={activePage === page ? 2.4 : 1.8} /><span className="flex-1 text-start">{t(page)}</span>{count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1 text-[10px] font-extrabold text-rose-600">{count}</span>}{activePage === page && <span className="h-1.5 w-1.5 rounded-full bg-forest" />}</button>;
          })}</div></div>;
          })}
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
        <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-7 md:py-7">{dataLoading && <div role="status" className="mb-4 rounded-xl bg-green-50 px-4 py-2 text-xs font-bold text-forest">جارٍ تحديث بيانات المخزون…</div>}{dataError && <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">{dataError}</div>}{(rolePages[user.role].includes(activePage) ? pageRenderers[activePage] : renderDashboard)()}</main>
      </div>
    </div>
    {modal?.type === 'product' && <ProductForm product={modal.product} categories={categories} categoryLabel={categoryLabel} t={t} onClose={() => setModal(null)} onSave={saveProduct} />}
    {modal?.type === 'categories' && <CategoryManager categories={categories} t={t} onClose={() => setModal(null)} onSave={saveCategory} onDelete={deleteCategory} />}
    {modal?.type === 'movement' && <MovementForm products={products} productById={productById} getQty={getQty} seedType={modal.seedType} t={t} onClose={() => setModal(null)} onSave={addMovement} />}
    {modal?.type === 'stockCount' && <StockCountForm products={products} t={t} onClose={() => setModal(null)} onSave={createStockCount} />}
    {modal?.type === 'sale' && <SaleForm products={products} customers={customers} getQty={getQty} t={t} onClose={() => setModal(null)} onSave={submitSale} />}
    {modal?.type === 'openCashSession' && <CashSessionOpenForm t={t} onClose={() => setModal(null)} onSave={openCashSession} />}
    {modal?.type === 'closeCashSession' && <CashSessionCloseForm session={modal.session} t={t} onClose={() => setModal(null)} onSave={closeCashSession} />}
    {modal?.type === 'salesReturn' && <SalesReturnForm sale={modal.sale} t={t} onClose={() => setModal(null)} onSave={requestSaleReturn} />}
    {modal?.type === 'verifyReturn' && <SalesReturnVerifyForm item={modal.item} t={t} onClose={() => setModal(null)} onSave={verifySalesReturn} />}
    {modal?.type === 'batch' && <BatchForm products={products} t={t} onClose={() => setModal(null)} onSave={createBatch} />}
    {modal?.type === 'readyProposal' && <ReadyProposalForm batch={modal.item} t={t} onClose={() => setModal(null)} onSave={proposeBatchReady} />}
    {modal?.type === 'productionTask' && <ProductionTaskForm workers={productionWorkers} batches={batches} t={t} onClose={() => setModal(null)} onSave={createProductionTask} />}
    {modal?.type === 'productionTaskUpdate' && <ProductionTaskUpdateForm task={modal.item} status={modal.status} t={t} onClose={() => setModal(null)} onSave={updateProductionTask} />}
    {modal?.type === 'productionCare' && <ProductionCareForm batch={modal.item} t={t} onClose={() => setModal(null)} onSave={recordProductionCare} />}
    {modal?.type === 'productionLoss' && <ProductionLossForm batch={modal.item} t={t} onClose={() => setModal(null)} onSave={reportProductionLoss} />}
    {modal?.type === 'order' && <OrderForm initialProductId={modal.productId} suppliers={suppliers} products={products} supplierQuotes={supplierQuotes} t={t} onClose={() => setModal(null)} onSave={createPurchaseOrder} />}
    {modal?.type === 'supplier' && <SupplierForm item={modal.item} t={t} onClose={() => setModal(null)} onSave={saveSupplier} />}
    {modal?.type === 'supplierQuote' && <SupplierQuoteForm suppliers={suppliers} products={products} t={t} onClose={() => setModal(null)} onSave={createSupplierQuote} />}
    {modal?.type === 'supplierInvoice' && <SupplierInvoiceForm suppliers={suppliers} orders={orders} t={t} onClose={() => setModal(null)} onSave={recordSupplierInvoice} />}
    {modal?.type === 'expense' && <ExpenseForm t={t} onClose={() => setModal(null)} onSave={recordExpense} />}
    {modal?.type === 'accountingPayment' && <AccountingPaymentForm document={modal.document} documentType={modal.documentType} cashSessions={cashSessions} user={user} t={t} onClose={() => setModal(null)} onSave={submitAccountingPayment} />}
    {modal?.type === 'vatRate' && <VatRateForm item={modal.item} t={t} onClose={() => setModal(null)} onSave={saveVatRate} />}
    {modal?.type === 'supplierReturn' && <SupplierReturnForm suppliers={suppliers} products={products} orders={orders} t={t} onClose={() => setModal(null)} onSave={createSupplierReturn} />}
    {modal?.type === 'purchaseReceipt' && <PurchaseReceiptForm order={modal.order} t={t} onClose={() => setModal(null)} onSave={(receipt) => receiveOrder(modal.order, receipt)} />}
    {modal?.type === 'reviewReason' && <ReviewReasonForm item={modal.item} t={t} onClose={() => setModal(null)} onSave={modal.onSave} />}
    {modal?.type === 'payment' && <SalePaymentForm customer={modal.customer} cashSessions={cashSessions} user={user} t={t} onClose={() => setModal(null)} onSave={submitSalePayment} />}
    {modal?.type === 'userEdit' && <UserForm item={modal.item} t={t} onClose={() => setModal(null)} onSave={saveUser} />}
    {modal?.type === 'userPassword' && <UserPasswordForm item={modal.item} t={t} onClose={() => setModal(null)} onSave={resetUserPassword} />}
    {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl"><Check size={16} className="text-green-300" />{notice}</div>}
  </div>;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function buildReportPrintHtml(report, isRtl) {
  const table = (title, headings, rows) => `<section><h2>${escapeHtml(title)}</h2><table><thead><tr>${headings.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((item) => `<td>${escapeHtml(item)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;
  const inventory = report.inventory.map((item) => [
    isRtl ? item.nameAr : item.nameFr,
    item.sku,
    item.quantity,
    item.minimum,
    `${Number(item.stockValue).toFixed(3)} TND`,
  ]);
  const customers = report.salesByCustomer.map((item) => [item.customer, item.count, `${Number(item.total).toFixed(3)} TND`]);
  const daily = report.salesByDay.map((item) => [item.date, item.count, `${Number(item.total).toFixed(3)} TND`]);
  const losses = report.lossesByReason.map((item) => [item.reason, item.quantity, item.entries]);
  return `<!doctype html><html lang="${isRtl ? 'ar' : 'fr'}" dir="${isRtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>Mashtal Ezzahi - Report</title><style>
    body{font-family:Arial,sans-serif;color:#193b28;margin:32px}h1{margin-bottom:4px}p{color:#66736a}.summary{display:flex;gap:24px;flex-wrap:wrap;margin:24px 0}.summary strong{display:block;color:#176b2e;font-size:20px;margin-top:5px}section{margin:28px 0;break-inside:avoid}h2{font-size:16px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{text-align:start;border:1px solid #dfe6df;padding:7px}th{background:#edf5ed}@media print{body{margin:14mm}section{break-inside:auto}tr{break-inside:avoid}}
  </style></head><body><h1>${isRtl ? 'مشتل الزاهي · التقارير' : 'Mashtal Ezzahi · Rapports'}</h1><p>${escapeHtml(report.from)} – ${escapeHtml(report.to)}</p><div class="summary">
    <div>${isRtl ? 'المبيعات' : 'Ventes'}<strong>${Number(report.summary.salesTotal).toFixed(3)} TND</strong></div>
    <div>${isRtl ? 'عدد المبيعات' : 'Nombre de ventes'}<strong>${report.summary.salesCount}</strong></div>
    <div>${isRtl ? 'قيمة المخزون' : 'Valeur du stock'}<strong>${Number(report.summary.inventoryValue).toFixed(3)} TND</strong></div>
    <div>${isRtl ? 'الرصيد الآجل' : 'Crédit restant'}<strong>${Number(report.summary.creditOutstanding).toFixed(3)} TND</strong></div>
    <div>${isRtl ? 'وحدات الفاقد' : 'Pertes (unités)'}<strong>${report.summary.lossUnits}</strong></div>
  </div>
  ${table(isRtl ? 'المخزون الحالي' : 'Stock actuel', [isRtl ? 'المنتج' : 'Produit', 'SKU', isRtl ? 'الكمية' : 'Quantité', isRtl ? 'الحد الأدنى' : 'Minimum', isRtl ? 'قيمة المخزون' : 'Valeur'], inventory)}
  ${table(isRtl ? 'المبيعات حسب العميل' : 'Ventes par client', [isRtl ? 'العميل' : 'Client', isRtl ? 'عدد المبيعات' : 'Ventes', isRtl ? 'الإجمالي' : 'Total'], customers)}
  ${table(isRtl ? 'المبيعات اليومية' : 'Ventes quotidiennes', [isRtl ? 'التاريخ' : 'Date', isRtl ? 'عدد المبيعات' : 'Ventes', isRtl ? 'الإجمالي' : 'Total'], daily)}
  ${table(isRtl ? 'الخسائر حسب السبب' : 'Pertes par motif', [isRtl ? 'السبب' : 'Motif', isRtl ? 'الكمية' : 'Quantité', isRtl ? 'العمليات' : 'Opérations'], losses)}
  </body></html>`;
}

function ReportTable({ title, headers, rows, t }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
    <h2 className="px-5 pt-5 font-extrabold text-slate-800 dark:text-white">{title}</h2>
    <div className="overflow-x-auto"><table className="mt-3 w-full min-w-[420px] text-right text-xs">
      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/70"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell} className="px-4 py-3 text-slate-600 dark:text-slate-200">{value}</td>)}</tr>)}</tbody>
    </table>{!rows.length && <Empty text={t('noResults')} />}</div>
  </section>;
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

function ProductCard({ product, quantity, t, isRtl, categoryLabel, canManage, onEdit, onDelete }) {
  const tone = quantity === 0 ? 'red' : quantity <= product.minimum ? 'amber' : 'green';
  return <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="relative"><ProductPhoto product={product} large />{canManage && <div className="absolute left-2 top-2 flex gap-1 rounded-lg bg-white/90 p-1"><IconButton label={t('edit')} onClick={onEdit}><Settings2 size={15} /></IconButton><IconButton label={t('delete')} onClick={onDelete}><MoreHorizontal size={16} /></IconButton></div>}</div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-extrabold text-slate-800 dark:text-white">{isRtl ? product.nameAr : product.nameFr}</p><p className="mt-1 text-[10px] text-slate-400">{product.scientific || categoryLabel(product.category)}</p></div><Badge tone={tone}>{quantity === 0 ? t('out') : quantity <= product.minimum ? t('low') : t('available')}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-700"><div><p className="text-[10px] text-slate-400">{t('price')}</p><p className="mt-1 font-extrabold text-forest">{currency(product.salePrice)}</p></div><div><p className="text-[10px] text-slate-400">{t('quantity')}</p><p className="mt-1 font-extrabold text-slate-700 dark:text-slate-100">{quantity} <span className="font-normal text-slate-400">/ {product.minimum} min</span></p></div><div className="col-span-2 flex justify-between text-[10px] text-slate-400"><span>{categoryLabel(product.category)} · {product.size}</span><span>{product.location}</span></div></div></div></article>;
}

function Field({ label, children, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>{children}</label>;
}

const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none transition focus:border-green-500 focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:bg-slate-700';
const selectClass = inputClass;
function FormActions({ onClose, t, submitLabel, disabled = false }) {
  return <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 dark:border-slate-600">{t('cancel')}</button><button type="submit" disabled={disabled} className="rounded-xl bg-forest px-5 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitLabel || t('save')}</button></div>;
}

function ProductForm({ product, categories, categoryLabel, t, onClose, onSave }) {
  const [form, setForm] = useState(product || { nameAr: '', nameFr: '', scientific: '', category: categories[0]?.nameAr || '', size: '3L', purchasePrice: '', salePrice: '', minimum: 10, location: 'مشتل 1', image: '', initialQuantity: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={product ? `${t('edit')} ${t('product')}` : t('addProduct')} onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="grid gap-4 sm:grid-cols-2">
    <Field label={t('nameAr')}><input required value={form.nameAr} onChange={update('nameAr')} className={inputClass} /></Field><Field label={t('nameFr')}><input required value={form.nameFr} onChange={update('nameFr')} className={inputClass} /></Field>
    <Field label={t('scientific')}><input value={form.scientific || ''} onChange={update('scientific')} className={inputClass} /></Field><Field label={t('category')}><select required disabled={!categories.length} value={form.category || ''} onChange={update('category')} className={selectClass}>{categories.map((category) => <option key={category.id} value={category.nameAr}>{categoryLabel(category.nameAr)}</option>)}</select></Field>
    <Field label={t('size')}><select value={form.size} onChange={update('size')} className={selectClass}>{['1L', '3L', '10L', '20L', 'صينية', 'قطعة', 'كيس', 'ظرف'].map((size) => <option key={size}>{size}</option>)}</select></Field><Field label={t('location')}><select value={form.location} onChange={update('location')} className={selectClass}>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>
    <Field label={t('purchasePrice')}><input required type="number" step="0.001" min="0" value={form.purchasePrice} onChange={update('purchasePrice')} className={inputClass} /></Field><Field label={t('salePrice')}><input required type="number" step="0.001" min="0" value={form.salePrice} onChange={update('salePrice')} className={inputClass} /></Field>
    <Field label={t('minStock')}><input required type="number" min="0" value={form.minimum} onChange={update('minimum')} className={inputClass} /></Field>{!product && <Field label={`${t('quantity')} · رصيد افتتاحي`}><input type="number" min="0" value={form.initialQuantity} onChange={update('initialQuantity')} className={inputClass} /></Field>}
    <Field label={t('imageUrl')} className={!product ? '' : 'sm:col-span-2'}><input value={form.image || ''} onChange={update('image')} className={inputClass} dir="ltr" /></Field>
  </div><FormActions onClose={onClose} t={t} /></form></Modal>;
}

function CategoryManager({ categories, t, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ nameAr: '', nameFr: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSave({ ...form, id: editing?.id });
      if (!editing) setForm({ nameAr: '', nameFr: '' });
      setEditing(null);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };
  const startEditing = (category) => {
    setEditing(category);
    setForm({ nameAr: category.nameAr, nameFr: category.nameFr });
    setError('');
  };
  const remove = async (category) => {
    setError('');
    try {
      await onDelete(category);
      if (editing?.id === category.id) {
        setEditing(null);
        setForm({ nameAr: '', nameFr: '' });
      }
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return <Modal title={t('manageCategories')} onClose={onClose}>
    <form onSubmit={submit} className="mb-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
      <h3 className="mb-3 text-sm font-extrabold text-slate-700 dark:text-white">{editing ? t('editCategory') : t('addCategory')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('nameAr')}><input required minLength="2" maxLength="80" value={form.nameAr} onChange={update('nameAr')} className={inputClass} /></Field>
        <Field label={t('nameFr')}><input required minLength="2" maxLength="80" value={form.nameFr} onChange={update('nameFr')} className={inputClass} dir="ltr" /></Field>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        {editing && <button type="button" onClick={() => { setEditing(null); setForm({ nameAr: '', nameFr: '' }); setError(''); }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500">{t('cancel')}</button>}
        <button type="submit" disabled={busy} className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? t('loading') : editing ? t('save') : t('addCategory')}</button>
      </div>
    </form>
    <div className="max-h-72 space-y-2 overflow-y-auto">
      {categories.map((category) => <div key={category.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-700 dark:text-white">{category.nameAr}</p><p dir="ltr" className="truncate text-xs text-slate-400">{category.nameFr}</p></div>
        <button type="button" aria-label={`${t('editCategory')} ${category.nameAr}`} onClick={() => startEditing(category)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-white">{t('edit')}</button>
        <button type="button" aria-label={`${t('delete')} ${category.nameAr}`} onClick={() => remove(category)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{t('delete')}</button>
      </div>)}
      {!categories.length && <Empty text={t('noResults')} />}
    </div>
  </Modal>;
}

function movementTypeLabel(type, t) {
  return ({ 'Purchase IN': t('purchaseIn'), 'Production IN': t('productionIn'), 'Sale OUT': t('saleOut'), 'Loss OUT': t('lossOut'), 'Internal issue OUT': t('internalIssue'), Adjustment: t('adjustment'), 'Adjustment IN': t('adjustment'), 'Adjustment OUT': t('adjustment'), Transfer: t('transfer') })[type] || type;
}

function MovementForm({ products, productById, getQty, seedType, t, onClose, onSave }) {
  const [form, setForm] = useState({ productId: '', type: seedType || 'Loss OUT', quantity: '', date: new Date().toISOString().slice(0, 10), reason: '', location: '', fromLocation: '', toLocation: '', reference: '' });
  const product = productById(form.productId);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('newMovement')} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="grid gap-4 sm:grid-cols-2">
    <Field label={t('productName')} className="sm:col-span-2"><select required value={form.productId} onChange={update('productId')} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.nameAr} · {p.size}</option>)}</select></Field>
    <Field label={t('movementType')}><select value={form.type} onChange={update('type')} className={selectClass}>{['Loss OUT', 'Internal issue OUT', 'Transfer'].map((type) => <option key={type} value={type}>{movementTypeLabel(type, t)}</option>)}</select></Field>
    <Field label={t('amount')}><input required type="number" min="1" value={form.quantity} onChange={update('quantity')} className={inputClass} />{product && form.type.endsWith('OUT') && <span className="mt-1 block text-[10px] text-slate-400">المتاح حالياً: {getQty(product.id)}</span>}</Field>
    <Field label={t('date')}><input required type="date" value={form.date} onChange={update('date')} className={inputClass} /></Field>
    <Field label={t('reason')}><input required minLength="3" maxLength="500" value={form.reason} onChange={update('reason')} className={inputClass} placeholder={form.type === 'Transfer' ? 'الموقع أو الملاحظة' : ''} /></Field>
    {form.type === 'Transfer' ? <>
      <Field label="من الموقع"><select required value={form.fromLocation || product?.location || ''} onChange={update('fromLocation')} className={selectClass}><option value="">اختر موقع المصدر</option>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>
      <Field label="إلى الموقع"><select required value={form.toLocation} onChange={update('toLocation')} className={selectClass}><option value="">اختر موقع الوجهة</option>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>
    </> : <Field label={t('location')}><select value={form.location || product?.location || ''} onChange={update('location')} className={selectClass}>{['مشتل 1', 'مشتل 2', 'بيت الظل', 'الساحة A', 'الساحة B', 'المخزن'].map((location) => <option key={location}>{location}</option>)}</select></Field>}
    <Field label={t('reference')}><input value={form.reference} onChange={update('reference')} className={inputClass} /></Field>
  </div><FormActions onClose={onClose} t={t} /></form></Modal>;
}

function SalePaymentForm({ customer, cashSessions, user, t, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const activeSessions = cashSessions.filter((session) => !session.closedAt);
  const [cashSessionId, setCashSessionId] = useState(() => (
    cashSessions.find((session) => session.userId === user.id && !session.closedAt)?.id || activeSessions[0]?.id || ''
  ));
  return <Modal title={`${t('collectPayment')} · ${customer.name}`} onClose={onClose}>
    <div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-bold">{customer.name}</p>
      <p className="mt-1">{t('remaining')}: {currency(customer.credit)}</p>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ customer, amount, note, method, reference, cashSessionId }); }}>
      <div className="grid gap-4">
        <Field label={t('paymentMethod')}><select value={method} onChange={(event) => setMethod(event.target.value)} className={selectClass}><option value="CASH">{t('cash')}</option><option value="BANK_TRANSFER">{t('bankTransfer')}</option><option value="CHEQUE">{t('cheque')}</option></select></Field>
        {method === 'CASH'
          ? <Field label={t('cashSession')}><select required value={cashSessionId} onChange={(event) => setCashSessionId(event.target.value)} className={selectClass}><option value="">{t('sessionRequired')}</option>{activeSessions.map((session) => <option key={session.id} value={session.id}>{session.user.name} · {currency(session.expectedCash)}</option>)}</select></Field>
          : <Field label={t('paymentReference')}><input required maxLength="120" value={reference} onChange={(event) => setReference(event.target.value)} className={inputClass} /></Field>}
        <Field label={t('paymentAmount')}><input required type="number" min="0.001" max={customer.credit} step="0.001" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></Field>
        <Field label={t('paymentNote')}><input maxLength="200" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('recordPayment')} disabled={method === 'CASH' && !cashSessionId} />
    </form>
  </Modal>;
}

function ExpenseForm({ t, onClose, onSave }) {
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    incurredAt: new Date().toISOString().slice(0, 10),
  });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('recordExpense')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
      <div className="grid gap-3">
        <Field label={t('expenseCategory')}><input required maxLength="80" value={form.category} onChange={update('category')} className={inputClass} /></Field>
        <Field label={t('expenseDescription')}><textarea required maxLength="500" value={form.description} onChange={update('description')} className={inputClass} /></Field>
        <Field label={t('moneyAmount')}><input required type="number" min="0.001" step="0.001" value={form.amount} onChange={update('amount')} className={inputClass} /></Field>
        <Field label={t('incurredAt')}><input required type="date" value={form.incurredAt} onChange={update('incurredAt')} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('recordExpense')} />
    </form>
  </Modal>;
}

function AccountingPaymentForm({ document, documentType, cashSessions, user, t, onClose, onSave }) {
  const activeSessions = cashSessions.filter((session) => !session.closedAt);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [cashSessionId, setCashSessionId] = useState(() => (
    cashSessions.find((session) => session.userId === user.id && !session.closedAt)?.id || activeSessions[0]?.id || ''
  ));
  return <Modal title={t(documentType === 'expense' ? 'payExpense' : 'payInvoice')} onClose={onClose}>
    <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-700/50">{t('supplierBalance')}: <b>{currency(document.balance)}</b></div>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ document, documentType, amount, method, reference, cashSessionId }); }}>
      <div className="grid gap-3">
        <Field label={t('paymentMethod')}><select value={method} onChange={(event) => setMethod(event.target.value)} className={selectClass}><option value="CASH">{t('cash')}</option><option value="BANK_TRANSFER">{t('bankTransfer')}</option><option value="CHEQUE">{t('cheque')}</option></select></Field>
        {method === 'CASH'
          ? <Field label={t('cashSession')}><select required value={cashSessionId} onChange={(event) => setCashSessionId(event.target.value)} className={selectClass}><option value="">{t('sessionRequired')}</option>{activeSessions.map((session) => <option key={session.id} value={session.id}>{session.user.name} · {currency(session.expectedCash)}</option>)}</select></Field>
          : <Field label={t('paymentReference')}><input required maxLength="120" value={reference} onChange={(event) => setReference(event.target.value)} className={inputClass} /></Field>}
        <Field label={t('paymentAmount')}><input required type="number" min="0.001" max={document.balance} step="0.001" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t(documentType === 'expense' ? 'payExpense' : 'payInvoice')} disabled={method === 'CASH' && !cashSessionId} />
    </form>
  </Modal>;
}

function VatRateForm({ item, t, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    percentage: item?.percentage ?? '',
    effectiveFrom: item?.effectiveFrom?.slice(0, 10) || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    effectiveTo: item?.effectiveTo?.slice(0, 10) || '',
  });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t(item ? 'edit' : 'addVatRate')} onClose={onClose}>
    <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">{t('vatNotApplied')}</p>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, id: item?.id }); }}>
      <div className="grid gap-3">
        <Field label={t('vatName')}><input required maxLength="80" value={form.name} onChange={update('name')} className={inputClass} /></Field>
        <Field label={t('vatPercentage')}><input required type="number" min="0" max="100" step="0.01" value={form.percentage} onChange={update('percentage')} className={inputClass} /></Field>
        <Field label={t('effectiveFrom')}><input required type="date" value={form.effectiveFrom} onChange={update('effectiveFrom')} className={inputClass} /></Field>
        <Field label={t('effectiveTo')}><input type="date" value={form.effectiveTo} onChange={update('effectiveTo')} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('save')} />
    </form>
  </Modal>;
}

function CashSessionOpenForm({ t, onClose, onSave }) {
  const [openingFloat, setOpeningFloat] = useState('0');
  return <Modal title={t('openCashSession')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ openingFloat }); }}>
      <Field label={t('openingFloat')}><input required type="number" min="0" step="0.001" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('openCashSession')} />
    </form>
  </Modal>;
}

function CashSessionCloseForm({ session, t, onClose, onSave }) {
  const [closingCash, setClosingCash] = useState(String(session.expectedCash));
  return <Modal title={t('closeCashSession')} onClose={onClose}>
    <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-700/50">{t('expectedCash')}: <b>{currency(session.expectedCash)}</b></div>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ session, closingCash }); }}>
      <Field label={t('closingCash')}><input required type="number" min="0" step="0.001" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('closeCashSession')} />
    </form>
  </Modal>;
}

function SalesReturnForm({ sale, t, onClose, onSave }) {
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState(() => sale.lines.map((line) => {
    const alreadyRequested = (sale.returns || [])
      .filter((item) => item.status !== 'REJECTED')
      .flatMap((item) => item.lines)
      .filter((returned) => returned.saleLineId === line.id)
      .reduce((sum, returned) => sum + returned.quantity, 0);
    return { productId: line.productId, productName: line.productName, remaining: line.quantity - alreadyRequested, quantity: 0 };
  }));
  const updateQuantity = (index, value) => setQuantities((current) => current.map((line, i) => i === index ? { ...line, quantity: Number(value) } : line));
  return <Modal title={`${t('requestReturn')} · ${sale.code}`} onClose={onClose} wide>
    <form onSubmit={(event) => {
      event.preventDefault();
      onSave({ sale, reason, lines: quantities.filter((line) => line.quantity > 0) });
    }}>
      <Field label={t('returnReason')}><input required maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} /></Field>
      <div className="mt-4 space-y-3">{quantities.map((line, index) => <div key={line.productId} className="grid grid-cols-[1fr_150px] items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50">
        <div><p className="text-xs font-bold">{line.productName}</p><p className="mt-1 text-[10px] text-slate-500">{t('quantityAvailable')}: {line.remaining}</p></div>
        <Field label={t('quantity')}><input type="number" min="0" max={line.remaining} value={line.quantity} onChange={(event) => updateQuantity(index, event.target.value)} className={inputClass} /></Field>
      </div>)}</div>
      <FormActions onClose={onClose} t={t} submitLabel={t('requestReturn')} disabled={!quantities.some((line) => line.quantity > 0)} />
    </form>
  </Modal>;
}

function SalesReturnVerifyForm({ item, t, onClose, onSave }) {
  const [lines, setLines] = useState(() => item.lines.map((line) => ({
    returnLineId: line.id,
    productName: line.productName,
    quantity: line.quantity,
    restockedQuantity: line.quantity,
  })));
  return <Modal title={`${t('verifyReturn')} · ${item.code}`} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ item, lines: lines.map(({ returnLineId, restockedQuantity }) => ({ returnLineId, restockedQuantity: Number(restockedQuantity) })) }); }}>
      <div className="space-y-3">{lines.map((line, index) => <div key={line.returnLineId} className="grid grid-cols-[1fr_150px] items-end gap-3">
        <div><p className="text-xs font-bold">{line.productName}</p><p className="mt-1 text-[10px] text-slate-500">{t('quantity')}: {line.quantity}</p></div>
        <Field label={t('restockQuantity')}><input required type="number" min="0" max={line.quantity} value={line.restockedQuantity} onChange={(event) => setLines((current) => current.map((item, i) => i === index ? { ...item, restockedQuantity: Number(event.target.value) } : item))} className={inputClass} /></Field>
      </div>)}</div>
      <FormActions onClose={onClose} t={t} submitLabel={t('verifyReturn')} />
    </form>
  </Modal>;
}

function PrintDocument({ sale, kind, t, language, onClose }) {
  const subtotal = sale.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return <main className="min-h-screen bg-white p-6 text-slate-900 sm:p-10">
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex justify-between gap-4 print:hidden"><button onClick={onClose} className="rounded-xl border px-4 py-2 text-xs font-bold">{t('close')}</button><button onClick={() => window.print()} className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white">{t('print')}</button></div>
      <header className="flex items-start justify-between border-b-2 border-slate-800 pb-5">
        <div><h1 className="text-2xl font-extrabold">مشتل الزاهي</h1><p className="mt-1 text-xs text-slate-500">MASHTAL EZZAHI · TUNISIE</p></div>
        <div className="text-end"><h2 className="text-xl font-extrabold">{t(kind)}</h2><p className="mt-2 text-sm" dir="ltr">{sale.code}</p><p className="mt-1 text-xs text-slate-500">{new Date(sale.createdAt).toLocaleDateString(language === 'fr' ? 'fr-TN' : 'ar-TN')}</p></div>
      </header>
      <section className="grid gap-2 border-b py-5 text-sm sm:grid-cols-2"><p><b>{t('customer')}:</b> {sale.customer}</p><p><b>{t('payment')}:</b> {sale.payment === 'paid' ? t('cash') : t('credit')}</p></section>
      <table className="mt-6 w-full text-sm"><thead><tr className="border-b text-start"><th className="py-3 text-start">{t('product')}</th><th className="py-3 text-end">{t('quantity')}</th><th className="py-3 text-end">{t('price')}</th><th className="py-3 text-end">{t('total')}</th></tr></thead>
        <tbody>{sale.lines.map((line) => <tr key={line.id} className="border-b"><td className="py-3">{language === 'fr' ? line.productNameFr || line.productName : line.productName}</td><td className="py-3 text-end">{line.quantity}</td><td className="py-3 text-end">{currency(line.unitPrice)}</td><td className="py-3 text-end">{currency(line.quantity * line.unitPrice)}</td></tr>)}</tbody>
      </table>
      <div className="ms-auto mt-6 max-w-xs space-y-2 text-sm"><p className="flex justify-between"><span>HT</span><b>{currency(subtotal)}</b></p><p className="flex justify-between"><span>TVA</span><b>{currency(0)}</b></p><p className="flex justify-between border-t pt-2 text-base"><span>TTC</span><b>{currency(subtotal)}</b></p></div>
      <p className="mt-4 text-xs text-slate-500">{t('taxFreeNote')}</p>
    </div>
  </main>;
}

function UserForm({ item, t, onClose, onSave }) {
  const [form, setForm] = useState(item
    ? { id: item.id, name: item.name, email: item.email, role: item.role, active: item.active }
    : { name: '', email: '', role: 'NURSERY_WORKER', password: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={item ? t('updateUser') : t('createUser')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
      <div className="grid gap-4">
        <Field label={t('userName')}><input required maxLength="120" value={form.name} onChange={update('name')} className={inputClass} /></Field>
        <Field label={t('userEmail')}><input required type="email" autoComplete="email" value={form.email} onChange={update('email')} className={inputClass} dir="ltr" /></Field>
        <Field label={t('role')}><select value={form.role} onChange={update('role')} className={selectClass}>
          <option value="ADMIN">{t('admin')}</option><option value="STOREKEEPER">{t('storekeeper')}</option><option value="SELLER">{t('seller')}</option><option value="PURCHASING">{t('purchasingRole')}</option><option value="NURSERY_WORKER">{t('nurseryWorker')}</option><option value="ACCOUNTANT">{t('accountant')}</option>{item?.role === 'VIEWER' && <option value="VIEWER">{t('viewer')}</option>}
        </select></Field>
        {item
          ? <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />{t('activeUser')}</label>
          : <Field label={t('initialPassword')}><input required type="password" autoComplete="new-password" minLength="12" value={form.password} onChange={update('password')} className={inputClass} dir="ltr" /></Field>}
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={item ? t('updateUser') : t('createUser')} />
    </form>
  </Modal>;
}

function UserPasswordForm({ item, t, onClose, onSave }) {
  const [password, setPassword] = useState('');
  return <Modal title={`${t('resetPasswordFor')} · ${item.name}`} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ id: item.id, password }); }}>
      <Field label={t('initialPassword')}><input required type="password" autoComplete="new-password" minLength="12" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} dir="ltr" /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('resetPassword')} />
    </form>
  </Modal>;
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
  </div>{payment === 'credit' && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">{t('pendingCredit')}</p>}<div className="mt-5 space-y-3">{lines.map((line, index) => <div key={index} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50 sm:grid-cols-[1fr_130px_120px_36px]"><Field label={t('productName')}><select value={line.productId} onChange={(e) => editLine(index, 'productId', e.target.value)} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.nameAr} · متاح {getQty(p.id)}</option>)}</select></Field><Field label={t('quantity')}><input type="number" min="1" value={line.quantity} onChange={(e) => editLine(index, 'quantity', e.target.value)} className={inputClass} /></Field><div className="pb-2 text-xs font-extrabold text-forest">{currency(Number(line.quantity || 0) * (products.find((p) => p.id === line.productId)?.salePrice || 0))}</div><IconButton label={t('removeLine')} onClick={() => removeLine(index)}><X size={16} /></IconButton></div>)}</div>
    <button type="button" onClick={addLine} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest"><Plus size={15} />{t('addLine')}</button>
    <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20"><span className="text-xs font-bold text-slate-600 dark:text-slate-200">{t('total')}</span><b className="text-lg text-forest">{currency(total)}</b></div><FormActions onClose={onClose} t={t} submitLabel={t('createSale')} /></form></Modal>;
}

function BatchForm({ products, t, onClose, onSave }) {
  const [form, setForm] = useState({ seed: '', productId: '', sowing: new Date().toISOString().slice(0, 10), sown: '', readyDate: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('newBatch')} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, sown: Number(form.sown) }); }}><div className="grid gap-4"><Field label={t('batchSeed')}><input required value={form.seed} onChange={update('seed')} className={inputClass} /></Field><Field label={t('batchProduct')}><select required value={form.productId} onChange={update('productId')} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nameAr}</option>)}</select></Field><Field label={t('sowingDate')}><input required type="date" value={form.sowing} onChange={update('sowing')} className={inputClass} /></Field><Field label={t('sown')}><input required type="number" min="1" value={form.sown} onChange={update('sown')} className={inputClass} /></Field><Field label={t('expectedDate')}><input required type="date" value={form.readyDate} onChange={update('readyDate')} className={inputClass} /></Field></div><FormActions onClose={onClose} t={t} /></form></Modal>;
}

function ProductionTaskForm({ workers, batches, t, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', type: 'WATERING', assignedToId: '', batchId: '', dueAt: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('createTask')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
      <div className="grid gap-3">
        <Field label={t('taskTitle')}><input required minLength="2" maxLength="160" value={form.title} onChange={update('title')} className={inputClass} /></Field>
        <Field label={t('taskType')}><select value={form.type} onChange={update('type')} className={selectClass}>{['PLANTING', 'WATERING', 'FERTILIZING', 'TREATMENT', 'PRUNING', 'INSPECTION', 'OTHER'].map((type) => <option key={type} value={type}>{t(`task${type[0]}${type.slice(1).toLowerCase()}`)}</option>)}</select></Field>
        <Field label={t('assignedWorker')}><select required value={form.assignedToId} onChange={update('assignedToId')} className={selectClass}><option value="">{t('choose')}</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></Field>
        <Field label={t('optionalBatch')}><select value={form.batchId} onChange={update('batchId')} className={selectClass}><option value="">{t('choose')}</option>{batches.filter((batch) => batch.stage !== 'ready').map((batch) => <option key={batch.id} value={batch.id}>{batch.code} · {batch.seed}</option>)}</select></Field>
        <Field label={t('dueDate')}><input type="date" value={form.dueAt} onChange={update('dueAt')} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('createTask')} />
    </form>
  </Modal>;
}

function ProductionTaskUpdateForm({ task, status, t, onClose, onSave }) {
  const [workerNote, setWorkerNote] = useState('');
  return <Modal title={t(status === 'COMPLETED' ? 'completeTask' : 'startTask')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ task, status, workerNote }); }}>
      <p className="mb-4 text-sm font-bold">{task.title}</p>
      <Field label={t('taskNote')}><textarea maxLength="500" value={workerNote} onChange={(event) => setWorkerNote(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t(status === 'COMPLETED' ? 'completeTask' : 'startTask')} />
    </form>
  </Modal>;
}

function ProductionCareForm({ batch, t, onClose, onSave }) {
  const [form, setForm] = useState({ type: 'WATERING', performedAt: new Date().toISOString().slice(0, 10), note: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('careLog')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ batch, ...form }); }}>
      <p className="mb-4 text-xs text-slate-500">{batch.code}</p>
      <div className="grid gap-3">
        <Field label={t('taskType')}><select value={form.type} onChange={update('type')} className={selectClass}>{['WATERING', 'FERTILIZING', 'TREATMENT', 'PRUNING', 'OBSERVATION', 'OTHER'].map((type) => <option key={type} value={type}>{t(`care${type[0]}${type.slice(1).toLowerCase()}`)}</option>)}</select></Field>
        <Field label={t('performedAt')}><input required type="date" value={form.performedAt} onChange={update('performedAt')} className={inputClass} /></Field>
        <Field label={t('taskNote')}><textarea maxLength="500" value={form.note} onChange={update('note')} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('careLog')} />
    </form>
  </Modal>;
}

function ProductionLossForm({ batch, t, onClose, onSave }) {
  const maximum = batch.sown - batch.loss;
  const [form, setForm] = useState({ quantity: String(maximum), reason: '', occurredAt: new Date().toISOString().slice(0, 10) });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t('reportPlantLoss')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ batch, ...form }); }}>
      <p className="mb-4 text-xs text-slate-500">{batch.code} · {t('quantityAvailable')}: {maximum}</p>
      <div className="grid gap-3">
        <Field label={t('quantity')}><input required type="number" min="1" max={maximum} value={form.quantity} onChange={update('quantity')} className={inputClass} /></Field>
        <Field label={t('lossReason')}><textarea required minLength="3" maxLength="500" value={form.reason} onChange={update('reason')} className={inputClass} /></Field>
        <Field label={t('date')}><input required type="date" value={form.occurredAt} onChange={update('occurredAt')} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('reportPlantLoss')} />
    </form>
  </Modal>;
}

function StockCountForm({ products, t, onClose, onSave }) {
  const [form, setForm] = useState({ productId: '', countedQuantity: '', reason: '', location: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const selectedProduct = products.find((product) => product.id === form.productId);
  return <Modal title={t('stockCount')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, location: form.location || selectedProduct?.location || '' }); }}>
      <div className="grid gap-4">
        <Field label={t('productName')}><select required value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value, location: '' }))} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nameAr}</option>)}</select></Field>
        <p className="text-xs text-slate-500">{t('countApprovalHint')}</p>
        <Field label={t('countedQuantity')}><input required type="number" min="0" step="1" value={form.countedQuantity} onChange={update('countedQuantity')} className={inputClass} /></Field>
        <Field label={t('location')}><input required maxLength="120" value={form.location || selectedProduct?.location || ''} onChange={update('location')} className={inputClass} /></Field>
        <Field label={t('reason')}><textarea required minLength="3" maxLength="500" value={form.reason} onChange={update('reason')} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('stockCount')} />
    </form>
  </Modal>;
}

function ReadyProposalForm({ batch, t, onClose, onSave }) {
  const maximum = batch.sown - batch.loss;
  const [quantity, setQuantity] = useState(String(maximum));
  return <Modal title={t('submitReadyProposal')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ batch, quantity }); }}>
      <p className="mb-4 text-xs text-slate-500">{batch.code} · {t('quantity')}: {maximum}</p>
      <Field label={t('readyProposalQuantity')}><input required type="number" min="1" max={maximum} value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('submitReadyProposal')} />
    </form>
  </Modal>;
}

function ReviewReasonForm({ item, t, onClose, onSave }) {
  const [reason, setReason] = useState('');
  return <Modal title={t('reviewReason')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ item, reason }); }}>
      <Field label={t('reviewReason')}><textarea required minLength="3" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('reject')} />
    </form>
  </Modal>;
}

function SupplierForm({ item, t, onClose, onSave }) {
  const [form, setForm] = useState(item
    ? { id: item.id, name: item.name, city: item.city, type: item.type, phone: item.phone, email: item.email || '' }
    : { name: '', city: '', type: '', phone: '', email: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <Modal title={t(item ? 'edit' : 'addSupplier')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
      <div className="grid gap-3">
        <Field label={t('supplier')}><input required minLength="2" maxLength="120" value={form.name} onChange={update('name')} className={inputClass} /></Field>
        <Field label={t('city')}><input required maxLength="120" value={form.city} onChange={update('city')} className={inputClass} /></Field>
        <Field label={t('supplierType')}><input required maxLength="120" value={form.type} onChange={update('type')} className={inputClass} /></Field>
        <Field label={t('phone')}><input required minLength="3" maxLength="40" value={form.phone} onChange={update('phone')} className={inputClass} /></Field>
        <Field label={t('userEmail')}><input type="email" maxLength="254" value={form.email} onChange={update('email')} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('save')} />
    </form>
  </Modal>;
}

function SupplierQuoteForm({ suppliers, products, t, onClose, onSave }) {
  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([{ productId: '', unitPrice: '' }]);
  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  return <Modal title={t('recordQuote')} onClose={onClose} wide>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ supplierId, reference, quoteDate, validUntil, note, lines }); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('supplier')}><select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={selectClass}><option value="">{t('selectSupplier')}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label={t('quoteReference')}><input required maxLength="120" value={reference} onChange={(event) => setReference(event.target.value)} className={inputClass} /></Field>
        <Field label={t('quoteDate')}><input type="date" value={quoteDate} onChange={(event) => setQuoteDate(event.target.value)} className={inputClass} /></Field>
        <Field label={t('validUntil')}><input type="date" min={quoteDate} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className={inputClass} /></Field>
      </div>
      <div className="mt-4 space-y-3">{lines.map((line, index) => <div key={index} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50 sm:grid-cols-[1fr_180px_36px]">
        <Field label={t('productName')}><select required value={line.productId} onChange={(event) => updateLine(index, 'productId', event.target.value)} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select></Field>
        <Field label={t('purchasePrice')}><input required type="number" min="0" step="0.001" value={line.unitPrice} onChange={(event) => updateLine(index, 'unitPrice', event.target.value)} className={inputClass} /></Field>
        <IconButton label={t('removeLine')} onClick={() => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}><X size={16} /></IconButton>
      </div>)}</div>
      <button type="button" onClick={() => setLines((current) => [...current, { productId: '', unitPrice: '' }])} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest"><Plus size={15} />{t('addLine')}</button>
      <Field label={t('paymentNote')} className="mt-4"><textarea maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('recordQuote')} />
    </form>
  </Modal>;
}

function SupplierInvoiceForm({ suppliers, orders, t, onClose, onSave }) {
  const [supplierId, setSupplierId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [reference, setReference] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [note, setNote] = useState('');
  const supplierOrders = orders.filter((order) => order.supplierId === supplierId);
  return <Modal title={t('recordInvoice')} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ supplierId, purchaseOrderId, reference, totalAmount, invoiceDate, note }); }}>
      <p className="mb-4 text-xs text-slate-500">{t('vatNotApplied')}</p>
      <div className="grid gap-3">
        <Field label={t('supplier')}><select required value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPurchaseOrderId(''); }} className={selectClass}><option value="">{t('selectSupplier')}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label={t('purchaseOrders')}><select value={purchaseOrderId} onChange={(event) => setPurchaseOrderId(event.target.value)} className={selectClass}><option value="">{t('all')}</option>{supplierOrders.map((order) => <option key={order.id} value={order.id}>{order.code}</option>)}</select></Field>
        <Field label={t('invoiceReference')}><input required maxLength="120" value={reference} onChange={(event) => setReference(event.target.value)} className={inputClass} /></Field>
        <Field label={t('invoiceAmount')}><input required type="number" min="0.001" step="0.001" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} className={inputClass} /></Field>
        <Field label={t('invoiceDate')}><input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} className={inputClass} /></Field>
        <Field label={t('paymentNote')}><textarea maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} /></Field>
      </div>
      <FormActions onClose={onClose} t={t} submitLabel={t('recordInvoice')} />
    </form>
  </Modal>;
}

function SupplierReturnForm({ suppliers, products, orders, t, onClose, onSave }) {
  const [supplierId, setSupplierId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const supplierOrders = orders.filter((order) => order.supplierId === supplierId);
  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  return <Modal title={t('requestSupplierReturn')} onClose={onClose} wide>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ supplierId, purchaseOrderId, supplierReference, reason, note, lines }); }}>
      <p className="mb-4 text-xs text-slate-500">{t('noReturnStockPosting')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('supplier')}><select required value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPurchaseOrderId(''); }} className={selectClass}><option value="">{t('selectSupplier')}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label={t('purchaseOrders')}><select value={purchaseOrderId} onChange={(event) => setPurchaseOrderId(event.target.value)} className={selectClass}><option value="">{t('all')}</option>{supplierOrders.map((order) => <option key={order.id} value={order.id}>{order.code}</option>)}</select></Field>
        <Field label={t('supplierReference')}><input maxLength="120" value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} className={inputClass} /></Field>
        <Field label={t('returnReason')}><input required minLength="3" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} /></Field>
      </div>
      <div className="mt-4 space-y-3">{lines.map((line, index) => <div key={index} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50 sm:grid-cols-[1fr_130px_36px]">
        <Field label={t('productName')}><select required value={line.productId} onChange={(event) => updateLine(index, 'productId', event.target.value)} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select></Field>
        <Field label={t('quantity')}><input required type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} className={inputClass} /></Field>
        <IconButton label={t('removeLine')} onClick={() => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}><X size={16} /></IconButton>
      </div>)}</div>
      <button type="button" onClick={() => setLines((current) => [...current, { productId: '', quantity: 1 }])} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest"><Plus size={15} />{t('addLine')}</button>
      <Field label={t('paymentNote')} className="mt-4"><textarea maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('requestSupplierReturn')} />
    </form>
  </Modal>;
}

function OrderForm({ initialProductId = '', suppliers, products, supplierQuotes, t, onClose, onSave }) {
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState([{ productId: initialProductId, quantity: 1, supplierQuoteLineId: '' }]);
  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const quoteLines = supplierQuotes.filter((quote) => quote.supplierId === supplierId
    && (!quote.validUntil || quote.validUntil.slice(0, 10) >= new Date().toISOString().slice(0, 10)))
    .flatMap((quote) => quote.lines.map((line) => ({ ...line, reference: quote.reference })));
  const priceFor = (line) => {
    const quoteLine = quoteLines.find((item) => item.id === line.supplierQuoteLineId && item.productId === line.productId);
    return Number(quoteLine?.unitPrice ?? products.find((item) => item.id === line.productId)?.purchasePrice ?? 0);
  };
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * priceFor(line), 0);
  return <Modal title={t('newPurchase')} onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); onSave({ supplierId, lines }); }}>
    <Field label={t('supplier')}><select required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setLines((current) => current.map((line) => ({ ...line, supplierQuoteLineId: '' }))); }} className={selectClass}><option value="">{t('selectSupplier')}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <div className="mt-4 space-y-3">{lines.map((line, index) => <div key={index} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50 sm:grid-cols-[1fr_110px_1fr_100px_36px]">
      <Field label={t('productName')}><select required value={line.productId} onChange={(e) => setLines((current) => current.map((item, i) => i === index ? { ...item, productId: e.target.value, supplierQuoteLineId: '' } : item))} className={selectClass}><option value="">{t('selectProduct')}</option>{products.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select></Field>
      <Field label={t('quantity')}><input required type="number" min="1" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} className={inputClass} /></Field>
      <Field label={t('selectQuote')}><select value={line.supplierQuoteLineId} onChange={(event) => updateLine(index, 'supplierQuoteLineId', event.target.value)} className={selectClass}><option value="">{t('useProductPrice')}</option>{quoteLines.filter((item) => item.productId === line.productId).map((item) => <option key={item.id} value={item.id}>{item.reference} · {currency(Number(item.unitPrice))}</option>)}</select></Field>
      <div className="pb-2 text-xs font-extrabold text-forest">{currency(Number(line.quantity || 0) * priceFor(line))}</div>
      <IconButton label={t('removeLine')} onClick={() => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}><X size={16} /></IconButton>
    </div>)}</div>
    <button type="button" onClick={() => setLines((current) => [...current, { productId: '', quantity: 1, supplierQuoteLineId: '' }])} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-forest"><Plus size={15} />{t('addLine')}</button>
    <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20"><span className="text-xs font-bold text-slate-600 dark:text-slate-200">{t('total')}</span><b className="text-lg text-forest">{currency(total)}</b></div>
    <FormActions onClose={onClose} t={t} submitLabel={t('createOrder')} />
  </form></Modal>;
}

function PurchaseReceiptForm({ order, t, onClose, onSave }) {
  const [lines, setLines] = useState(() => order.linesData.map((line) => ({
    ...line,
    orderLineId: line.id,
    receivedQuantity: '0',
    damagedQuantity: '0',
  })));
  const [note, setNote] = useState('');
  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => {
    if (i !== index) return line;
    const updated = { ...line, [key]: value };
    if (key === 'receivedQuantity' && Number(updated.damagedQuantity) > Number(value)) updated.damagedQuantity = value;
    return updated;
  }));
  const hasReceivedUnits = lines.some((line) => Number(line.receivedQuantity) > 0);
  return <Modal title={`${t('receive')} · ${order.code}`} onClose={onClose} wide>
    <form onSubmit={(event) => {
      event.preventDefault();
      onSave({
        lines: lines.filter((line) => Number(line.receivedQuantity) > 0),
        note,
      });
    }}>
      <div className="space-y-3">
        {lines.map((line, index) => <div key={line.id} className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50 sm:grid-cols-[1fr_100px_100px_110px]">
          <div className="self-center text-xs font-bold">{line.productName}<p className="mt-1 font-normal text-slate-500">{t('quantity')}: {line.quantity} · {t('receivedQuantity')}: {line.quantity - line.remainingQuantity} · {t('remaining')}: {line.remainingQuantity}</p></div>
          <Field label={t('receivedQuantity')}><input required type="number" min="0" max={line.remainingQuantity} value={line.receivedQuantity} onChange={(event) => updateLine(index, 'receivedQuantity', event.target.value)} className={inputClass} /></Field>
          <Field label={t('damagedQuantity')}><input required type="number" min="0" max={line.receivedQuantity} value={line.damagedQuantity} onChange={(event) => updateLine(index, 'damagedQuantity', event.target.value)} className={inputClass} /></Field>
        </div>)}
      </div>
      <Field label={t('receiptNote')} className="mt-4"><textarea maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} /></Field>
      <FormActions onClose={onClose} t={t} submitLabel={t('receive')} disabled={!hasReceivedUnits} />
    </form>
  </Modal>;
}

function BatchBadge({ stage, t }) {
  const tone = { sowing: 'amber', germination: 'blue', growing: 'green', ready: 'green' }[stage] || 'gray';
  return <Badge tone={tone}>{t(`productionStage${stage[0].toUpperCase()}${stage.slice(1)}`)}</Badge>;
}
function OrderBadge({ status, t }) {
  const label = status === 'Pending approval' ? t('pendingApproval')
    : status === 'Approved' ? t('approved')
      : status === 'Rejected' ? t('rejected')
        : status === 'Partially received' ? t('partiallyReceived')
          : t(status.toLowerCase());
  const tone = status === 'Received' || status === 'Approved' ? 'green'
    : status === 'Sent' || status === 'Partially received' ? 'blue'
      : status === 'Rejected' ? 'red'
        : 'amber';
  return <Badge tone={tone}>{label}</Badge>;
}
function MiniStat({ title, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-400">{title}</p><p className="mt-2 text-xl font-extrabold text-slate-800 dark:text-white">{value}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-forest"><Icon size={19} /></span></div></div>;
}
function customerTypeLabel(type, t) {
  return ({ فرد: t('individual'), بستاني: t('landscaper'), بلدية: t('municipality') })[type] || type;
}
