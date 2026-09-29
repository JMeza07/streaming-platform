"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.OrdersService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var OrdersService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var OrdersService = _classThis = /** @class */ (function () {
        function OrdersService_1(prisma, accountsService, whatsappService) {
            this.prisma = prisma;
            this.accountsService = accountsService;
            this.whatsappService = whatsappService;
        }
        // CREAR ORDEN (Checkout)
        OrdersService_1.prototype.createOrder = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var customer, total, itemsData, _i, _a, item, plan, stockDisponible, subtotal, order;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.customer.findUnique({
                                where: { id: dto.customerId },
                                include: { user: true },
                            })];
                        case 1:
                            customer = _b.sent();
                            if (!customer)
                                throw new common_1.NotFoundException('Cliente no encontrado');
                            total = 0;
                            itemsData = [];
                            _i = 0, _a = dto.items;
                            _b.label = 2;
                        case 2:
                            if (!(_i < _a.length)) return [3 /*break*/, 6];
                            item = _a[_i];
                            return [4 /*yield*/, this.prisma.plan.findUnique({
                                    where: { id: item.planId },
                                    include: { service: true },
                                })];
                        case 3:
                            plan = _b.sent();
                            if (!plan || !plan.activo)
                                throw new common_1.NotFoundException("Plan ".concat(item.planId, " no disponible"));
                            return [4 /*yield*/, this.prisma.account.count({
                                    where: { planId: item.planId, estado: client_1.AccountStatus.DISPONIBLE },
                                })];
                        case 4:
                            stockDisponible = _b.sent();
                            if (stockDisponible < item.cantidad) {
                                throw new common_1.BadRequestException("Stock insuficiente para ".concat(plan.nombrePlan, ". Disponibles: ").concat(stockDisponible));
                            }
                            subtotal = plan.precio.toNumber() * item.cantidad;
                            total += subtotal;
                            itemsData.push({
                                planId: item.planId,
                                cantidad: item.cantidad,
                                precioUnitario: plan.precio,
                                subtotal: subtotal,
                            });
                            _b.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 2];
                        case 6: return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var newOrder;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.order.create({
                                                data: {
                                                    customerId: dto.customerId,
                                                    total: total,
                                                    estado: client_1.OrderStatus.PENDIENTE,
                                                    metodoPago: dto.metodoPago,
                                                    comprobanteUrl: dto.comprobanteUrl,
                                                    items: {
                                                        create: itemsData,
                                                    },
                                                },
                                                include: {
                                                    items: { include: { plan: { include: { service: true } } } },
                                                    customer: { include: { user: true } },
                                                },
                                            })];
                                        case 1:
                                            newOrder = _a.sent();
                                            return [2 /*return*/, newOrder];
                                    }
                                });
                            }); })];
                        case 7:
                            order = _b.sent();
                            return [2 /*return*/, {
                                    message: 'Orden creada exitosamente',
                                    order: order,
                                    siguientePaso: dto.metodoPago === 'tarjeta'
                                        ? 'Procesando pago automático...'
                                        : 'Envía tu comprobante por WhatsApp para validar',
                                }];
                    }
                });
            });
        };
        // APROBAR PAGO Y ENTREGAR CUENTAS (El momento mágico)
        OrdersService_1.prototype.approveAndDeliver = function (orderId) {
            return __awaiter(this, void 0, void 0, function () {
                var order, suscripcionesCreadas, error_1;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findUnique({
                                where: { id: orderId },
                                include: {
                                    items: { include: { plan: true } },
                                    customer: { include: { user: true } },
                                },
                            })];
                        case 1:
                            order = _a.sent();
                            if (!order)
                                throw new common_1.NotFoundException('Orden no encontrada');
                            if (order.estado === client_1.OrderStatus.PAGADO) {
                                throw new common_1.BadRequestException('Esta orden ya fue pagada y entregada');
                            }
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var suscripciones, _i, _a, item, i, account, fechaVencimiento, subscription;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0: 
                                            // 1. Actualizar estado de la orden
                                            return [4 /*yield*/, tx.order.update({
                                                    where: { id: orderId },
                                                    data: { estado: client_1.OrderStatus.PAGADO },
                                                })];
                                            case 1:
                                                // 1. Actualizar estado de la orden
                                                _b.sent();
                                                suscripciones = [];
                                                _i = 0, _a = order.items;
                                                _b.label = 2;
                                            case 2:
                                                if (!(_i < _a.length)) return [3 /*break*/, 9];
                                                item = _a[_i];
                                                i = 0;
                                                _b.label = 3;
                                            case 3:
                                                if (!(i < item.cantidad)) return [3 /*break*/, 8];
                                                return [4 /*yield*/, tx.account.findFirst({
                                                        where: { planId: item.planId, estado: client_1.AccountStatus.DISPONIBLE },
                                                        orderBy: { createdAt: 'asc' },
                                                    })];
                                            case 4:
                                                account = _b.sent();
                                                if (!account) {
                                                    throw new common_1.BadRequestException("Stock agotado durante la entrega para ".concat(item.plan.nombrePlan));
                                                }
                                                fechaVencimiento = new Date();
                                                fechaVencimiento.setDate(fechaVencimiento.getDate() + item.plan.duracionDias);
                                                return [4 /*yield*/, tx.subscription.create({
                                                        data: {
                                                            customerId: order.customerId,
                                                            planId: item.planId,
                                                            accountId: account.id,
                                                            fechaVencimiento: fechaVencimiento,
                                                            estado: 'ACTIVA',
                                                        },
                                                        include: {
                                                            account: true,
                                                            plan: { include: { service: true } },
                                                        },
                                                    })];
                                            case 5:
                                                subscription = _b.sent();
                                                // Marcar cuenta como ocupada
                                                return [4 /*yield*/, tx.account.update({
                                                        where: { id: account.id },
                                                        data: { estado: client_1.AccountStatus.OCUPADA },
                                                    })];
                                            case 6:
                                                // Marcar cuenta como ocupada
                                                _b.sent();
                                                suscripciones.push(subscription);
                                                _b.label = 7;
                                            case 7:
                                                i++;
                                                return [3 /*break*/, 3];
                                            case 8:
                                                _i++;
                                                return [3 /*break*/, 2];
                                            case 9: return [2 /*return*/, suscripciones];
                                        }
                                    });
                                }); })];
                        case 2:
                            suscripcionesCreadas = _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, this.whatsappService.sendDeliveryMessage(order.customer.whatsapp, order.customer.user.nombre, suscripcionesCreadas)];
                        case 4:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            error_1 = _a.sent();
                            console.error('Error enviando WhatsApp de entrega:', error_1);
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/, {
                                message: 'Pago aprobado y cuentas entregadas',
                                suscripciones: suscripcionesCreadas.map(function (s) { return ({
                                    id: s.id,
                                    servicio: s.plan.service.nombre,
                                    plan: s.plan.nombrePlan,
                                    email: s.account.emailCuenta,
                                    password: s.account.passwordCuenta,
                                    perfil: s.account.perfilAsignado,
                                    pin: s.account.pinPerfil,
                                    venceEl: s.fechaVencimiento,
                                }); }),
                            }];
                    }
                });
            });
        };
        // LISTAR ÓRDENES DEL CLIENTE
        OrdersService_1.prototype.getCustomerOrders = function (customerId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.order.findMany({
                            where: { customerId: customerId },
                            include: {
                                items: { include: { plan: { include: { service: true } } } },
                            },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        // LISTAR TODAS LAS ÓRDENES (Admin)
        OrdersService_1.prototype.getAllOrders = function (filters) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.order.findMany({
                            where: __assign(__assign({}, (filters.estado && { estado: filters.estado })), (filters.customerId && { customerId: filters.customerId })),
                            include: {
                                customer: { include: { user: { select: { nombre: true, email: true } } } },
                                items: { include: { plan: { include: { service: true } } } },
                            },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        return OrdersService_1;
    }());
    __setFunctionName(_classThis, "OrdersService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OrdersService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OrdersService = _classThis;
}();
exports.OrdersService = OrdersService;
