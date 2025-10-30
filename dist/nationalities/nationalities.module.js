"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NationalitiesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const nationalities_controller_1 = require("./nationalities.controller");
const nationalities_service_1 = require("./nationalities.service");
const nationality_entity_1 = require("./entities/nationality.entity");
const country_entity_1 = require("../countries/entities/country.entity");
const visa_product_entity_1 = require("../visa-product/entities/visa-product.entity");
let NationalitiesModule = class NationalitiesModule {
};
exports.NationalitiesModule = NationalitiesModule;
exports.NationalitiesModule = NationalitiesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([nationality_entity_1.Nationality, country_entity_1.Country, visa_product_entity_1.VisaProduct])],
        controllers: [nationalities_controller_1.NationalitiesController],
        providers: [nationalities_service_1.NationalitiesService]
    })
], NationalitiesModule);
//# sourceMappingURL=nationalities.module.js.map