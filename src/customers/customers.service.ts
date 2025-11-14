import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Application } from './entities/application.entity';
import { Order } from './entities/order.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Application)
    private applicationRepo: Repository<Application>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async create(createDto: CreateCustomerDto): Promise<Customer> {
    try {
      const existing = await this.customerRepo.findOne({
        where: { email: createDto.email },
      });
      if (existing) {
        throw new BadRequestException('Email already exists');
      }
      const customer = this.customerRepo.create({
        ...createDto,
        status: 'Active',
      });
      return this.customerRepo.save(customer);
    } catch (error) {
      throw new BadRequestException(error.message || 'Error creating customer');
    }
  }

  async findAll(search?: string): Promise<any[]> {
    const query = this.customerRepo.createQueryBuilder('customer');

    if (search) {
      query.where(
        '(customer.fullname ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const customers = await query.getMany();

    // Get total applications for each customer
    const customersWithApplications = await Promise.all(
      customers.map(async (customer) => {
        const totalApplications = await this.applicationRepo.count({
          where: { customerId: customer.id },
        });

        return {
          id: customer.id,
          name: customer.fullname,
          email: customer.email,
          totalApplications,
          status: customer.status,
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
        email: customer.email,
        residenceCountry: customer.residenceCountry,
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
    const query = this.applicationRepo
      .createQueryBuilder('application')
      .where('application.customerId = :customerId', { customerId });

    if (search) {
      query.andWhere(
        '(application.applicationNumber ILIKE :search OR application.destination ILIKE :search OR application.visaProduct ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const applications = await query.getMany();

    return applications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      destination: app.destination,
      visaProduct: app.visaProduct,
      price: app.price,
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

      Object.assign(customer, updateDto);
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

  // Application CRUD Methods
  async createApplication(createDto: CreateApplicationDto): Promise<Application> {
    try {
      // Check if customer exists
      const customer = await this.customerRepo.findOne({
        where: { id: createDto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${createDto.customerId} not found`);
      }

      // Check if application number already exists
      const existing = await this.applicationRepo.findOne({
        where: { applicationNumber: createDto.applicationNumber },
      });
      if (existing) {
        throw new BadRequestException('Application number already exists');
      }

      const application = this.applicationRepo.create({
        ...createDto,
        status: createDto.status || 'Pending',
      });
      return this.applicationRepo.save(application);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error creating application');
    }
  }

  async findAllApplications(search?: string): Promise<any[]> {
    const query = this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.customer', 'customer');

    if (search) {
      query.where(
        '(application.applicationNumber ILIKE :search OR application.destination ILIKE :search OR application.visaProduct ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const applications = await query.getMany();

    return applications.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      customerId: app.customerId,
      customerName: app.customer?.fullname || '',
      destination: app.destination,
      visaProduct: app.visaProduct,
      price: app.price,
      status: app.status,
      createdAt: app.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    }));
  }

  async findOneApplication(id: number): Promise<any> {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
        relations: ['customer'],
      });
      if (!application) {
        throw new NotFoundException(`Application with ID ${id} not found`);
      }
      return {
        id: application.id,
        applicationNumber: application.applicationNumber,
        customerId: application.customerId,
        customerName: application.customer?.fullname || '',
        destination: application.destination,
        visaProduct: application.visaProduct,
        price: application.price,
        status: application.status,
        createdAt: application.createdAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        updatedAt: application.updatedAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error fetching application');
    }
  }

  async updateApplication(id: number, updateDto: UpdateApplicationDto): Promise<Application> {
    try {
      const application = await this.applicationRepo.findOne({ where: { id } });
      if (!application) {
        throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (updateDto.customerId) {
        const customer = await this.customerRepo.findOne({
          where: { id: updateDto.customerId },
        });
        if (!customer) {
          throw new NotFoundException(`Customer with ID ${updateDto.customerId} not found`);
        }
      }

      if (updateDto.applicationNumber) {
        const existing = await this.applicationRepo.findOne({
          where: { applicationNumber: updateDto.applicationNumber },
        });
        if (existing && existing.id !== id) {
          throw new BadRequestException('Application number already exists');
        }
      }

      // Validate status if provided
      if (updateDto.status) {
        const validStatuses = ['Pending', 'In Review', 'Approved', 'Rejected'];
        if (!validStatuses.includes(updateDto.status)) {
          throw new BadRequestException('Status must be Pending, In Review, Approved, or Rejected');
        }
      }

      Object.assign(application, updateDto);
      return this.applicationRepo.save(application);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error updating application');
    }
  }

  async removeApplication(id: number): Promise<void> {
    try {
      const application = await this.applicationRepo.findOne({ where: { id } });
      if (!application) {
        throw new NotFoundException(`Application with ID ${id} not found`);
      }
      await this.applicationRepo.remove(application);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Error deleting application');
    }
  }
}

