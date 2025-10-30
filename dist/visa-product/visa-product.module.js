"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaProductModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const visa_product_service_1 = require("./visa-product.service");
const visa_product_controller_1 = require("./visa-product.controller");
const visa_product_entity_1 = require("./entities/visa-product.entity");
let VisaProductModule = class VisaProductModule {
};
exports.VisaProductModule = VisaProductModule;
exports.VisaProductModule = VisaProductModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([visa_product_entity_1.VisaProduct])],
        controllers: [visa_product_controller_1.VisaProductController],
        providers: [visa_product_service_1.VisaProductService],
    })
], VisaProductModule);
//# sourceMappingURL=visa-product.module.js.map