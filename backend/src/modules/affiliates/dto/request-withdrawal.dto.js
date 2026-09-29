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
exports.RequestWithdrawalDto = void 0;
var class_validator_1 = require("class-validator");
var RequestWithdrawalDto = function () {
    var _a;
    var _monto_decorators;
    var _monto_initializers = [];
    var _monto_extraInitializers = [];
    var _metodoPago_decorators;
    var _metodoPago_initializers = [];
    var _metodoPago_extraInitializers = [];
    var _datosPago_decorators;
    var _datosPago_initializers = [];
    var _datosPago_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RequestWithdrawalDto() {
                this.monto = __runInitializers(this, _monto_initializers, void 0);
                this.metodoPago = (__runInitializers(this, _monto_extraInitializers), __runInitializers(this, _metodoPago_initializers, void 0)); // 'yape', 'banco', 'paypal', etc.
                this.datosPago = (__runInitializers(this, _metodoPago_extraInitializers), __runInitializers(this, _datosPago_initializers, void 0)); // JSON con número de cuenta, nombre, etc.
                __runInitializers(this, _datosPago_extraInitializers);
            }
            return RequestWithdrawalDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _monto_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(20, { message: 'El monto mínimo de retiro es $20' })];
            _metodoPago_decorators = [(0, class_validator_1.IsString)()];
            _datosPago_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _monto_decorators, { kind: "field", name: "monto", static: false, private: false, access: { has: function (obj) { return "monto" in obj; }, get: function (obj) { return obj.monto; }, set: function (obj, value) { obj.monto = value; } }, metadata: _metadata }, _monto_initializers, _monto_extraInitializers);
            __esDecorate(null, null, _metodoPago_decorators, { kind: "field", name: "metodoPago", static: false, private: false, access: { has: function (obj) { return "metodoPago" in obj; }, get: function (obj) { return obj.metodoPago; }, set: function (obj, value) { obj.metodoPago = value; } }, metadata: _metadata }, _metodoPago_initializers, _metodoPago_extraInitializers);
            __esDecorate(null, null, _datosPago_decorators, { kind: "field", name: "datosPago", static: false, private: false, access: { has: function (obj) { return "datosPago" in obj; }, get: function (obj) { return obj.datosPago; }, set: function (obj, value) { obj.datosPago = value; } }, metadata: _metadata }, _datosPago_initializers, _datosPago_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RequestWithdrawalDto = RequestWithdrawalDto;
