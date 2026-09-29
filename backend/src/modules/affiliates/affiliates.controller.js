"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliatesController = void 0;
var common_1 = require("@nestjs/common");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var client_1 = require("@prisma/client");
var AffiliatesController = function () {
    var _classDecorators = [(0, common_1.Controller)('affiliates'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _registerAffiliate_decorators;
    var _getMyProfile_decorators;
    var _requestWithdrawal_decorators;
    var _getMyCommissions_decorators;
    var _getMyWithdrawals_decorators;
    var _getAllAffiliates_decorators;
    var _getAllWithdrawals_decorators;
    var _approveWithdrawal_decorators;
    var _manuallyAssignCommission_decorators;
    var _getAffiliateStats_decorators;
    var AffiliatesController = _classThis = /** @class */ (function () {
        function AffiliatesController_1(affiliatesService) {
            this.affiliatesService = (__runInitializers(this, _instanceExtraInitializers), affiliatesService);
        }
        // ============================================
        // ENDPOINTS PÚBLICOS (Para cualquier usuario autenticado)
        // ============================================
        // REGISTRARSE COMO AFILIADO
        AffiliatesController_1.prototype.registerAffiliate = function (dto) {
            return this.affiliatesService.registerAffiliate(dto);
        };
        // ============================================
        // ENDPOINTS DE AFILIADO (Solo afiliados)
        // ============================================
        // MI PERFIL DE AFILIADO
        AffiliatesController_1.prototype.getMyProfile = function (user) {
            // Asumimos que el frontend envía el affiliateId en el token
            return this.affiliatesService.getAffiliateProfile(user.affiliateId);
        };
        // SOLICITAR RETIRO
        AffiliatesController_1.prototype.requestWithdrawal = function (user, dto) {
            return this.affiliatesService.requestWithdrawal(user.affiliateId, dto);
        };
        // MIS COMISIONES
        AffiliatesController_1.prototype.getMyCommissions = function (user) {
            return this.affiliatesService.getCommissionHistory(user.affiliateId);
        };
        // MIS RETIROS
        AffiliatesController_1.prototype.getMyWithdrawals = function (user) {
            return this.affiliatesService.getWithdrawalHistory(user.affiliateId);
        };
        // ============================================
        // ENDPOINTS DE ADMIN
        // ============================================
        // LISTAR TODOS LOS AFILIADOS
        AffiliatesController_1.prototype.getAllAffiliates = function () {
            return this.affiliatesService.getAllAffiliates();
        };
        // LISTAR SOLICITUDES DE RETIRO
        AffiliatesController_1.prototype.getAllWithdrawals = function (estado, affiliateId) {
            return this.affiliatesService.getAllWithdrawals({ estado: estado, affiliateId: affiliateId });
        };
        // APROBAR/RECHAZAR RETIRO
        AffiliatesController_1.prototype.approveWithdrawal = function (user, dto) {
            return this.affiliatesService.approveWithdrawal(user.userId, dto);
        };
        // ASIGNAR COMISIÓN MANUALMENTE (Para correcciones)
        AffiliatesController_1.prototype.manuallyAssignCommission = function (body) {
            return this.affiliatesService.manuallyAssignCommission(body.affiliateId, body.orderId, body.tipo);
        };
        // ESTADÍSTICAS GLOBALES
        AffiliatesController_1.prototype.getAffiliateStats = function () {
            return this.affiliatesService.getAffiliateStats();
        };
        return AffiliatesController_1;
    }());
    __setFunctionName(_classThis, "AffiliatesController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _registerAffiliate_decorators = [(0, common_1.Post)('register')];
        _getMyProfile_decorators = [(0, common_1.Get)('me'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.VENDEDOR)];
        _requestWithdrawal_decorators = [(0, common_1.Post)('withdraw'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.VENDEDOR)];
        _getMyCommissions_decorators = [(0, common_1.Get)('commissions'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.VENDEDOR)];
        _getMyWithdrawals_decorators = [(0, common_1.Get)('withdrawals'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.VENDEDOR)];
        _getAllAffiliates_decorators = [(0, common_1.Get)(), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _getAllWithdrawals_decorators = [(0, common_1.Get)('withdrawals/all'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _approveWithdrawal_decorators = [(0, common_1.Post)('withdrawals/resolve'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _manuallyAssignCommission_decorators = [(0, common_1.Post)('commissions/assign'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _getAffiliateStats_decorators = [(0, common_1.Get)('stats'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        __esDecorate(_classThis, null, _registerAffiliate_decorators, { kind: "method", name: "registerAffiliate", static: false, private: false, access: { has: function (obj) { return "registerAffiliate" in obj; }, get: function (obj) { return obj.registerAffiliate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyProfile_decorators, { kind: "method", name: "getMyProfile", static: false, private: false, access: { has: function (obj) { return "getMyProfile" in obj; }, get: function (obj) { return obj.getMyProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _requestWithdrawal_decorators, { kind: "method", name: "requestWithdrawal", static: false, private: false, access: { has: function (obj) { return "requestWithdrawal" in obj; }, get: function (obj) { return obj.requestWithdrawal; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyCommissions_decorators, { kind: "method", name: "getMyCommissions", static: false, private: false, access: { has: function (obj) { return "getMyCommissions" in obj; }, get: function (obj) { return obj.getMyCommissions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyWithdrawals_decorators, { kind: "method", name: "getMyWithdrawals", static: false, private: false, access: { has: function (obj) { return "getMyWithdrawals" in obj; }, get: function (obj) { return obj.getMyWithdrawals; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllAffiliates_decorators, { kind: "method", name: "getAllAffiliates", static: false, private: false, access: { has: function (obj) { return "getAllAffiliates" in obj; }, get: function (obj) { return obj.getAllAffiliates; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllWithdrawals_decorators, { kind: "method", name: "getAllWithdrawals", static: false, private: false, access: { has: function (obj) { return "getAllWithdrawals" in obj; }, get: function (obj) { return obj.getAllWithdrawals; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveWithdrawal_decorators, { kind: "method", name: "approveWithdrawal", static: false, private: false, access: { has: function (obj) { return "approveWithdrawal" in obj; }, get: function (obj) { return obj.approveWithdrawal; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _manuallyAssignCommission_decorators, { kind: "method", name: "manuallyAssignCommission", static: false, private: false, access: { has: function (obj) { return "manuallyAssignCommission" in obj; }, get: function (obj) { return obj.manuallyAssignCommission; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAffiliateStats_decorators, { kind: "method", name: "getAffiliateStats", static: false, private: false, access: { has: function (obj) { return "getAffiliateStats" in obj; }, get: function (obj) { return obj.getAffiliateStats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AffiliatesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AffiliatesController = _classThis;
}();
exports.AffiliatesController = AffiliatesController;
