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
exports.BatchQuarantineDto = void 0;
var class_validator_1 = require("class-validator");
var BatchQuarantineDto = function () {
    var _a;
    var _batchId_decorators;
    var _batchId_initializers = [];
    var _batchId_extraInitializers = [];
    var _razon_decorators;
    var _razon_initializers = [];
    var _razon_extraInitializers = [];
    return _a = /** @class */ (function () {
            function BatchQuarantineDto() {
                this.batchId = __runInitializers(this, _batchId_initializers, void 0);
                this.razon = (__runInitializers(this, _batchId_extraInitializers), __runInitializers(this, _razon_initializers, void 0));
                __runInitializers(this, _razon_extraInitializers);
            }
            return BatchQuarantineDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _batchId_decorators = [(0, class_validator_1.IsUUID)()];
            _razon_decorators = [(0, class_validator_1.IsString)()];
            __esDecorate(null, null, _batchId_decorators, { kind: "field", name: "batchId", static: false, private: false, access: { has: function (obj) { return "batchId" in obj; }, get: function (obj) { return obj.batchId; }, set: function (obj, value) { obj.batchId = value; } }, metadata: _metadata }, _batchId_initializers, _batchId_extraInitializers);
            __esDecorate(null, null, _razon_decorators, { kind: "field", name: "razon", static: false, private: false, access: { has: function (obj) { return "razon" in obj; }, get: function (obj) { return obj.razon; }, set: function (obj, value) { obj.razon = value; } }, metadata: _metadata }, _razon_initializers, _razon_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.BatchQuarantineDto = BatchQuarantineDto;
