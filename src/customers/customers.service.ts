import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Customer } from './entities/customer.entity';
import { Order } from './entities/order.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(VisaApplication)
    private visaApplicationRepo: Repository<VisaApplication>,
  ) {}

  /**
   * Helper method to format passport expiry date
   * Handles both Date objects and string dates from the database
   */
  private formatPassportExpiryDate(date: Date | string | null | undefined): string | null {
    if (!date) {
      return null;
    }
    
    // If it's already a string, return it (assuming it's in ISO format or date format)
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // Otherwise, try to parse and format it
      try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        return date; // Return original string if parsing fails
      }
    }
    
    // If it's a Date object
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  }

  /**
   * Helper method to format date of birth
   * Handles both Date objects and string dates from the database
   */
  private formatDateOfBirth(date: Date | string | null | undefined): string | null {
    if (!date) {
      return null;
    }
    
    // If it's already a string, return it (assuming it's in ISO format or date format)
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // Otherwise, try to parse and format it
      try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        return date; // Return original string if parsing fails
      }
    }
    
    // If it's a Date object
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  }

  async create(createDto: CreateCustomerDto): Promise<Customer> {
    try {
      const existing = await this.customerRepo.findOne({
        where: { email: createDto.email },
      });
      if (existing) {
        throw new BadRequestException('Email already exists');
      }
      
      // Prepare customer data with proper date conversion
      const customerData = {
        ...createDto,
        status: 'Active' as string,
        passportExpiryDate: createDto.passportExpiryDate 
          ? (typeof createDto.passportExpiryDate === 'string' 
              ? new Date(createDto.passportExpiryDate) 
              : createDto.passportExpiryDate)
          : undefined,
        dateOfBirth: createDto.dateOfBirth 
          ? (typeof createDto.dateOfBirth === 'string' 
              ? new Date(createDto.dateOfBirth) 
              : createDto.dateOfBirth)
          : undefined,
      };
      
      const customer = this.customerRepo.create(customerData);
      return this.customerRepo.save(customer);
    } catch (error) {
      throw new BadRequestException(error.message || 'Error creating customer');
    }
  }

  async findAll(search?: string): Promise<any[]> {
    const query = this.customerRepo.createQueryBuilder('customer');

    if (search) {
      query.where(
        '(customer.fullname ILIKE :search OR customer.email ILIKE :search OR customer.phoneNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const customers = await query.getMany();

    // Get total applications for each customer (using VisaApplication)
    const customersWithApplications = await Promise.all(
      customers.map(async (customer) => {
        const totalApplications = await this.visaApplicationRepo.count({
          where: { customerId: customer.id },
        });

        return {
          id: customer.id,
          name: customer.fullname,
          email: customer.email,
          phone: customer.phoneNumber,
          phoneNumber: customer.phoneNumber,
          fullname: customer.fullname,
          residenceCountry: customer.residenceCountry,
          nationality: customer.nationality,
          passportNumber: customer.passportNumber,
          passportNationality: customer.passportNationality,
          passportExpiryDate: this.formatPassportExpiryDate(customer.passportExpiryDate),
          dateOfBirth: this.formatDateOfBirth(customer.dateOfBirth),
          hasSchengenVisa: customer.hasSchengenVisa,
          totalApplications,
          status: customer.status,
          role: customer.role,
        };
      }),
    );

    return customersWithApplications;
  }

  async findOne(id: number): Promise<any> {
    try {
      const customer = await this.customerRepo.findOne({ where: { id } });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      return {
        id: customer.id,
        customerName: customer.fullname,
        fullname: customer.fullname,
        email: customer.email,
        phone: customer.phoneNumber,
        phoneNumber: customer.phoneNumber,
        residenceCountry: customer.residenceCountry,
        nationality: customer.nationality,
        passportNumber: customer.passportNumber,
        passportNationality: customer.passportNationality,
        passportExpiryDate: this.formatPassportExpiryDate(customer.passportExpiryDate),
        dateOfBirth: this.formatDateOfBirth(customer.dateOfBirth),
        hasSchengenVisa: customer.hasSchengenVisa,
        status: customer.status,
        role: customer.role,
        createdDate: customer.createdAt.toISOString().split('T')[0],
        createdAt: customer.createdAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        updatedAt: customer.updatedAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error fetching customer');
    }
  }

  async findCustomerApplications(customerId: number, search?: string): Promise<any[]> {
    const query = this.visaApplicationRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.visaProduct', 'visaProduct')
      .where('app.customerId = :customerId', { customerId });

    if (search) {
      query.andWhere(
        '(app.applicationNumber ILIKE :search OR app.destinationCountry ILIKE :search OR visaProduct.productName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const applications = await query
      .orderBy('app.createdAt', 'DESC')
      .getMany();

    return applications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      destination: app.destinationCountry,
      visaProduct: app.visaProduct?.productName || '',
      price: app.totalAmount?.toString() || '0.00',
      status: app.status,
      createdAt: app.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    }));
  }

  async findCustomerBillingInfo(customerId: number): Promise<any> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const orders = await this.orderRepo.find({
      where: { customerId },
      order: { paymentDate: 'DESC' },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.amount), 0);
    const lastPayment = orders.length > 0 && orders[0].paymentDate
      ? orders[0].paymentDate.toISOString().split('T')[0]
      : null;

    return {
      totalOrders,
      totalSpent: totalSpent.toFixed(2),
      lastPayment,
    };
  }

  async update(id: number, updateDto: UpdateCustomerDto): Promise<Customer> {
    try {
      const customer = await this.customerRepo.findOne({ where: { id } });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      if (updateDto.email) {
        const existing = await this.customerRepo.findOne({
          where: { email: updateDto.email },
        });
        if (existing && existing.id !== id) {
          throw new BadRequestException('Email already exists');
        }
      }

      // Validate status if provided
      if (updateDto.status) {
        const validStatuses = ['Active', 'Inactive', 'Suspended'];
        if (!validStatuses.includes(updateDto.status)) {
          throw new BadRequestException('Status must be Active, Inactive, or Suspended');
        }
      }

      // Convert date strings to Date objects if provided
      const updateData: any = { ...updateDto };
      if (updateDto.passportExpiryDate && typeof updateDto.passportExpiryDate === 'string') {
        updateData.passportExpiryDate = new Date(updateDto.passportExpiryDate);
      }
      if (updateDto.dateOfBirth && typeof updateDto.dateOfBirth === 'string') {
        updateData.dateOfBirth = new Date(updateDto.dateOfBirth);
      }

      // Hash password if it's being updated
      if (updateDto.password) {
        updateData.password = await bcrypt.hash(updateDto.password, 10);
      }

      Object.assign(customer, updateData);
      return this.customerRepo.save(customer);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error updating customer');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const customer = await this.customerRepo.findOne({ where: { id } });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      await this.customerRepo.remove(customer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error deleting customer');
    }
  }

  /**
   * Get customer summary statistics
   */
  async getSummary() {
    try {
      const [
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        suspendedCustomers,
      ] = await Promise.all([
        this.customerRepo.count(),
        this.customerRepo.count({ where: { status: 'Active' } }),
        this.customerRepo.count({ where: { status: 'Inactive' } }),
        this.customerRepo.count({ where: { status: 'Suspended' } }),
      ]);

      // Get total applications
      const totalApplications = await this.visaApplicationRepo.count();

      return {
        status: true,
        message: 'Customer summary retrieved successfully',
        data: {
          totalCustomers,
          activeCustomers,
          inactiveCustomers,
          suspendedCustomers,
          totalApplications,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching customer summary',
      );
    }
  }

}

