"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var DashboardService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var DashboardService = _classThis = /** @class */ (function () {
        function DashboardService_1(prisma) {
            this.prisma = prisma;
        }
        // MÉTRICAS PRINCIPALES (KPIs)
        DashboardService_1.prototype.getMainMetrics = function () {
            return __awaiter(this, void 0, void 0, function () {
                var hoy, mañana, hace7Dias, hace30Dias, ventasHoy, ventasSemana, ventasMes, suscripcionesActivas, clientesTotales, stockDisponible;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            mañana = new Date(hoy);
                            mañana.setDate(mañana.getDate() + 1);
                            hace7Dias = new Date(hoy);
                            hace7Dias.setDate(hace7Dias.getDate() - 7);
                            hace30Dias = new Date(hoy);
                            hace30Dias.setDate(hace30Dias.getDate() - 30);
                            return [4 /*yield*/, this.prisma.order.aggregate({
                                    where: {
                                        estado: client_1.OrderStatus.PAGADO,
                                        createdAt: { gte: hoy, lt: mañana },
                                    },
                                    _sum: { total: true },
                                    _count: true,
                                })];
                        case 1:
                            ventasHoy = _d.sent();
                            return [4 /*yield*/, this.prisma.order.aggregate({
                                    where: {
                                        estado: client_1.OrderStatus.PAGADO,
                                        createdAt: { gte: hace7Dias },
                                    },
                                    _sum: { total: true },
                                    _count: true,
                                })];
                        case 2:
                            ventasSemana = _d.sent();
                            return [4 /*yield*/, this.prisma.order.aggregate({
                                    where: {
                                        estado: client_1.OrderStatus.PAGADO,
                                        createdAt: { gte: hace30Dias },
                                    },
                                    _sum: { total: true },
                                    _count: true,
                                })];
                        case 3:
                            ventasMes = _d.sent();
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: { estado: client_1.SubscriptionStatus.ACTIVA },
                                })];
                        case 4:
                            suscripcionesActivas = _d.sent();
                            return [4 /*yield*/, this.prisma.customer.count()];
                        case 5:
                            clientesTotales = _d.sent();
                            return [4 /*yield*/, this.prisma.account.count({
                                    where: { estado: client_1.AccountStatus.DISPONIBLE },
                                })];
                        case 6:
                            stockDisponible = _d.sent();
                            return [2 /*return*/, {
                                    ventasHoy: {
                                        total: ((_a = ventasHoy._sum.total) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0,
                                        cantidad: ventasHoy._count,
                                    },
                                    ventasSemana: {
                                        total: ((_b = ventasSemana._sum.total) === null || _b === void 0 ? void 0 : _b.toNumber()) || 0,
                                        cantidad: ventasSemana._count,
                                    },
                                    ventasMes: {
                                        total: ((_c = ventasMes._sum.total) === null || _c === void 0 ? void 0 : _c.toNumber()) || 0,
                                        cantidad: ventasMes._count,
                                    },
                                    suscripcionesActivas: suscripcionesActivas,
                                    clientesTotales: clientesTotales,
                                    stockDisponible: stockDisponible,
                                }];
                    }
                });
            });
        };
        // SUSCRIPCIONES POR ESTADO
        DashboardService_1.prototype.getSubscriptionsByStatus = function () {
            return __awaiter(this, void 0, void 0, function () {
                var hoy, en3Dias, activas, porVencer, vencidas, enGarantia;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            en3Dias = new Date(hoy);
                            en3Dias.setDate(en3Dias.getDate() + 3);
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: { estado: client_1.SubscriptionStatus.ACTIVA },
                                })];
                        case 1:
                            activas = _a.sent();
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: {
                                        estado: client_1.SubscriptionStatus.ACTIVA,
                                        fechaVencimiento: { gte: hoy, lte: en3Dias },
                                    },
                                })];
                        case 2:
                            porVencer = _a.sent();
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: {
                                        estado: client_1.SubscriptionStatus.ACTIVA,
                                        fechaVencimiento: { lt: hoy },
                                    },
                                })];
                        case 3:
                            vencidas = _a.sent();
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: { estado: client_1.SubscriptionStatus.EN_GARANTIA },
                                })];
                        case 4:
                            enGarantia = _a.sent();
                            return [2 /*return*/, {
                                    activas: activas,
                                    porVencer: porVencer,
                                    vencidas: vencidas,
                                    enGarantia: enGarantia,
                                }];
                    }
                });
            });
        };
        // STOCK POR PLATAFORMA
        DashboardService_1.prototype.getStockByPlatform = function () {
            return __awaiter(this, void 0, void 0, function () {
                var platforms;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.service.findMany({
                                where: { activo: true },
                                include: {
                                    plans: {
                                        where: { activo: true },
                                        include: {
                                            accounts: {
                                                where: { estado: client_1.AccountStatus.DISPONIBLE },
                                                select: { id: true },
                                            },
                                        },
                                    },
                                },
                            })];
                        case 1:
                            platforms = _a.sent();
                            return [2 /*return*/, platforms.map(function (platform) {
                                    var totalDisponible = platform.plans.reduce(function (sum, plan) { return sum + plan.accounts.length; }, 0);
                                    return {
                                        id: platform.id,
                                        nombre: platform.nombre,
                                        logoUrl: platform.logoUrl,
                                        stockDisponible: totalDisponible,
                                        planes: platform.plans.map(function (plan) { return ({
                                            id: plan.id,
                                            nombre: plan.nombrePlan,
                                            precio: plan.precio,
                                            disponibles: plan.accounts.length,
                                        }); }),
                                    };
                                })];
                    }
                });
            });
        };
        // ALERTAS CRÍTICAS
        DashboardService_1.prototype.getCriticalAlerts = function () {
            return __awaiter(this, void 0, void 0, function () {
                var hoy, en3Dias, porVencerPronto, ordenesPendientes, ticketsAbiertos, lotesProblematicos, stockBajo, planesConStockBajo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            en3Dias = new Date(hoy);
                            en3Dias.setDate(en3Dias.getDate() + 3);
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: {
                                        estado: client_1.SubscriptionStatus.ACTIVA,
                                        fechaVencimiento: { gte: hoy, lte: en3Dias },
                                    },
                                })];
                        case 1:
                            porVencerPronto = _a.sent();
                            return [4 /*yield*/, this.prisma.order.count({
                                    where: { estado: client_1.OrderStatus.PENDIENTE },
                                })];
                        case 2:
                            ordenesPendientes = _a.sent();
                            return [4 /*yield*/, this.prisma.supportTicket.count({
                                    where: { estado: 'pendiente_revision' },
                                })];
                        case 3:
                            ticketsAbiertos = _a.sent();
                            return [4 /*yield*/, this.prisma.supplierBatch.findMany({
                                    where: {
                                        tasaFalloActual: { gt: 15 }, // Más del 15% de fallos
                                        estadoLote: 'activo',
                                    },
                                    select: {
                                        id: true,
                                        proveedorNombre: true,
                                        tasaFalloActual: true,
                                    },
                                })];
                        case 4:
                            lotesProblematicos = _a.sent();
                            return [4 /*yield*/, this.prisma.plan.findMany({
                                    where: { activo: true },
                                    include: {
                                        accounts: {
                                            where: { estado: client_1.AccountStatus.DISPONIBLE },
                                            select: { id: true },
                                        },
                                        service: { select: { nombre: true } },
                                    },
                                })];
                        case 5:
                            stockBajo = _a.sent();
                            planesConStockBajo = stockBajo
                                .filter(function (plan) { return plan.accounts.length < 5 && plan.accounts.length > 0; })
                                .map(function (plan) { return ({
                                planId: plan.id,
                                servicio: plan.service.nombre,
                                plan: plan.nombrePlan,
                                disponibles: plan.accounts.length,
                            }); });
                            return [2 /*return*/, {
                                    porVencerPronto: porVencerPronto,
                                    ordenesPendientes: ordenesPendientes,
                                    ticketsAbiertos: ticketsAbiertos,
                                    lotesProblematicos: lotesProblematicos,
                                    planesConStockBajo: planesConStockBajo,
                                }];
                    }
                });
            });
        };
        // VENTAS POR DÍA (Últimos 30 días)
        DashboardService_1.prototype.getSalesTrend = function () {
            return __awaiter(this, void 0, void 0, function () {
                var hace30Dias, orders, ventasPorDia;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            hace30Dias = new Date();
                            hace30Dias.setDate(hace30Dias.getDate() - 30);
                            return [4 /*yield*/, this.prisma.order.findMany({
                                    where: {
                                        estado: client_1.OrderStatus.PAGADO,
                                        createdAt: { gte: hace30Dias },
                                    },
                                    select: {
                                        total: true,
                                        createdAt: true,
                                    },
                                    orderBy: { createdAt: 'asc' },
                                })];
                        case 1:
                            orders = _a.sent();
                            ventasPorDia = orders.reduce(function (acc, order) {
                                var fecha = order.createdAt.toISOString().split('T')[0];
                                if (!acc[fecha]) {
                                    acc[fecha] = { fecha: fecha, total: 0, cantidad: 0 };
                                }
                                acc[fecha].total += order.total.toNumber();
                                acc[fecha].cantidad += 1;
                                return acc;
                            }, {});
                            return [2 /*return*/, Object.values(ventasPorDia)];
                    }
                });
            });
        };
        // TOP PLATAFORMAS MÁS VENDIDAS
        DashboardService_1.prototype.getTopPlatforms = function () {
            return __awaiter(this, void 0, void 0, function () {
                var hace30Dias, topPlatforms, enriched;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            hace30Dias = new Date();
                            hace30Dias.setDate(hace30Dias.getDate() - 30);
                            return [4 /*yield*/, this.prisma.orderItem.groupBy({
                                    by: ['planId'],
                                    where: {
                                        order: {
                                            estado: client_1.OrderStatus.PAGADO,
                                            createdAt: { gte: hace30Dias },
                                        },
                                    },
                                    _sum: { cantidad: true, subtotal: true },
                                    orderBy: { _sum: { subtotal: 'desc' } },
                                    take: 5,
                                })];
                        case 1:
                            topPlatforms = _a.sent();
                            return [4 /*yield*/, Promise.all(topPlatforms.map(function (item) { return __awaiter(_this, void 0, void 0, function () {
                                    var plan;
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0: return [4 /*yield*/, this.prisma.plan.findUnique({
                                                    where: { id: item.planId },
                                                    include: { service: true },
                                                })];
                                            case 1:
                                                plan = _b.sent();
                                                return [2 /*return*/, {
                                                        servicio: (plan === null || plan === void 0 ? void 0 : plan.service.nombre) || 'Desconocido',
                                                        plan: (plan === null || plan === void 0 ? void 0 : plan.nombrePlan) || 'Desconocido',
                                                        cantidadVendida: item._sum.cantidad || 0,
                                                        totalIngresos: ((_a = item._sum.subtotal) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0,
                                                    }];
                                        }
                                    });
                                }); }))];
                        case 2:
                            enriched = _a.sent();
                            return [2 /*return*/, enriched];
                    }
                });
            });
        };
        // DASHBOARD COMPLETO (Todo en una llamada)
        DashboardService_1.prototype.getFullDashboard = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, metrics, subscriptions, stock, alerts, trend, topPlatforms;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.getMainMetrics(),
                                this.getSubscriptionsByStatus(),
                                this.getStockByPlatform(),
                                this.getCriticalAlerts(),
                                this.getSalesTrend(),
                                this.getTopPlatforms(),
                            ])];
                        case 1:
                            _a = _b.sent(), metrics = _a[0], subscriptions = _a[1], stock = _a[2], alerts = _a[3], trend = _a[4], topPlatforms = _a[5];
                            return [2 /*return*/, {
                                    metrics: metrics,
                                    subscriptions: subscriptions,
                                    stock: stock,
                                    alerts: alerts,
                                    trend: trend,
                                    topPlatforms: topPlatforms,
                                    generatedAt: new Date(),
                                }];
                    }
                });
            });
        };
        return DashboardService_1;
    }());
    __setFunctionName(_classThis, "DashboardService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DashboardService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DashboardService = _classThis;
}();
exports.DashboardService = DashboardService;
