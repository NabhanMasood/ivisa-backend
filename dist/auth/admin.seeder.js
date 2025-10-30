"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmins = void 0;
const admin_entity_1 = require("./entities/admin.entity");
const bcrypt = __importStar(require("bcrypt"));
const seedAdmins = async (dataSource) => {
    const adminRepo = dataSource.getRepository(admin_entity_1.Admin);
    const existing = await adminRepo.find();
    if (existing.length) {
        console.log('Admins already exist, skipping seeding...');
        return;
    }
    const admins = [
        { fullName: 'Super Admin', email: 'admin1@example.com', password: '123456' },
        { fullName: 'Second Admin', email: 'admin2@example.com', password: '123456' },
        { fullName: 'Support Admin', email: 'admin3@example.com', password: '123456' },
    ];
    for (const a of admins) {
        const hashed = await bcrypt.hash(a.password, 10);
        await adminRepo.save(adminRepo.create({ ...a, password: hashed }));
    }
    console.log('✅ Admins seeded successfully!');
};
exports.seedAdmins = seedAdmins;
//# sourceMappingURL=admin.seeder.js.map