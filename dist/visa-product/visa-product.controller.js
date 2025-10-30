"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaProductController = void 0;
const common_1 = require("@nestjs/common");
const visa_product_service_1 = require("./visa-product.service");
const create_visa_product_dto_1 = require("./dto/create-visa-product.dto");
let VisaProductController = class VisaProductController {
    visaProductService;
    constructor(visaProductService) {
        this.visaProductService = visaProductService;
    }
    create(createDto) {
        return this.visaProductService.create(createDto);
    }
    findAll(country, productName) {
        return this.visaProductService.findAll(country, productName);
    }
    groupedByCountry(search) {
        return this.visaProductService.groupedByCountry(search);
    }
    findByCountry(country, productName) {
        return this.visaProductService.findByCountry(country, productName);
    }
    findOne(id) {
        return this.visaProductService.findOne(id);
    }
};
exports.VisaProductController = VisaProductController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_visa_product_dto_1.CreateVisaProductDto]),
    __metadata("design:returntype", void 0)
], VisaProductController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('country')),
    __param(1, (0, common_1.Query)('productName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VisaProductController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('grouped/countries'),
    __param(0, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VisaProductController.prototype, "groupedByCountry", null);
__decorate([
    (0, common_1.Get)('by-country'),
    __param(0, (0, common_1.Query)('country')),
    __param(1, (0, common_1.Query)('productName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VisaProductController.prototype, "findByCountry", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VisaProductController.prototype, "findOne", null);
exports.VisaProductController = VisaProductController = __decorate([
    (0, common_1.Controller)('visa-product'),
    __metadata("design:paramtypes", [visa_product_service_1.VisaProductService])
], VisaProductController);
//# sourceMappingURL=visa-product.controller.js.map