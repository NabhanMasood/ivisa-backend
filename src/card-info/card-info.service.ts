import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CardInfo } from './entities/card-info.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateCardInfoDto } from './dto/create-card-info.dto';
import { UpdateCardInfoDto } from './dto/update-card-info.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class CardInfoService {
  constructor(
    @InjectRepository(CardInfo)
    private cardInfoRepo: Repository<CardInfo>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    private dataSource: DataSource,
    private stripeService: StripeService, // Inject StripeService
  ) {}

  /**
   * Create a new card for a customer
   * If paymentMethodId is provided, retrieve actual card details from Stripe
   */
  async create(createDto: CreateCardInfoDto) {
    try {
      console.log('📝 Creating card with data:', {
        customerId: createDto.customerId,
        cardholderName: createDto.cardholderName,
        paymentMethodId: createDto.paymentMethodId,
        hasCardDetails: !!(createDto.cardLast4 || createDto.cardBrand),
      });

      // Validate customer exists
      const customer = await this.customerRepo.findOne({
        where: { id: createDto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${createDto.customerId} not found`,
        );
      }

      // If paymentMethodId is provided, retrieve card details from Stripe
      let cardDetails = {
        cardLast4: createDto.cardLast4,
        cardBrand: createDto.cardBrand,
        expiryMonth: createDto.expiryMonth,
        expiryYear: createDto.expiryYear,
      };

      if (createDto.paymentMethodId) {
        console.log('🔍 Retrieving card details from Stripe for:', createDto.paymentMethodId);
        try {
          const paymentMethod = await this.stripeService.retrievePaymentMethod(
            createDto.paymentMethodId,
          );

          console.log('✅ Stripe payment method retrieved:', {
            id: paymentMethod.id,
            hasCard: !!paymentMethod.card,
          });

          // Extract real card details from Stripe
          if (paymentMethod.card) {
            cardDetails = {
              cardLast4: paymentMethod.card.last4 || createDto.cardLast4,
              cardBrand: paymentMethod.card.brand || createDto.cardBrand,
              expiryMonth:
                paymentMethod.card.exp_month?.toString().padStart(2, '0') ||
                createDto.expiryMonth,
              expiryYear:
                paymentMethod.card.exp_year?.toString() ||
                createDto.expiryYear,
            };
            console.log('💳 Extracted card details:', cardDetails);
          }
        } catch (stripeError) {
          // If Stripe retrieval fails, log but continue with provided values
          console.error(
            `❌ Failed to retrieve card details from Stripe:`,
            stripeError.message,
            stripeError,
          );
          // Continue with provided placeholder values
        }
      } else {
        console.log('⚠️ No paymentMethodId provided, using provided card details');
      }

      // If this is set as default, unset other default cards for this customer
      if (createDto.isDefault) {
        await this.cardInfoRepo.update(
          { customerId: createDto.customerId },
          { isDefault: false },
        );
      }

      // Create card info with real or provided values
      const cardData = {
        customerId: createDto.customerId,
        cardholderName: createDto.cardholderName,
        cardLast4: cardDetails.cardLast4,
        cardBrand: cardDetails.cardBrand,
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        paymentMethodId: createDto.paymentMethodId,
        paymentGateway: createDto.paymentGateway || 'stripe',
        isActive: createDto.isActive ?? true,
        isDefault: createDto.isDefault ?? false,
      };

      console.log('💾 Saving card with data:', {
        ...cardData,
        cardLast4: cardData.cardLast4 ? '****' : null, // Don't log full card number
      });

      const cardInfo = this.cardInfoRepo.create(cardData);
      const savedCard = await this.cardInfoRepo.save(cardInfo);

      console.log('✅ Card saved successfully with ID:', savedCard.id);

      return {
        status: true,
        message: 'Card added successfully',
        data: {
          id: savedCard.id,
          customerId: savedCard.customerId,
          cardholderName: savedCard.cardholderName,
          cardLast4: savedCard.cardLast4,
          cardBrand: savedCard.cardBrand,
          expiryMonth: savedCard.expiryMonth,
          expiryYear: savedCard.expiryYear,
          paymentMethodId: savedCard.paymentMethodId,
          paymentGateway: savedCard.paymentGateway,
          isActive: savedCard.isActive,
          isDefault: savedCard.isDefault,
          createdAt: savedCard.createdAt,
        },
      };
    } catch (error) {
      console.error('❌ Error creating card:', {
        error: error.message,
        stack: error.stack,
        createDto: {
          customerId: createDto.customerId,
          cardholderName: createDto.cardholderName,
          paymentMethodId: createDto.paymentMethodId,
        },
      });

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error creating card info',
      );
    }
  }

  /**
   * Get all cards for a customer
   */
  async findByCustomer(customerId: number) {
    try {
      const cards = await this.cardInfoRepo.find({
        where: { customerId },
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });

      return {
        status: true,
        message: 'Cards retrieved successfully',
        count: cards.length,
        data: cards.map((card) => ({
          id: card.id,
          customerId: card.customerId,
          cardholderName: card.cardholderName,
          cardLast4: card.cardLast4,
          cardBrand: card.cardBrand,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          isActive: card.isActive,
          isDefault: card.isDefault,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        })),
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching cards',
      );
    }
  }

  /**
   * Get a single card by ID
   */
  async findOne(id: number) {
    try {
      const card = await this.cardInfoRepo.findOne({
        where: { id },
        relations: ['customer'],
      });

      if (!card) {
        throw new NotFoundException(`Card with ID ${id} not found`);
      }

      return {
        status: true,
        message: 'Card retrieved successfully',
        data: {
          id: card.id,
          customerId: card.customerId,
          cardholderName: card.cardholderName,
          cardLast4: card.cardLast4,
          cardBrand: card.cardBrand,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          isActive: card.isActive,
          isDefault: card.isDefault,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching card',
      );
    }
  }

  /**
   * Update a card
   */
  async update(id: number, updateDto: UpdateCardInfoDto) {
    try {
      const card = await this.cardInfoRepo.findOne({
        where: { id },
      });

      if (!card) {
        throw new NotFoundException(`Card with ID ${id} not found`);
      }

      // If setting as default, unset other default cards for this customer
      if (updateDto.isDefault === true) {
        await this.cardInfoRepo
          .createQueryBuilder()
          .update(CardInfo)
          .set({ isDefault: false })
          .where('customerId = :customerId AND id != :id', {
            customerId: card.customerId,
            id: id,
          })
          .execute();
      }

      // Update card
      Object.assign(card, updateDto);
      const updatedCard = await this.cardInfoRepo.save(card);

      return {
        status: true,
        message: 'Card updated successfully',
        data: {
          id: updatedCard.id,
          customerId: updatedCard.customerId,
          cardholderName: updatedCard.cardholderName,
          cardLast4: updatedCard.cardLast4,
          cardBrand: updatedCard.cardBrand,
          expiryMonth: updatedCard.expiryMonth,
          expiryYear: updatedCard.expiryYear,
          isActive: updatedCard.isActive,
          isDefault: updatedCard.isDefault,
          updatedAt: updatedCard.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error updating card',
      );
    }
  }

  /**
   * Set a card as default
   */
  async setDefault(id: number) {
    try {
      const card = await this.cardInfoRepo.findOne({
        where: { id },
      });

      if (!card) {
        throw new NotFoundException(`Card with ID ${id} not found`);
      }

      // Unset other default cards for this customer
      await this.cardInfoRepo.update(
        { customerId: card.customerId },
        { isDefault: false },
      );

      // Set this card as default
      card.isDefault = true;
      const updatedCard = await this.cardInfoRepo.save(card);

      return {
        status: true,
        message: 'Card set as default successfully',
        data: {
          id: updatedCard.id,
          isDefault: updatedCard.isDefault,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error setting default card',
      );
    }
  }

  /**
   * Delete a card
   */
  async remove(id: number) {
    try {
      const card = await this.cardInfoRepo.findOne({
        where: { id },
      });

      if (!card) {
        throw new NotFoundException(`Card with ID ${id} not found`);
      }

      await this.cardInfoRepo.remove(card);

      return {
        status: true,
        message: 'Card deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error deleting card',
      );
    }
  }

  /**
   * Get default card for a customer
   */
  async getDefaultCard(customerId: number) {
    try {
      const card = await this.cardInfoRepo.findOne({
        where: { customerId, isDefault: true, isActive: true },
      });

      if (!card) {
        // Return null if no default card found
        return {
          status: true,
          message: 'No default card found',
          data: null,
        };
      }

      return {
        status: true,
        message: 'Default card retrieved successfully',
        data: {
          id: card.id,
          customerId: card.customerId,
          cardholderName: card.cardholderName,
          cardLast4: card.cardLast4,
          cardBrand: card.cardBrand,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          isActive: card.isActive,
          isDefault: card.isDefault,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching default card',
      );
    }
  }
}

