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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrderDto = void 0;
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var OrderItemDto = function () {
    var _a;
    var _planId_decorators;
    var _planId_initializers = [];
    var _planId_extraInitializers = [];
    var _cantidad_decorators;
    var _cantidad_initializers = [];
    var _cantidad_extraInitializers = [];
    return _a = /** @class */ (function () {
            function OrderItemDto() {
                this.planId = __runInitializers(this, _planId_initializers, void 0);
                this.cantidad = (__runInitializers(this, _planId_extraInitializers), __runInitializers(this, _cantidad_initializers, void 0));
                __runInitializers(this, _cantidad_extraInitializers);
            }
            return OrderItemDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _planId_decorators = [(0, class_validator_1.IsUUID)()];
            _cantidad_decorators = [(0, class_validator_1.IsInt)()];
            __esDecorate(null, null, _planId_decorators, { kind: "field", name: "planId", static: false, private: false, access: { has: function (obj) { return "planId" in obj; }, get: function (obj) { return obj.planId; }, set: function (obj, value) { obj.planId = value; } }, metadata: _metadata }, _planId_initializers, _planId_extraInitializers);
            __esDecorate(null, null, _cantidad_decorators, { kind: "field", name: "cantidad", static: false, private: false, access: { has: function (obj) { return "cantidad" in obj; }, get: function (obj) { return obj.cantidad; }, set: function (obj, value) { obj.cantidad = value; } }, metadata: _metadata }, _cantidad_initializers, _cantidad_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var CreateOrderDto = function () {
    var _a;
    var _customerId_decorators;
    var _customerId_initializers = [];
    var _customerId_extraInitializers = [];
    var _items_decorators;
    var _items_initializers = [];
    var _items_extraInitializers = [];
    var _metodoPago_decorators;
    var _metodoPago_initializers = [];
    var _metodoPago_extraInitializers = [];
    var _comprobanteUrl_decorators;
    var _comprobanteUrl_initializers = [];
    var _comprobanteUrl_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateOrderDto() {
                this.customerId = __runInitializers(this, _customerId_initializers, void 0);
                this.items = (__runInitializers(this, _customerId_extraInitializers), __runInitializers(this, _items_initializers, void 0));
                this.metodoPago = (__runInitializers(this, _items_extraInitializers), __runInitializers(this, _metodoPago_initializers, void 0)); // 'yape', 'transferencia', 'tarjeta'
                this.comprobanteUrl = (__runInitializers(this, _metodoPago_extraInitializers), __runInitializers(this, _comprobanteUrl_initializers, void 0)); // URL de la captura de pago manual
                __runInitializers(this, _comprobanteUrl_extraInitializers);
            }
            return CreateOrderDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _customerId_decorators = [(0, class_validator_1.IsUUID)()];
            _items_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return OrderItemDto; })];
            _metodoPago_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _comprobanteUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _customerId_decorators, { kind: "field", name: "customerId", static: false, private: false, access: { has: function (obj) { return "customerId" in obj; }, get: function (obj) { return obj.customerId; }, set: function (obj, value) { obj.customerId = value; } }, metadata: _metadata }, _customerId_initializers, _customerId_extraInitializers);
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
            __esDecorate(null, null, _metodoPago_decorators, { kind: "field", name: "metodoPago", static: false, private: false, access: { has: function (obj) { return "metodoPago" in obj; }, get: function (obj) { return obj.metodoPago; }, set: function (obj, value) { obj.metodoPago = value; } }, metadata: _metadata }, _metodoPago_initializers, _metodoPago_extraInitializers);
            __esDecorate(null, null, _comprobanteUrl_decorators, { kind: "field", name: "comprobanteUrl", static: false, private: false, access: { has: function (obj) { return "comprobanteUrl" in obj; }, get: function (obj) { return obj.comprobanteUrl; }, set: function (obj, value) { obj.comprobanteUrl = value; } }, metadata: _metadata }, _comprobanteUrl_initializers, _comprobanteUrl_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateOrderDto = CreateOrderDto;
