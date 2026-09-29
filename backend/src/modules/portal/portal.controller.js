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
exports.PortalController = void 0;
var common_1 = require("@nestjs/common");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var client_1 = require("@prisma/client");
var PortalController = function () {
    var _classDecorators = [(0, common_1.Controller)('portal'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.CLIENTE)];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getSummary_decorators;
    var _getMySubscriptions_decorators;
    var _getSubscriptionDetails_decorators;
    var _getMyOrders_decorators;
    var _requestWarranty_decorators;
    var _getMyTickets_decorators;
    var _renewSubscription_decorators;
    var _updateProfile_decorators;
    var PortalController = _classThis = /** @class */ (function () {
        function PortalController_1(portalService) {
            this.portalService = (__runInitializers(this, _instanceExtraInitializers), portalService);
        }
        // RESUMEN DEL CLIENTE
        PortalController_1.prototype.getSummary = function (user) {
            return this.portalService.getCustomerSummary(user.customerId);
        };
        // MIS SUSCRIPCIONES
        PortalController_1.prototype.getMySubscriptions = function (user) {
            return this.portalService.getMySubscriptions(user.customerId);
        };
        // DETALLE DE UNA SUSCRIPCIÓN (Con credenciales)
        PortalController_1.prototype.getSubscriptionDetails = function (user, id) {
            return this.portalService.getSubscriptionDetails(user.customerId, id);
        };
        // HISTORIAL DE COMPRAS
        PortalController_1.prototype.getMyOrders = function (user) {
            return this.portalService.getMyOrders(user.customerId);
        };
        // SOLICITAR GARANTÍA
        PortalController_1.prototype.requestWarranty = function (user, dto) {
            return this.portalService.requestWarranty(user.customerId, dto);
        };
        // MIS TICKETS DE GARANTÍA
        PortalController_1.prototype.getMyTickets = function (user) {
            return this.portalService.getMyTickets(user.customerId);
        };
        // RENOVACIÓN RÁPIDA
        PortalController_1.prototype.renewSubscription = function (user, dto) {
            return this.portalService.renewSubscription(user.customerId, dto);
        };
        // ACTUALIZAR PERFIL
        PortalController_1.prototype.updateProfile = function (user, data) {
            return this.portalService.updateProfile(user.customerId, data);
        };
        return PortalController_1;
    }());
    __setFunctionName(_classThis, "PortalController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getSummary_decorators = [(0, common_1.Get)('summary')];
        _getMySubscriptions_decorators = [(0, common_1.Get)('subscriptions')];
        _getSubscriptionDetails_decorators = [(0, common_1.Get)('subscriptions/:id')];
        _getMyOrders_decorators = [(0, common_1.Get)('orders')];
        _requestWarranty_decorators = [(0, common_1.Post)('warranty')];
        _getMyTickets_decorators = [(0, common_1.Get)('tickets')];
        _renewSubscription_decorators = [(0, common_1.Post)('renew')];
        _updateProfile_decorators = [(0, common_1.Patch)('profile')];
        __esDecorate(_classThis, null, _getSummary_decorators, { kind: "method", name: "getSummary", static: false, private: false, access: { has: function (obj) { return "getSummary" in obj; }, get: function (obj) { return obj.getSummary; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMySubscriptions_decorators, { kind: "method", name: "getMySubscriptions", static: false, private: false, access: { has: function (obj) { return "getMySubscriptions" in obj; }, get: function (obj) { return obj.getMySubscriptions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSubscriptionDetails_decorators, { kind: "method", name: "getSubscriptionDetails", static: false, private: false, access: { has: function (obj) { return "getSubscriptionDetails" in obj; }, get: function (obj) { return obj.getSubscriptionDetails; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyOrders_decorators, { kind: "method", name: "getMyOrders", static: false, private: false, access: { has: function (obj) { return "getMyOrders" in obj; }, get: function (obj) { return obj.getMyOrders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _requestWarranty_decorators, { kind: "method", name: "requestWarranty", static: false, private: false, access: { has: function (obj) { return "requestWarranty" in obj; }, get: function (obj) { return obj.requestWarranty; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyTickets_decorators, { kind: "method", name: "getMyTickets", static: false, private: false, access: { has: function (obj) { return "getMyTickets" in obj; }, get: function (obj) { return obj.getMyTickets; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _renewSubscription_decorators, { kind: "method", name: "renewSubscription", static: false, private: false, access: { has: function (obj) { return "renewSubscription" in obj; }, get: function (obj) { return obj.renewSubscription; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateProfile_decorators, { kind: "method", name: "updateProfile", static: false, private: false, access: { has: function (obj) { return "updateProfile" in obj; }, get: function (obj) { return obj.updateProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PortalController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PortalController = _classThis;
}();
exports.PortalController = PortalController;
