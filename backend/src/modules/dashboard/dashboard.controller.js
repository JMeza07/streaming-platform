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
exports.DashboardController = void 0;
var common_1 = require("@nestjs/common");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var client_1 = require("@prisma/client");
var DashboardController = function () {
    var _classDecorators = [(0, common_1.Controller)('dashboard'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.VENDEDOR)];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getMainMetrics_decorators;
    var _getSubscriptionsByStatus_decorators;
    var _getStockByPlatform_decorators;
    var _getCriticalAlerts_decorators;
    var _getSalesTrend_decorators;
    var _getTopPlatforms_decorators;
    var _getFullDashboard_decorators;
    var DashboardController = _classThis = /** @class */ (function () {
        function DashboardController_1(dashboardService) {
            this.dashboardService = (__runInitializers(this, _instanceExtraInitializers), dashboardService);
        }
        // MÉTRICAS PRINCIPALES
        DashboardController_1.prototype.getMainMetrics = function () {
            return this.dashboardService.getMainMetrics();
        };
        // SUSCRIPCIONES POR ESTADO
        DashboardController_1.prototype.getSubscriptionsByStatus = function () {
            return this.dashboardService.getSubscriptionsByStatus();
        };
        // STOCK POR PLATAFORMA
        DashboardController_1.prototype.getStockByPlatform = function () {
            return this.dashboardService.getStockByPlatform();
        };
        // ALERTAS CRÍTICAS
        DashboardController_1.prototype.getCriticalAlerts = function () {
            return this.dashboardService.getCriticalAlerts();
        };
        // TENDENCIA DE VENTAS
        DashboardController_1.prototype.getSalesTrend = function () {
            return this.dashboardService.getSalesTrend();
        };
        // TOP PLATAFORMAS
        DashboardController_1.prototype.getTopPlatforms = function () {
            return this.dashboardService.getTopPlatforms();
        };
        // DASHBOARD COMPLETO
        DashboardController_1.prototype.getFullDashboard = function () {
            return this.dashboardService.getFullDashboard();
        };
        return DashboardController_1;
    }());
    __setFunctionName(_classThis, "DashboardController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getMainMetrics_decorators = [(0, common_1.Get)('metrics')];
        _getSubscriptionsByStatus_decorators = [(0, common_1.Get)('subscriptions')];
        _getStockByPlatform_decorators = [(0, common_1.Get)('stock')];
        _getCriticalAlerts_decorators = [(0, common_1.Get)('alerts')];
        _getSalesTrend_decorators = [(0, common_1.Get)('trend')];
        _getTopPlatforms_decorators = [(0, common_1.Get)('top-platforms')];
        _getFullDashboard_decorators = [(0, common_1.Get)('full')];
        __esDecorate(_classThis, null, _getMainMetrics_decorators, { kind: "method", name: "getMainMetrics", static: false, private: false, access: { has: function (obj) { return "getMainMetrics" in obj; }, get: function (obj) { return obj.getMainMetrics; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSubscriptionsByStatus_decorators, { kind: "method", name: "getSubscriptionsByStatus", static: false, private: false, access: { has: function (obj) { return "getSubscriptionsByStatus" in obj; }, get: function (obj) { return obj.getSubscriptionsByStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getStockByPlatform_decorators, { kind: "method", name: "getStockByPlatform", static: false, private: false, access: { has: function (obj) { return "getStockByPlatform" in obj; }, get: function (obj) { return obj.getStockByPlatform; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getCriticalAlerts_decorators, { kind: "method", name: "getCriticalAlerts", static: false, private: false, access: { has: function (obj) { return "getCriticalAlerts" in obj; }, get: function (obj) { return obj.getCriticalAlerts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSalesTrend_decorators, { kind: "method", name: "getSalesTrend", static: false, private: false, access: { has: function (obj) { return "getSalesTrend" in obj; }, get: function (obj) { return obj.getSalesTrend; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTopPlatforms_decorators, { kind: "method", name: "getTopPlatforms", static: false, private: false, access: { has: function (obj) { return "getTopPlatforms" in obj; }, get: function (obj) { return obj.getTopPlatforms; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getFullDashboard_decorators, { kind: "method", name: "getFullDashboard", static: false, private: false, access: { has: function (obj) { return "getFullDashboard" in obj; }, get: function (obj) { return obj.getFullDashboard; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DashboardController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DashboardController = _classThis;
}();
exports.DashboardController = DashboardController;
