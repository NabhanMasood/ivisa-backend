import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Admin } from './entities/admin.entity';
import { Customer } from '../customers/entities/customer.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  // ==================== CUSTOMER AUTH ====================
  async customerRegister(dto: RegisterDto) {
    const { fullName, email, password } = dto;

    // Check if customer already exists
    const existingCustomer = await this.customerRepo.findOne({ 
      where: { email } 
    });

    if (existingCustomer) {
      if (existingCustomer.password) {
        throw new BadRequestException('Email already registered. Please login instead.');
      }

      // Update existing customer with password
      const hashedPassword = await bcrypt.hash(password, 10);
      existingCustomer.password = hashedPassword;
      existingCustomer.fullname = fullName;
      existingCustomer.status = 'Active';
      existingCustomer.role = 'customer';
      
      const updatedCustomer = await this.customerRepo.save(existingCustomer);

      const token = jwt.sign(
        { 
          id: updatedCustomer.id, 
          email: updatedCustomer.email,
          role: 'customer',
          type: 'customer'
        },
        process.env.JWT_SECRET || 'SECRET_KEY',
        { expiresIn: '7d' },
      );

      const { password: _, ...customerWithoutPassword } = updatedCustomer;

      return { 
        status: true,
        message: 'Account completed successfully!',
        token,
        user: customerWithoutPassword
      };
    }

    // Create new customer
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const customer = this.customerRepo.create({
      fullname: fullName,
      email,
      password: hashedPassword,
      status: 'Active',
      role: 'customer'
    });

    const savedCustomer = await this.customerRepo.save(customer);

    const token = jwt.sign(
      { 
        id: savedCustomer.id, 
        email: savedCustomer.email,
        role: 'customer',
        type: 'customer'
      },
      process.env.JWT_SECRET || 'SECRET_KEY',
      { expiresIn: '7d' },
    );

    const { password: _, ...customerWithoutPassword } = savedCustomer;

    return { 
      status: true,
      message: 'Account created successfully',
      token,
      user: customerWithoutPassword
    };
  }

  async customerLogin(dto: LoginDto) {
    const { email, password } = dto;
  
    const customer = await this.customerRepo.findOne({ where: { email } });
    
    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!customer.password) {
      throw new UnauthorizedException('Please complete your account registration first.');
    }
  
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const token = jwt.sign(
      { 
        id: customer.id, 
        email: customer.email,
        role: 'customer',
        type: 'customer'
      },
      process.env.JWT_SECRET || 'SECRET_KEY',
      { expiresIn: '7d' },
    );
  
    const { password: _, ...customerWithoutPassword } = customer;
  
    return { 
      status: true,
      message: 'Login successful', 
      token, 
      user: customerWithoutPassword
    };
  }

  // ==================== PASSWORD MANAGEMENT ====================
  async changePassword(customerId: number, currentPassword: string, newPassword: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    
    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    if (!customer.password) {
      throw new BadRequestException('No password set for this account. Please register first.');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, customer.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    customer.password = hashedNewPassword;
    
    await this.customerRepo.save(customer);

    return {
      status: true,
      message: 'Password changed successfully',
    };
  }

  // ==================== EMAIL MANAGEMENT ====================
  async changeEmail(customerId: number, newEmail: string, password: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    
    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    if (!customer.password) {
      throw new BadRequestException('No password set for this account. Please register first.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Check if new email is the same as current email
    if (customer.email.toLowerCase() === newEmail.toLowerCase()) {
      throw new BadRequestException('New email must be different from current email');
    }

    // Check if new email already exists
    const existingCustomer = await this.customerRepo.findOne({
      where: { email: newEmail.toLowerCase() },
    });
    if (existingCustomer) {
      throw new BadRequestException('Email already exists');
    }

    // Update email
    customer.email = newEmail.toLowerCase();
    await this.customerRepo.save(customer);

    return {
      status: true,
      message: 'Email changed successfully',
    };
  }

  // ==================== ADMIN AUTH ====================
  async adminRegister(dto: RegisterDto) {
    const { fullName, email, password } = dto;

    const existing = await this.adminRepo.findOne({ where: { email } });
    if (existing) throw new BadRequestException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.adminRepo.create({ 
      fullName, 
      email, 
      password: hashedPassword 
    });
    await this.adminRepo.save(admin);

    return { 
      status: true,
      message: 'Admin registered successfully', 
      admin 
    };
  }

  async adminLogin(dto: LoginDto) {
    const { email, password } = dto;
  
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');
  
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
  
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'SECRET_KEY',
      { expiresIn: '7d' },
    );
  
    const { password: _, ...adminWithoutPassword } = admin;
  
    return { 
      status: true,
      message: 'Login successful', 
      token, 
      admin: adminWithoutPassword
    };
  }
}
