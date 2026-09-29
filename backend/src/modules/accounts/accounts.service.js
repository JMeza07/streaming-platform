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
exports.AccountsService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var AccountsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AccountsService = _classThis = /** @class */ (function () {
        function AccountsService_1(prisma) {
            this.prisma = prisma;
        }
        // CREAR UNA SOLA CUENTA
        AccountsService_1.prototype.create = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var plan, existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.plan.findUnique({ where: { id: dto.planId } })];
                        case 1:
                            plan = _a.sent();
                            if (!plan)
                                throw new common_1.NotFoundException('Plan no encontrado');
                            return [4 /*yield*/, this.prisma.account.findUnique({
                                    where: { planId_emailCuenta: { planId: dto.planId, emailCuenta: dto.emailCuenta } },
                                })];
                        case 2:
                            existing = _a.sent();
                            if (existing)
                                throw new common_1.ConflictException('Esta cuenta ya existe en el inventario');
                            return [2 /*return*/, this.prisma.account.create({ data: dto })];
                    }
                });
            });
        };
        // IMPORTACIÓN MASIVA (CSV / JSON)
        AccountsService_1.prototype.importBatch = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var plan, importados, duplicados, errores, batchSize, i, batch, _i, batch_1, acc, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.plan.findUnique({ where: { id: dto.planId } })];
                        case 1:
                            plan = _a.sent();
                            if (!plan)
                                throw new common_1.NotFoundException('Plan no encontrado');
                            importados = 0;
                            duplicados = 0;
                            errores = [];
                            batchSize = 50;
                            i = 0;
                            _a.label = 2;
                        case 2:
                            if (!(i < dto.accounts.length)) return [3 /*break*/, 9];
                            batch = dto.accounts.slice(i, i + batchSize);
                            _i = 0, batch_1 = batch;
                            _a.label = 3;
                        case 3:
                            if (!(_i < batch_1.length)) return [3 /*break*/, 8];
                            acc = batch_1[_i];
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, this.prisma.account.create({
                                    data: {
                                        planId: dto.planId,
                                        emailCuenta: acc.emailCuenta,
                                        passwordCuenta: acc.passwordCuenta,
                                        perfilAsignado: acc.perfilAsignado,
                                        pinPerfil: acc.pinPerfil,
                                        batchId: dto.batchId,
                                        estado: client_1.AccountStatus.DISPONIBLE,
                                    },
                                })];
                        case 5:
                            _a.sent();
                            importados++;
                            return [3 /*break*/, 7];
                        case 6:
                            error_1 = _a.sent();
                            if (error_1.code === 'P2002') {
                                duplicados++;
                            }
                            else {
                                errores.push("Error con ".concat(acc.emailCuenta, ": ").concat(error_1.message));
                            }
                            return [3 /*break*/, 7];
                        case 7:
                            _i++;
                            return [3 /*break*/, 3];
                        case 8:
                            i += batchSize;
                            return [3 /*break*/, 2];
                        case 9:
                            if (!dto.batchId) return [3 /*break*/, 11];
                            return [4 /*yield*/, this.prisma.supplierBatch.update({
                                    where: { id: dto.batchId },
                                    data: { cantidadCuentas: { increment: importados } },
                                })];
                        case 10:
                            _a.sent();
                            _a.label = 11;
                        case 11: return [2 /*return*/, {
                                message: 'Importación completada',
                                resumen: { importados: importados, duplicados: duplicados, errores: errores.length },
                                detallesErrores: errores,
                            }];
                    }
                });
            });
        };
        // OBTENER STOCK DISPONIBLE POR PLAN
        AccountsService_1.prototype.getStockByPlan = function (planId) {
            return __awaiter(this, void 0, void 0, function () {
                var cuentas;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.account.findMany({
                                where: { planId: planId, estado: client_1.AccountStatus.DISPONIBLE },
                                select: { id: true, emailCuenta: true, perfilAsignado: true },
                            })];
                        case 1:
                            cuentas = _a.sent();
                            return [2 /*return*/, {
                                    planId: planId,
                                    disponibles: cuentas.length,
                                    cuentas: cuentas,
                                }];
                    }
                });
            });
        };
        // BUSCAR UNA CUENTA DISPONIBLE (Para asignar en una venta)
        AccountsService_1.prototype.findAvailableAccount = function (planId) {
            return __awaiter(this, void 0, void 0, function () {
                var account;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.account.findFirst({
                                where: { planId: planId, estado: client_1.AccountStatus.DISPONIBLE },
                                orderBy: { createdAt: 'asc' }, // FIFO: primero la más antigua
                            })];
                        case 1:
                            account = _a.sent();
                            if (!account) {
                                throw new common_1.BadRequestException("No hay stock disponible para el plan ".concat(planId));
                            }
                            return [2 /*return*/, account];
                    }
                });
            });
        };
        // MARCAR CUENTA COMO OCUPADA (Al vender)
        AccountsService_1.prototype.markAsOccupied = function (accountId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.account.update({
                            where: { id: accountId },
                            data: { estado: client_1.AccountStatus.OCUPADA },
                        })];
                });
            });
        };
        // MARCAR CUENTA COMO DEFECTUOSA (Garantía)
        AccountsService_1.prototype.markAsDefective = function (accountId, motivo) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.account.update({
                            where: { id: accountId },
                            data: { estado: client_1.AccountStatus.DEFECTUOSA },
                        })];
                });
            });
        };
        // LISTAR TODAS LAS CUENTAS (Con filtros)
        AccountsService_1.prototype.findAll = function (filters) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.account.findMany({
                            where: __assign(__assign(__assign({}, (filters.planId && { planId: filters.planId })), (filters.estado && { estado: filters.estado })), (filters.batchId && { batchId: filters.batchId })),
                            include: {
                                plan: { select: { nombrePlan: true, service: { select: { nombre: true } } } },
                                subscription: { select: { customer: { select: { user: { select: { nombre: true, email: true } } } } } },
                            },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        return AccountsService_1;
    }());
    __setFunctionName(_classThis, "AccountsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AccountsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AccountsService = _classThis;
}();
exports.AccountsService = AccountsService;
