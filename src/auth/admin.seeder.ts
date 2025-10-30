import { DataSource } from 'typeorm';
import { Admin } from './entities/admin.entity';
import * as bcrypt from 'bcrypt';

export const seedAdmins = async (dataSource: DataSource) => {
  const adminRepo = dataSource.getRepository(Admin);

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
