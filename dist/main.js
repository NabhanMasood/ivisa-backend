"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const admin_seeder_1 = require("./auth/admin.seeder");
const typeorm_1 = require("typeorm");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const dataSource = app.get(typeorm_1.DataSource);
    await (0, admin_seeder_1.seedAdmins)(dataSource);
    await app.listen(5000);
    console.log(`Server running on http://localhost:5000`);
}
bootstrap();
//# sourceMappingURL=main.js.map