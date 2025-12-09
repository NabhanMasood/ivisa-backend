import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { VisaProduct } from './entities/visa-product.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
import { Traveler } from '../travelers/entities/traveler.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateVisaProductFieldDto } from './dto/create-visa-product-field.dto';
import { UpdateVisaProductFieldDto } from './dto/update-visa-product-field.dto';
import { SubmitFieldResponseDto } from './dto/submit-field-response.dto';
import { EmailService } from '../email/email.service';
import { BatchGetFieldsDto } from './dto/batch-get-fields.dto';
import { BatchSaveFieldsDto, BatchFieldItemDto } from './dto/batch-save-fields.dto';
import { CountriesService } from '../countries/countries.service';

@Injectable()
export class VisaProductFieldsService {
  constructor(
    @InjectRepository(VisaProduct)
    private visaProductRepo: Repository<VisaProduct>,
    @InjectRepository(VisaApplication)
    private applicationRepo: Repository<VisaApplication>,
    @InjectRepository(Traveler)
    private travelerRepo: Repository<Traveler>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    private emailService: EmailService,
    private configService: ConfigService,
    private dataSource: DataSource,
    private countriesService: CountriesService,
  ) { }

  /**
   * Resolve the public frontend URL from environment variables.
   */
  private getFrontendUrl(): string {
    const url = this.configService.get<string>('FRONTEND_URL');
    if (!url) {
      return 'https://yourapp.com'; // Fallback URL
    }
    return url.replace(/\/$/, '');
  }

  /**
   * Create a new custom field for a visa product (Admin only)
   */
  async create(createDto: CreateVisaProductFieldDto) {
    try {
      // Validate visa product exists
      const visaProduct = await this.visaProductRepo.findOne({
        where: { id: createDto.visaProductId },
      });

      if (!visaProduct) {
        throw new NotFoundException(
          `Visa product with ID ${createDto.visaProductId} not found`,
        );
      }

      // Validate dropdown fields have options
      if (
        createDto.fieldType === 'dropdown' &&
        (!createDto.options || createDto.options.length === 0)
      ) {
        throw new BadRequestException(
          'Dropdown fields must have at least one option',
        );
      }

      // Get existing fields or initialize empty array
      const fields = visaProduct.fields || [];

      // Generate new field ID using a counter that never decreases
      // This ensures IDs are stable and never reused, preventing data jumbling
      const currentMaxId = visaProduct.maxFieldId || 0;
      const fieldsMaxId = fields.length > 0 ? Math.max(...fields.map((f) => f.id || 0)) : 0;
      const maxId = Math.max(currentMaxId, fieldsMaxId);
      const newFieldId = maxId + 1;


      // Update the maxFieldId counter
      visaProduct.maxFieldId = newFieldId;

      // Create new field object
      // ✅ FIX: Explicitly handle displayOrder: 0 (nullish coalescing works, but be explicit)
      // If displayOrder is explicitly provided (including 0), use it; otherwise default to fields.length
      let displayOrder =
        createDto.displayOrder !== undefined && createDto.displayOrder !== null
          ? Number(createDto.displayOrder)
          : fields.length;

      // ⚠️ WORKAROUND: If this is a new form and fields are being created in reverse order,
      // we need to reverse the displayOrder. Check if we're creating the first field with displayOrder > 0
      // This is a temporary fix - the frontend should send correct displayOrder values
      if (fields.length === 0 && displayOrder > 0) {
        // This might be the first field but with wrong displayOrder - keep as is for now
        // We'll fix it when all fields are created
      }

      console.log('💾 Storing field with displayOrder:', displayOrder, 'question:', createDto.question);

      const newField = {
        id: newFieldId,
        fieldType: createDto.fieldType,
        question: createDto.question,
        placeholder: createDto.placeholder,
        isRequired: createDto.isRequired ?? false,
        displayOrder: displayOrder,
        options: createDto.options,
        allowedFileTypes: createDto.allowedFileTypes,
        maxFileSizeMB: createDto.maxFileSizeMB,
        minLength: createDto.minLength,
        maxLength: createDto.maxLength,
        isActive: createDto.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add field to array
      fields.push(newField);

      // Sort by displayOrder
      fields.sort((a, b) => a.displayOrder - b.displayOrder);

      // ⚠️ WORKAROUND: Detect if displayOrder values are backwards and fix them
      // This happens when frontend sends questions in reverse order
      // Check if the first field has a high displayOrder and last has 0 (indicating reverse)
      if (fields.length > 1) {
        const firstField = fields[0];
        const lastField = fields[fields.length - 1];
        const maxDisplayOrder = Math.max(...fields.map((f: any) => f.displayOrder ?? 0));

        // If first field has high displayOrder and last has 0, they're backwards
        // Reverse all displayOrder values
        if (firstField.displayOrder > lastField.displayOrder && lastField.displayOrder === 0 && firstField.displayOrder === maxDisplayOrder) {
          console.log('⚠️ Detected reversed displayOrder values, fixing...');
          fields.forEach((field: any) => {
            field.displayOrder = maxDisplayOrder - field.displayOrder;
          });
          // Re-sort after fixing
          fields.sort((a, b) => a.displayOrder - b.displayOrder);
          console.log('✅ Fixed displayOrder, new order:', fields.map((f: any) => ({ displayOrder: f.displayOrder, question: f.question })));
        }
      }

      console.log('✅ After sort, fields order:', fields.map(f => ({ displayOrder: f.displayOrder, question: f.question })));

      // Update visa product
      visaProduct.fields = fields;
      await this.visaProductRepo.save(visaProduct);

      // Log final stored order for debugging
      const savedProduct = await this.visaProductRepo.findOne({
        where: { id: visaProduct.id },
      });
      console.log('💾 Final stored fields order:', savedProduct?.fields?.map((f: any) => ({
        displayOrder: f.displayOrder,
        question: f.question,
        id: f.id
      })));

      return {
        status: true,
        message: 'Custom field created successfully',
        data: newField,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error creating custom field',
      );
    }
  }

  /**
   * Initialize maxFieldId for existing products (migration helper)
   * This ensures field IDs remain stable even after deletions
   */
  private async initializeMaxFieldId(visaProduct: VisaProduct): Promise<void> {
    if (visaProduct.maxFieldId !== undefined && visaProduct.maxFieldId !== null) {
      return; // Already initialized
    }

    const fields = visaProduct.fields || [];
    if (fields.length === 0) {
      visaProduct.maxFieldId = 0;
      await this.visaProductRepo.save(visaProduct);
      return;
    }

    const maxId = Math.max(...fields.map((f) => f.id || 0));
    visaProduct.maxFieldId = maxId;
    await this.visaProductRepo.save(visaProduct);
  }

  /**
   * Get all fields for a visa product
   */
  async findByVisaProduct(
    visaProductId: number,
    includeInactive: boolean = false,
  ) {
    try {
      const visaProduct = await this.visaProductRepo.findOne({
        where: { id: visaProductId },
      });

      if (!visaProduct) {
        throw new NotFoundException(
          `Visa product with ID ${visaProductId} not found`,
        );
      }

      // Initialize maxFieldId if not set (for backward compatibility)
      await this.initializeMaxFieldId(visaProduct);

      let fields = visaProduct.fields || [];

      // Filter inactive fields if needed
      if (!includeInactive) {
        fields = fields.filter((f) => f.isActive !== false);
      }

      // Sort by displayOrder
      fields.sort((a, b) => {
        const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
        const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
        return orderA - orderB;
      });

      // Debug log to verify sort
      console.log('📤 Returning fields in order:', fields.map((f: any) => ({
        displayOrder: f.displayOrder,
        question: f.question
      })));

      return {
        status: true,
        message: 'Custom fields retrieved successfully',
        count: fields.length,
        data: fields,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching custom fields',
      );
    }
  }

  /**
   * Get a single field by ID
   */
  async findOne(id: number) {
    try {
      // Search through all visa products to find the field
      const visaProducts = await this.visaProductRepo.find();

      for (const product of visaProducts) {
        const fields = product.fields || [];
        const field = fields.find((f) => f.id === id);

        if (field) {
          return {
            status: true,
            message: 'Custom field retrieved successfully',
            data: { ...field, visaProductId: product.id },
          };
        }
      }

      throw new NotFoundException(`Custom field with ID ${id} not found`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching custom field',
      );
    }
  }

  /**
   * Update a custom field (Admin only)
   */
  async update(id: number, updateDto: UpdateVisaProductFieldDto) {
    try {
      // Find the field across all products
      const visaProducts = await this.visaProductRepo.find();
      let foundField: any = null;
      let foundProduct: VisaProduct | null = null;

      for (const product of visaProducts) {
        const fields = product.fields || [];
        const fieldIndex = fields.findIndex((f) => f.id === id);

        if (fieldIndex !== -1) {
          foundField = fields[fieldIndex];
          foundProduct = product;

          // Validate dropdown fields have options if changing to dropdown
          if (
            updateDto.fieldType === 'dropdown' &&
            (!updateDto.options || updateDto.options.length === 0)
          ) {
            // If field is already dropdown and no new options provided, keep existing options
            if (foundField && foundField.fieldType !== 'dropdown') {
              throw new BadRequestException(
                'Dropdown fields must have at least one option',
              );
            }
          }

          // Update field
          if (foundField && foundProduct) {
            Object.assign(foundField, updateDto, {
              updatedAt: new Date(),
            });

            // Save the product
            await this.visaProductRepo.save(foundProduct);

            return {
              status: true,
              message: 'Custom field updated successfully',
              data: foundField,
            };
          }
        }
      }

      throw new NotFoundException(`Custom field with ID ${id} not found`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error updating custom field',
      );
    }
  }

  /**
   * Delete a custom field (Admin only)
   */
  async remove(id: number) {
    try {
      // Find the field across all products
      const visaProducts = await this.visaProductRepo.find();

      for (const product of visaProducts) {
        const fields = product.fields || [];
        const fieldIndex = fields.findIndex((f) => f.id === id);

        if (fieldIndex !== -1) {
          // Remove field from array
          fields.splice(fieldIndex, 1);
          product.fields = fields;
          await this.visaProductRepo.save(product);

          return {
            status: true,
            message: 'Custom field deleted successfully',
          };
        }
      }

      throw new NotFoundException(`Custom field with ID ${id} not found`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error deleting custom field',
      );
    }
  }

  /**
   * Submit field responses for an application (User)
   * Can submit application-level responses or traveler-specific responses
   */
  async submitResponses(submitDto: SubmitFieldResponseDto) {
    try {
      // Log the raw incoming data to see what's actually received
      console.log(`📥 [RAW REQUEST] Received ${submitDto.responses?.length || 0} responses`);
      console.log(`📥 [RAW REQUEST] ApplicationId: ${submitDto.applicationId}, TravelerId: ${submitDto.travelerId || 'null (application-level)'}`);
      console.log(`📥 [RAW REQUEST] Raw responses:`, JSON.stringify(submitDto.responses?.map(r => ({ fieldId: r.fieldId, value: r.value, fieldIdType: typeof r.fieldId })), null, 2));

      // Check for passport fields in incoming request
      const incomingPassportFields = submitDto.responses?.filter(r =>
        typeof r.fieldId === 'string' && (r.fieldId.startsWith('_passport_') || r.fieldId === '_residence_country' || r.fieldId === '_has_schengen_visa')
      ) || [];
      console.log(`🛂 [RAW REQUEST] Passport fields in incoming request: ${incomingPassportFields.length}`,
        incomingPassportFields.map(r => ({ fieldId: r.fieldId, value: r.value?.substring(0, 50) || '(empty)' })));

      // Validate application exists
      const application = await this.applicationRepo.findOne({
        where: { id: submitDto.applicationId },
        relations: ['visaProduct', 'travelers', 'customer'],
      });


      if (!application) {
        throw new NotFoundException(
          `Application with ID ${submitDto.applicationId} not found`,
        );
      }


      // Normalize travelerId to number for safe comparison
      const submittedTravelerId =
        submitDto.travelerId !== undefined && submitDto.travelerId !== null
          ? Number(submitDto.travelerId)
          : undefined;


      // If travelerId is provided, validate that the traveler belongs to this application
      if (submittedTravelerId) {
        const traveler = application.travelers?.find(
          (t) => t.id === submittedTravelerId,
        );
        if (!traveler) {
          throw new NotFoundException(
            `Traveler with ID ${submittedTravelerId} not found for this application`,
          );
        }
      }


      // Build available fields set: product fields + admin fields for this context
      const productFieldsAll = application.visaProduct.fields || [];
      const activeProductFields = productFieldsAll.filter((f) => f.isActive !== false);


      const adminFieldsAll = Array.isArray(application.adminRequestedFields)
        ? application.adminRequestedFields
        : [];
      const adminFieldsForContext = submitDto.travelerId
        ? adminFieldsAll.filter((f: any) => f.travelerId === submitDto.travelerId)
        : adminFieldsAll.filter((f: any) => !f.travelerId);

      // ✅ NEW: Also include admin fields from resubmission requests that might not be in adminRequestedFields yet
      // (This is a safety measure - normally they should already be in adminRequestedFields)
      let adminFieldsFromRequests: any[] = [];

      // Determine if traveler 1 is missing (for matching null travelerId requests)
      const travelersInDB = application.travelers?.length || 0;
      const isTraveler1Missing = application.numberOfTravelers > travelersInDB;

      if (application.resubmissionRequests && application.resubmissionRequests.length > 0) {
        const relevantRequests = application.resubmissionRequests.filter((req) => {
          if (req.fulfilledAt) return false;
          if (submitDto.travelerId) {
            // For traveler submissions - match specific traveler ID
            return req.target === 'traveler' && req.travelerId === submitDto.travelerId;
          } else {
            // For application-level submissions - match both:
            // 1. Application-level requests (target === 'application')
            // 2. Traveler requests for traveler 1 (target === 'traveler' && travelerId === null) when traveler 1 is missing
            const isApplicationRequest = req.target === 'application';
            const isTraveler1Request = req.target === 'traveler' && (req.travelerId === null || req.travelerId === undefined) && isTraveler1Missing;
            return isApplicationRequest || isTraveler1Request;
          }
        });

        // Get negative field IDs from requests
        const negativeFieldIds = relevantRequests
          .flatMap(req => req.fieldIds)
          .filter(id => id < 0);

        // Find matching admin fields (they should already be in adminRequestedFields, but double-check)
        const missingAdminFields = negativeFieldIds
          .filter(negId => !adminFieldsForContext.find(f => f.id === negId))
          .map(negId => {
            // Try to find in all admin fields
            const foundField = adminFieldsAll.find((f: any) => f.id === negId);
            if (foundField && (
              !submitDto.travelerId || foundField.travelerId === submitDto.travelerId
            )) {
              return foundField;
            }
            return null;
          })
          .filter(f => f !== null);

        adminFieldsFromRequests = missingAdminFields;
      }

      // Combine admin fields from both sources
      const allAdminFieldsForContext = [...adminFieldsForContext, ...adminFieldsFromRequests];

      // Create field map for quick lookup (support both number and string keys)
      const fieldMap = new Map<number | string, any>();
      // Map product fields
      activeProductFields.forEach((f) => {
        fieldMap.set(f.id, f);
        fieldMap.set(String(f.id), f); // Also support string keys
      });
      // Map admin fields (negative IDs) - include all admin fields for this context
      allAdminFieldsForContext.forEach((f: any) => {
        fieldMap.set(f.id, f);
        fieldMap.set(String(f.id), f);
      });


      // ✅ NEW: Determine allowed field IDs from resubmissionRequests (Option B)
      let allowedIdsFromRequests: number[] = [];
      if (application.status === 'resubmission' && application.resubmissionRequests) {
        const relevantRequests = application.resubmissionRequests.filter((req) => {
          if (req.fulfilledAt) return false; // Skip fulfilled requests

          if (submittedTravelerId) {
            // For traveler submissions - match specific traveler ID
            return req.target === 'traveler' && req.travelerId === submittedTravelerId;
          } else {
            // For application-level submissions - match both:
            // 1. Application-level requests (target === 'application')
            // 2. Traveler requests for traveler 1 (target === 'traveler' && travelerId === null) when traveler 1 is missing
            const isApplicationRequest = req.target === 'application';
            const isTraveler1Request = req.target === 'traveler' && (req.travelerId === null || req.travelerId === undefined) && isTraveler1Missing;
            return isApplicationRequest || isTraveler1Request;
          }
        });


        // Collect all field IDs from relevant requests
        relevantRequests.forEach((req) => {
          allowedIdsFromRequests.push(...req.fieldIds);
        });
      }


      // Determine allowed field IDs for this submission
      // Priority: 
      // 1. resubmissionRequests (Option B - new)
      // 2. admin fields for this context
      // 3. requestedFieldIds (Option A - backward compatibility)
      // 4. all active product fields
      const adminAllowedIds = adminFieldsForContext.map((f: any) => f.id);
      const requestedIdsForTraveler =
        submitDto.travelerId && application.requestedFieldIdsByTraveler
          ? application.requestedFieldIdsByTraveler[String(submitDto.travelerId)] ||
          application.requestedFieldIdsByTraveler[submitDto.travelerId as any]
          : undefined;
      const requestedIdsApp = application.requestedFieldIds || [];
      const requestedIds: number[] =
        (requestedIdsForTraveler && Array.isArray(requestedIdsForTraveler)
          ? requestedIdsForTraveler
          : requestedIdsApp) || [];


      const defaultAllowedIds = activeProductFields.map((f) => f.id);
      const isResubmissionPhase =
        application.status === 'resubmission' ||
        application.status === 'Additional Info required';


      const allowedIds: Array<number> =
        allowedIdsFromRequests.length > 0
          ? allowedIdsFromRequests // NEW: Priority 1
          : adminAllowedIds.length > 0
            ? adminAllowedIds // Priority 2
            : requestedIds.length > 0
              ? requestedIds // Priority 3 (backward compatibility)
              : isResubmissionPhase
                ? [] // In resubmission without explicit requests, accept none
                : defaultAllowedIds; // Priority 4


      // Separate passport fields (string IDs starting with '_') from regular fields
      const passportFields: typeof submitDto.responses = [];
      const regularFields: typeof submitDto.responses = [];

      // Extract passport data immediately (before any filtering/modification)
      const extractedPassportData: {
        passportNumber?: string;
        passportExpiryDate?: string;
        residenceCountry?: string;
        hasSchengenVisa?: boolean;
      } = {};

      for (const response of submitDto.responses) {
        // Skip responses with null/undefined fieldId (shouldn't happen if controller preserves them)
        if (response.fieldId === null || response.fieldId === undefined) {
          console.log(`⚠️ [FIELD VALIDATION] Skipping response with null fieldId. Value: ${response.value}`);
          continue;
        }

        if (typeof response.fieldId === 'string' && response.fieldId.startsWith('_')) {
          // Passport field - validate it's a known passport field
          const validPassportFields = ['_passport_number', '_passport_expiry_date', '_residence_country', '_has_schengen_visa'];
          if (validPassportFields.includes(response.fieldId)) {
            passportFields.push(response);

            // Extract passport data immediately while we have the original response
            const fieldIdKey = String(response.fieldId);
            if (fieldIdKey === '_passport_number' && response.value && response.value.trim() !== '') {
              extractedPassportData.passportNumber = response.value.trim();
              console.log(`✅ [EARLY EXTRACTION] Extracted passport number: ${extractedPassportData.passportNumber}`);
            } else if (fieldIdKey === '_passport_expiry_date' && response.value && response.value.trim() !== '') {
              extractedPassportData.passportExpiryDate = response.value.trim();
              console.log(`✅ [EARLY EXTRACTION] Extracted passport expiry date: ${extractedPassportData.passportExpiryDate}`);
            } else if (fieldIdKey === '_residence_country' && response.value && response.value.trim() !== '') {
              extractedPassportData.residenceCountry = response.value.trim();
              console.log(`✅ [EARLY EXTRACTION] Extracted residence country: ${extractedPassportData.residenceCountry}`);
            } else if (fieldIdKey === '_has_schengen_visa' && response.value !== undefined && response.value !== '' && response.value !== null) {
              const value = String(response.value);
              extractedPassportData.hasSchengenVisa = value === 'yes' || value === 'true' || value.toLowerCase() === 'true';
              console.log(`✅ [EARLY EXTRACTION] Extracted hasSchengenVisa: ${extractedPassportData.hasSchengenVisa} (from value: ${value})`);
            }
          } else {
            throw new BadRequestException(
              `Invalid passport field ID: ${response.fieldId}. Valid passport field IDs are: ${validPassportFields.join(', ')}`,
            );
          }
        } else {
          // Regular field - validate it exists
          regularFields.push(response);
        }
      }

      console.log(`📋 [EARLY EXTRACTION] Extracted passport data summary:`, extractedPassportData);

      // Validate all provided regular field IDs exist
      // First, filter out any passport fields that might have slipped through
      const validRegularFields = regularFields.filter((r) => {
        // Exclude passport fields (strings starting with '_')
        if (typeof r.fieldId === 'string' && r.fieldId.startsWith('_')) {
          return false;
        }
        // Exclude NaN values
        const fieldIdNum = typeof r.fieldId === 'number' ? r.fieldId : Number(r.fieldId);
        return !isNaN(fieldIdNum);
      });

      // Declare at function level so they're accessible in the return statement
      const invalidFieldIds: Array<number | string> = [];
      const fieldsToSkip: Array<number | string> = [];
      const skippedFieldsInfo: Array<{ fieldId: number | string; reason: string; targetTravelerId?: number }> = [];

      for (const response of validRegularFields) {
        // Skip if fieldId is null/undefined
        if (response.fieldId === null || response.fieldId === undefined) {
          continue;
        }

        // Ensure fieldId is a number for regular fields
        const fieldIdNum = typeof response.fieldId === 'number' ? response.fieldId : Number(response.fieldId);
        const field = fieldMap.get(fieldIdNum) || fieldMap.get(String(fieldIdNum));

        if (!field) {
          // For negative IDs (admin fields), check if they exist but are for a different traveler/context
          if (fieldIdNum < 0) {
            const adminField = adminFieldsAll.find((f: any) => f.id === fieldIdNum);
            if (adminField) {
              // Field exists but is for a different traveler/context
              // Log warning and skip this field instead of throwing error
              const reason = `Field exists but is for traveler ${adminField.travelerId || 'application'}, current context: ${submitDto.travelerId || 'application'}`;
              console.log(
                `⚠️ Field ${fieldIdNum} (${adminField.question || 'unknown'}) exists but is for ` +
                `traveler ${adminField.travelerId || 'application'}, ` +
                `current submission context: ${submitDto.travelerId || 'application'}. ` +
                `Skipping this field.`
              );
              fieldsToSkip.push(response.fieldId);
              skippedFieldsInfo.push({
                fieldId: response.fieldId,
                reason,
                targetTravelerId: adminField.travelerId,
              });
              continue;
            }
          }

          invalidFieldIds.push(response.fieldId);
        }
      }

      // Remove skipped fields from responses
      if (fieldsToSkip.length > 0) {
        submitDto.responses = submitDto.responses.filter(
          (r) => r.fieldId !== null && r.fieldId !== undefined && !fieldsToSkip.includes(r.fieldId)
        );
        console.log(
          `⚠️ Filtered out ${fieldsToSkip.length} field(s) that don't match the submission context: ${fieldsToSkip.join(', ')}`
        );
      }

      if (invalidFieldIds.length > 0) {
        throw new BadRequestException(
          `Invalid field IDs provided: ${invalidFieldIds.join(', ')}. ` +
          `These fields do not exist or are not active for this visa product/application. ` +
          `Please use the actual field.id values from the API (positive for product fields, negative for admin-requested fields), not array indices.`,
        );
      }

      // Filter out non-requested regular fields (when a restriction exists)
      // Passport fields are always allowed if travelerId is provided
      if (allowedIds.length > 0) {
        submitDto.responses = [
          ...passportFields, // Always include passport fields
          ...validRegularFields.filter((r) => {
            // Convert to number only if it's not already a number
            const fieldIdNum = typeof r.fieldId === 'number' ? r.fieldId : Number(r.fieldId);
            return !isNaN(fieldIdNum) && allowedIds.includes(fieldIdNum);
          }),
        ];
      } else {
        // No restrictions - include all fields
        submitDto.responses = [...passportFields, ...validRegularFields];
      }


      // Required fields validation
      const isRestricted =
        (application.status === 'resubmission' ||
          application.status === 'Additional Info required') ||
        adminAllowedIds.length > 0 ||
        requestedIds.length > 0 ||
        allowedIdsFromRequests.length > 0;


      if (!isRestricted) {
        // Not restricted: validate all required product fields
        const requiredFields = activeProductFields.filter((f) => f.isRequired === true);
        const providedFieldIds = submitDto.responses.map((r) => r.fieldId);
        const providedFieldIdsAsStrings = providedFieldIds.map((id) => String(id));
        const missingRequiredFields = requiredFields.filter(
          (field) =>
            !providedFieldIds.includes(field.id) &&
            !providedFieldIdsAsStrings.includes(String(field.id)),
        );
        if (missingRequiredFields.length > 0) {
          throw new BadRequestException(
            `Missing required fields: ${missingRequiredFields.map((f) => f.question).join(', ')}`,
          );
        }
      } else if (allowedIdsFromRequests.length > 0) {
        // ✅ NEW: Validate required fields from resubmission requests (includes both product and admin fields)
        const providedFieldIds = submitDto.responses.map((r) => r.fieldId);
        const providedFieldIdsAsStrings = providedFieldIds.map((id) => String(id));

        // Get all required fields from the allowed IDs (both product and admin)
        const requiredFields: any[] = [];
        allowedIdsFromRequests.forEach((fieldId) => {
          const field = fieldMap.get(fieldId) || fieldMap.get(String(fieldId));
          if (field && field.isRequired === true) {
            requiredFields.push(field);
          }
        });

        // Check if all required fields are provided
        const missingRequiredFields = requiredFields.filter(
          (field) =>
            !providedFieldIds.includes(field.id) &&
            !providedFieldIdsAsStrings.includes(String(field.id)),
        );

        if (missingRequiredFields.length > 0) {
          throw new BadRequestException(
            `Missing required fields: ${missingRequiredFields.map((f) => f.question).join(', ')}`,
          );
        }
      }


      // Validate each response
      for (const response of submitDto.responses) {
        // Skip validation for passport fields (they're handled separately)
        // Allow empty/null passport field values - they'll be saved as null/empty in the database
        if (typeof response.fieldId === 'string' && response.fieldId.startsWith('_')) {
          // Passport fields can be empty/null during submission
          // They will be saved as-is (empty/null) and can be filled later
          continue; // Skip regular field validation
        }

        // For regular fields, ensure fieldId is a number
        const fieldIdNum = typeof response.fieldId === 'number' ? response.fieldId : Number(response.fieldId);
        if (isNaN(fieldIdNum)) {
          // This shouldn't happen if separation worked correctly, but skip it
          continue;
        }

        const field = fieldMap.get(fieldIdNum) || fieldMap.get(String(fieldIdNum));

        if (!field) {
          continue; // Skip if field not found (shouldn't happen after earlier validation)
        }

        if (field.fieldType === 'upload') {
          // Only require filePath if the field is required
          if (field.isRequired && !response.filePath) {
            throw new BadRequestException(
              `File path is required for upload field: ${field.question}`,
            );
          }
        } else {
          // Only require value if the field is required
          // Allow empty/null values for optional fields
          if (field.isRequired && (response.value === null || response.value === undefined || response.value === '')) {
            throw new BadRequestException(
              `Value is required for field: ${field.question}`,
            );
          }


          if (field.fieldType === 'dropdown') {
            if (!field.options || !field.options.includes(response.value)) {
              throw new BadRequestException(
                `Invalid option for dropdown field: ${field.question}`,
              );
            }
          }
        }
      }


      // Build responses object
      // Store all responses including passport fields (even if empty) so they appear in admin app
      const responses: Record<string, any> = {};
      for (const response of submitDto.responses) {
        const fieldIdKey = String(response.fieldId);

        // Determine if this response has actual data (value or filePath)
        const hasData = (response.value && response.value.trim() !== '') || response.filePath;

        responses[fieldIdKey] = {
          value: response.value || '', // Store empty string if no value (for passport fields)
          filePath: response.filePath,
          fileName: response.fileName,
          fileSize: response.fileSize,
          submittedAt: hasData ? new Date() : null, // Set submittedAt if there's a value or file
        };
      }

      // Ensure passport fields are in responses object (even if they were filtered out earlier)
      // This ensures they're stored in fieldResponses for admin display
      console.log(`🔍 [PASSPORT FIELDS] Processing ${passportFields.length} passport fields:`,
        passportFields.map(f => ({ fieldId: f.fieldId, value: f.value?.substring(0, 50) || '(empty)' }))
      );

      for (const passportResponse of passportFields) {
        const fieldIdKey = String(passportResponse.fieldId);
        // Always add passport fields to responses, even if they already exist (to ensure they're saved)
        const hasData = (passportResponse.value && passportResponse.value.trim() !== '') || passportResponse.filePath;
        responses[fieldIdKey] = {
          value: passportResponse.value || '',
          filePath: passportResponse.filePath,
          fileName: passportResponse.fileName,
          fileSize: passportResponse.fileSize,
          submittedAt: hasData ? new Date() : null,
        };
        console.log(`✅ [PASSPORT FIELD] Added to responses: ${fieldIdKey} = ${passportResponse.value || '(empty)'} (hasData: ${hasData})`);
      }

      // Verify passport fields were added
      const passportKeysAfterAdding = Object.keys(responses).filter(key =>
        key.startsWith('_passport_') || key === '_residence_country' || key === '_has_schengen_visa'
      );
      console.log(`📋 [PASSPORT FIELDS] Passport fields in responses after adding: ${passportKeysAfterAdding.length}`, passportKeysAfterAdding);

      console.log(`📋 [RESPONSES SUMMARY] Total responses keys: ${Object.keys(responses).length}`, Object.keys(responses));


      // Store responses in the appropriate location
      if (submittedTravelerId) {
        // TRAVELER SUBMISSION
        // Fetch application first to use in validation
        const application = await this.applicationRepo.findOne({
          where: { id: submitDto.applicationId },
          relations: ['customer'],
        });

        if (!application) {
          throw new NotFoundException(
            `Application with ID ${submitDto.applicationId} not found`,
          );
        }

        const traveler = await this.travelerRepo.findOne({
          where: { id: submittedTravelerId, applicationId: submitDto.applicationId },
        });


        if (!traveler) {
          throw new NotFoundException(
            `Traveler with ID ${submittedTravelerId} not found for this application`,
          );
        }


        // Validate resubmission target
        // Allow travelers to submit their data even if there are requests for other travelers
        // Only block if there's a specific blocking condition (old system with specific traveler target)
        // New system (resubmissionRequests) allows parallel submissions for different travelers

        // Old system fallback: Only block if old system has a specific traveler request that doesn't match
        if (
          (application.status === 'resubmission' ||
            application.status === 'Additional Info required') &&
          application.resubmissionTarget === 'traveler' &&
          application.resubmissionTravelerId &&
          application.resubmissionTravelerId !== submittedTravelerId &&
          (!application.resubmissionRequests || application.resubmissionRequests.length === 0)
        ) {
          // Old system: Block if there's a specific traveler request that doesn't match
          throw new BadRequestException(
            `Resubmission is requested for traveler ID ${application.resubmissionTravelerId}. Please submit responses for that traveler.`,
          );
        }

        // New system: Allow submissions - travelers can submit their data independently
        // The frontend should handle showing only relevant fields based on resubmissionRequests


        // Initialize and merge responses
        if (!traveler.fieldResponses) {
          traveler.fieldResponses = {};
        }

        // Use the passport data extracted early (before any filtering/modification)
        // This ensures we have the correct data even if passport fields were filtered out later
        console.log(`🔍 [PASSPORT UPDATE] Using early-extracted passport data:`, extractedPassportData);

        // Update traveler passport fields if they were provided in fieldResponses
        // Store passport fields in BOTH passport columns AND fieldResponses (for admin display)
        // Use the early-extracted passport data
        if (extractedPassportData.passportNumber) {
          traveler.passportNumber = extractedPassportData.passportNumber;
          console.log(`💾 Setting traveler.passportNumber = ${traveler.passportNumber}`);
        }
        if (extractedPassportData.passportExpiryDate) {
          traveler.passportExpiryDate = new Date(extractedPassportData.passportExpiryDate);
          console.log(`💾 Setting traveler.passportExpiryDate = ${traveler.passportExpiryDate}`);
        }
        if (extractedPassportData.residenceCountry) {
          traveler.residenceCountry = extractedPassportData.residenceCountry;
          console.log(`💾 Setting traveler.residenceCountry = ${traveler.residenceCountry}`);
        }
        if (extractedPassportData.hasSchengenVisa !== undefined) {
          traveler.hasSchengenVisa = extractedPassportData.hasSchengenVisa;
          console.log(`💾 Setting traveler.hasSchengenVisa = ${traveler.hasSchengenVisa}`);
        }

        // Store ALL responses in fieldResponses (including passport fields)
        // This allows admin to see all responses together, including passport fields
        // Passport fields are also stored in actual passport columns for easy querying
        traveler.fieldResponses = { ...traveler.fieldResponses, ...responses };
        traveler.notes = null as any;

        // Log traveler state before save
        console.log(`💾 Traveler before save:`, {
          id: traveler.id,
          passportNumber: traveler.passportNumber,
          passportExpiryDate: traveler.passportExpiryDate,
          residenceCountry: traveler.residenceCountry,
          hasSchengenVisa: traveler.hasSchengenVisa,
        });

        // Save traveler with all responses
        const savedTraveler = await this.travelerRepo.save(traveler);

        // Verify the save was successful
        if (!savedTraveler) {
          throw new BadRequestException('Failed to save traveler responses');
        }

        // Log traveler state after save
        console.log(`✅ Traveler after save:`, {
          id: savedTraveler.id,
          passportNumber: savedTraveler.passportNumber,
          passportExpiryDate: savedTraveler.passportExpiryDate,
          residenceCountry: savedTraveler.residenceCountry,
          hasSchengenVisa: savedTraveler.hasSchengenVisa,
        });

        // If this traveler is the customer (first traveler), also update customer passport fields
        // ✅ Match by email (most reliable) - don't use customer.fullname comparison
        // customer.fullname is the account username, not the traveler's name
        // Application is already fetched above
        if (application && application.customer) {
          // Check if this traveler matches the customer (first traveler)
          // Primary match: by email (most reliable)
          const isCustomerTraveler = traveler.email && application.customer.email &&
            traveler.email === application.customer.email;

          if (isCustomerTraveler) {
            // Update customer passport fields using early-extracted data
            if (extractedPassportData.passportNumber) {
              application.customer.passportNumber = extractedPassportData.passportNumber;
            }
            if (extractedPassportData.passportExpiryDate) {
              application.customer.passportExpiryDate = new Date(extractedPassportData.passportExpiryDate);
            }
            if (extractedPassportData.residenceCountry) {
              application.customer.residenceCountry = extractedPassportData.residenceCountry;
            }
            if (extractedPassportData.hasSchengenVisa !== undefined) {
              application.customer.hasSchengenVisa = extractedPassportData.hasSchengenVisa;
            }
            await this.customerRepo.save(application.customer);
          }
        }


        // ✅ RE-FETCH APPLICATION
        const updatedApplication = await this.applicationRepo.findOne({
          where: { id: submitDto.applicationId },
          relations: ['visaProduct', 'travelers', 'customer'],
        });


        if (!updatedApplication) {
          throw new NotFoundException(
            `Application with ID ${submitDto.applicationId} not found`,
          );
        }


        // ✅ NEW: Check and fulfill resubmission requests (Option B)
        if (updatedApplication.status === 'resubmission' && updatedApplication.resubmissionRequests) {
          // Get submitted field IDs (handle both string and number keys, including negative IDs)
          const submittedFieldIds = Object.keys(responses).map(id => {
            // Handle negative field IDs properly (e.g., "-1" -> -1)
            const numId = Number(id);
            return isNaN(numId) ? id : numId;
          });

          console.log(`🔍 [FULFILLMENT CHECK] Submitted field IDs:`, submittedFieldIds);
          console.log(`🔍 [FULFILLMENT CHECK] Responses keys:`, Object.keys(responses));

          let anyRequestFulfilled = false;


          // Find and mark fulfilled requests for this traveler
          for (const request of updatedApplication.resubmissionRequests) {
            if (request.fulfilledAt) continue; // Skip already fulfilled


            if (request.target === 'traveler' && request.travelerId === submittedTravelerId) {
              console.log(`🔍 [FULFILLMENT CHECK] Checking request ${request.id} with fieldIds:`, request.fieldIds);

              // Check if all requested fields were submitted (handle both positive and negative IDs)
              const allFieldsSubmitted = request.fieldIds.every(fieldId => {
                // Check both as number and as string key
                const found = submittedFieldIds.includes(fieldId) ||
                  submittedFieldIds.includes(String(fieldId)) ||
                  Object.keys(responses).includes(String(fieldId));

                if (!found) {
                  console.log(`❌ Field ${fieldId} not found in submitted responses`);
                }
                return found;
              });

              console.log(`🔍 [FULFILLMENT CHECK] Request ${request.id} - allFieldsSubmitted: ${allFieldsSubmitted}`);

              if (allFieldsSubmitted) {
                request.fulfilledAt = new Date().toISOString();
                anyRequestFulfilled = true;
                console.log(`✅ Resubmission request ${request.id} fulfilled for traveler ${submittedTravelerId}`);
              }
            }
          }


          // Check if ALL requests are now fulfilled
          const allRequestsFulfilled = updatedApplication.resubmissionRequests.every(
            (req) => req.fulfilledAt
          );


          if (allRequestsFulfilled) {
            console.log('✅ All resubmission requests fulfilled, changing status to processing');
            updatedApplication.status = 'processing';
            updatedApplication.resubmissionRequests = null;
            // Clear backward compatibility fields
            updatedApplication.resubmissionTarget = null;
            updatedApplication.resubmissionTravelerId = null;
            updatedApplication.requestedFieldIds = null;
          }


          await this.applicationRepo.save(updatedApplication);

          // Send email confirmation when status changes to processing
          if (allRequestsFulfilled) {
            // Re-fetch with customer relation
            const appWithCustomer = await this.applicationRepo.findOne({
              where: { id: updatedApplication.id },
              relations: ['customer'],
            });
            if (appWithCustomer?.customer?.email) {
              const frontendUrl = this.getFrontendUrl();
              const trackingUrl = `${frontendUrl}/track/${appWithCustomer.applicationNumber}`;
              this.emailService.sendDocumentSubmissionEmail(
                appWithCustomer.customer.email,
                appWithCustomer.customer.fullname,
                appWithCustomer.applicationNumber,
                trackingUrl,
              ).catch(error => {
                console.error('Failed to send document submission email:', error);
              });
            }
          }

        } else if (updatedApplication.status === 'resubmission' ||
          updatedApplication.status === 'Additional Info required') {
          // ✅ BACKWARD COMPATIBILITY: Handle old single-request structure (Option A)
          const previousStatus = updatedApplication.status;
          updatedApplication.status = 'processing';
          updatedApplication.resubmissionTarget = null as any;
          updatedApplication.resubmissionTravelerId = null as any;
          updatedApplication.notes = null as any;
          if (updatedApplication.requestedFieldIdsByTraveler) {
            delete updatedApplication.requestedFieldIdsByTraveler[String(submittedTravelerId)];
          }
          if (Array.isArray(updatedApplication.adminRequestedFields) && updatedApplication.adminRequestedFields.length > 0) {
            updatedApplication.adminRequestedFields = updatedApplication.adminRequestedFields.filter(
              (f: any) => f.travelerId !== submittedTravelerId,
            );
          }
          await this.applicationRepo.save(updatedApplication);

          // Send email confirmation when customer submits additional info
          if (previousStatus === 'Additional Info required') {
            // Re-fetch with customer relation
            const appWithCustomer = await this.applicationRepo.findOne({
              where: { id: updatedApplication.id },
              relations: ['customer'],
            });
            if (appWithCustomer?.customer?.email) {
              const frontendUrl = this.getFrontendUrl();
              const trackingUrl = `${frontendUrl}/track/${appWithCustomer.applicationNumber}`;
              this.emailService.sendDocumentSubmissionEmail(
                appWithCustomer.customer.email,
                appWithCustomer.customer.fullname,
                appWithCustomer.applicationNumber,
                trackingUrl,
              ).catch(error => {
                console.error('Failed to send document submission email:', error);
              });
            }
          }
        }


      } else {
        // APPLICATION-LEVEL SUBMISSION
        if (
          application.fieldResponses &&
          typeof application.fieldResponses === 'object' &&
          ('application' in application.fieldResponses || 'travelers' in application.fieldResponses)
        ) {
          application.fieldResponses = (application.fieldResponses as any).application || {};
        }


        // Validate resubmission target (backward compatibility + new system)
        // IMPORTANT: For traveler 1, application-level submissions (travelerId: null) ARE the correct way to submit
        // Allow application-level submissions if:
        // 1. There's an unfulfilled request for traveler 1 (travelerId: null)
        // 2. OR there are no unfulfilled requests at all
        // Block application-level submissions ONLY if:
        // - There are unfulfilled requests ONLY for specific travelers (numeric IDs)
        // - AND there's NO unfulfilled request for traveler 1

        // Check NEW system: resubmissionRequests array
        if (application.resubmissionRequests && application.resubmissionRequests.length > 0) {
          const travelersInDB = application.travelers?.length || 0;
          const isTraveler1Missing = application.numberOfTravelers > travelersInDB;

          // Check for unfulfilled requests for traveler 1 (null/undefined travelerId)
          const traveler1Requests = application.resubmissionRequests.filter((req) => {
            if (req.fulfilledAt) return false;
            const isTraveler1Request = req.target === 'application' ||
              (req.target === 'traveler' && (req.travelerId === null || req.travelerId === undefined) && isTraveler1Missing);
            return isTraveler1Request;
          });

          // Check for unfulfilled requests for specific travelers (numeric IDs)
          const specificTravelerRequests = application.resubmissionRequests.filter((req) => {
            if (req.fulfilledAt) return false;
            const isSpecificTravelerRequest = req.target === 'traveler' &&
              req.travelerId !== null &&
              req.travelerId !== undefined &&
              typeof req.travelerId === 'number';
            return isSpecificTravelerRequest;
          });

          // Allow application-level submissions even if there are traveler-specific requests
          // The frontend should handle showing only relevant fields based on resubmissionRequests
          // Travelers can submit their data independently - no blocking needed here
        }

        // Check OLD system: resubmissionTarget and resubmissionTravelerId
        // Only block if old system is used AND there's a numeric travelerId (specific traveler, not traveler 1)
        const hasOldSystemSpecificTraveler = (
          (application.status === 'resubmission' ||
            application.status === 'Additional Info required') &&
          application.resubmissionTarget === 'traveler' &&
          application.resubmissionTravelerId &&
          typeof application.resubmissionTravelerId === 'number' &&
          (!application.resubmissionRequests || application.resubmissionRequests.length === 0)
        );

        // Block only if old system has a specific traveler request
        if (hasOldSystemSpecificTraveler) {
          throw new BadRequestException(
            `Resubmission is requested for traveler ID ${application.resubmissionTravelerId}. Please submit traveler-specific responses.`,
          );
        }


        // Initialize and merge responses
        if (!application.fieldResponses) {
          application.fieldResponses = {};
        }

        // Log what's being saved
        const passportFieldsInResponses = Object.keys(responses).filter(key =>
          key.startsWith('_passport_') || key === '_residence_country' || key === '_has_schengen_visa'
        );
        console.log(`📋 [APPLICATION-LEVEL] Saving to application.fieldResponses:`, {
          totalResponses: Object.keys(responses).length,
          passportFields: passportFieldsInResponses,
          passportFieldValues: passportFieldsInResponses.map(key => ({
            key,
            value: responses[key]?.value,
            submittedAt: responses[key]?.submittedAt
          })),
          extractedPassportData: extractedPassportData ? {
            passportNumber: extractedPassportData.passportNumber,
            passportExpiryDate: extractedPassportData.passportExpiryDate,
            residenceCountry: extractedPassportData.residenceCountry,
            hasSchengenVisa: extractedPassportData.hasSchengenVisa
          } : null
        });

        // ✅ CRITICAL: Ensure passport fields are explicitly included in responses before saving
        // This is for traveler 1 (customer traveler) - passport details should be in application.fieldResponses
        if (extractedPassportData) {
          console.log(`🔍 [APPLICATION-LEVEL PASSPORT] Processing extractedPassportData:`, extractedPassportData);
          // Explicitly add passport fields to responses if they exist in extractedPassportData
          // This ensures they're saved to application.fieldResponses even if they weren't in the original responses object
          const passportFieldKeys = ['_passport_number', '_passport_expiry_date', '_residence_country', '_has_schengen_visa'];
          passportFieldKeys.forEach(key => {
            let value: string | null = null;
            if (key === '_passport_number' && extractedPassportData.passportNumber) {
              value = extractedPassportData.passportNumber;
            } else if (key === '_passport_expiry_date' && extractedPassportData.passportExpiryDate) {
              value = extractedPassportData.passportExpiryDate;
            } else if (key === '_residence_country' && extractedPassportData.residenceCountry) {
              value = extractedPassportData.residenceCountry;
            } else if (key === '_has_schengen_visa' && extractedPassportData.hasSchengenVisa !== undefined) {
              value = extractedPassportData.hasSchengenVisa ? 'yes' : 'no';
            }

            // ✅ ALWAYS add/overwrite passport fields if we have a value from extractedPassportData
            // This ensures they're saved even if they already exist in responses
            if (value) {
              responses[key] = {
                value: value,
                filePath: responses[key]?.filePath || null,
                fileName: responses[key]?.fileName || null,
                fileSize: responses[key]?.fileSize || null,
                submittedAt: new Date(),
              };
              console.log(`✅ [APPLICATION-LEVEL PASSPORT] Added/updated passport field ${key} in responses: ${value}`);
            } else {
              console.log(`⚠️ [APPLICATION-LEVEL PASSPORT] No value found for passport field ${key} in extractedPassportData`);
            }
          });
          console.log(`📋 [APPLICATION-LEVEL PASSPORT] Passport fields in responses object after processing:`,
            Object.keys(responses).filter(k => k.startsWith('_passport_') || k === '_residence_country' || k === '_has_schengen_visa')
          );
        } else {
          console.log(`⚠️ [APPLICATION-LEVEL PASSPORT] No extractedPassportData found - passport fields might not be saved`);
        }

        // Save to application.fieldResponses (this is where traveler 1's data is stored)
        // Verify all passport fields are in responses before merging
        const passportKeysBeforeMerge = Object.keys(responses).filter(key =>
          key.startsWith('_passport_') || key === '_residence_country' || key === '_has_schengen_visa'
        );
        console.log(`📋 [APPLICATION-LEVEL] Passport fields in responses object BEFORE merge with application.fieldResponses:`, {
          count: passportKeysBeforeMerge.length,
          keys: passportKeysBeforeMerge,
          values: passportKeysBeforeMerge.map(key => ({
            key,
            value: responses[key]?.value,
            submittedAt: responses[key]?.submittedAt
          }))
        });

        application.fieldResponses = { ...application.fieldResponses, ...responses };

        // Verify passport fields are included
        const passportFieldsAfterMerge = Object.keys(application.fieldResponses || {}).filter(key =>
          key.startsWith('_passport_') || key === '_residence_country' || key === '_has_schengen_visa'
        );
        console.log(`✅ [APPLICATION-LEVEL] Passport fields in application.fieldResponses after merge:`, {
          count: passportFieldsAfterMerge.length,
          keys: passportFieldsAfterMerge,
          values: passportFieldsAfterMerge.map(key => ({
            key,
            value: application.fieldResponses?.[key]?.value,
            submittedAt: application.fieldResponses?.[key]?.submittedAt
          }))
        });

        // ✅ CRITICAL: For application-level submissions, also save passport fields to customer table
        // This is for traveler 1 (customer traveler) who submits passport info via additional info form
        if (application.customer && extractedPassportData) {
          console.log(`🔍 [APPLICATION-LEVEL PASSPORT] Updating customer passport fields:`, extractedPassportData);

          let customerUpdated = false;
          if (extractedPassportData.passportNumber) {
            application.customer.passportNumber = extractedPassportData.passportNumber;
            customerUpdated = true;
            console.log(`💾 Setting customer.passportNumber = ${extractedPassportData.passportNumber}`);
          }
          if (extractedPassportData.passportExpiryDate) {
            application.customer.passportExpiryDate = new Date(extractedPassportData.passportExpiryDate);
            customerUpdated = true;
            console.log(`💾 Setting customer.passportExpiryDate = ${extractedPassportData.passportExpiryDate}`);
          }
          if (extractedPassportData.residenceCountry) {
            application.customer.residenceCountry = extractedPassportData.residenceCountry;
            customerUpdated = true;
            console.log(`💾 Setting customer.residenceCountry = ${extractedPassportData.residenceCountry}`);
          }
          if (extractedPassportData.hasSchengenVisa !== undefined) {
            application.customer.hasSchengenVisa = extractedPassportData.hasSchengenVisa;
            customerUpdated = true;
            console.log(`💾 Setting customer.hasSchengenVisa = ${extractedPassportData.hasSchengenVisa}`);
          }

          if (customerUpdated) {
            await this.customerRepo.save(application.customer);
            console.log(`✅ [APPLICATION-LEVEL PASSPORT] Customer passport fields saved successfully`);
          }
        }


        // ✅ NEW: Check and fulfill resubmission requests (Option B)
        if (application.status === 'resubmission' && application.resubmissionRequests) {
          // Get submitted field IDs (handle both string and number keys, including negative IDs)
          const submittedFieldIds = Object.keys(responses).map(id => {
            // Handle negative field IDs properly (e.g., "-1" -> -1)
            const numId = Number(id);
            return isNaN(numId) ? id : numId;
          });

          console.log(`🔍 [FULFILLMENT CHECK] Submitted field IDs:`, submittedFieldIds);
          console.log(`🔍 [FULFILLMENT CHECK] Responses keys:`, Object.keys(responses));

          // Determine if traveler 1 is missing (for application-level submissions)
          const travelersInDB = application.travelers?.length || 0;
          const isTraveler1Missing = application.numberOfTravelers > travelersInDB;

          // ✅ CRITICAL: Create new array reference BEFORE modifying to ensure TypeORM detects changes in JSONB column
          if (application.resubmissionRequests) {
            application.resubmissionRequests = [...application.resubmissionRequests];
            console.log(`💾 [FULFILLMENT] Created new array reference for resubmissionRequests to ensure TypeORM detects changes`);
          }

          // Find and mark fulfilled requests for application-level submissions
          // This includes both application-level requests AND traveler 1 requests (travelerId: null)
          for (const request of application.resubmissionRequests) {
            if (request.fulfilledAt) continue;

            // Check if this request is for application-level or traveler 1 (when traveler 1 is missing)
            const isApplicationRequest = request.target === 'application';
            const isTraveler1Request = request.target === 'traveler' &&
              (request.travelerId === null || request.travelerId === undefined) &&
              isTraveler1Missing;

            if (isApplicationRequest || isTraveler1Request) {
              console.log(`🔍 [FULFILLMENT CHECK] Checking request ${request.id} (${isApplicationRequest ? 'application-level' : 'traveler 1'}) with fieldIds:`, request.fieldIds);

              // Check if all requested fields were submitted (handle both positive and negative IDs)
              const allFieldsSubmitted = request.fieldIds.every(fieldId => {
                // Check both as number and as string key
                const found = submittedFieldIds.includes(fieldId) ||
                  submittedFieldIds.includes(String(fieldId)) ||
                  Object.keys(responses).includes(String(fieldId));

                if (!found) {
                  console.log(`❌ Field ${fieldId} not found in submitted responses`);
                }
                return found;
              });

              console.log(`🔍 [FULFILLMENT CHECK] Request ${request.id} - allFieldsSubmitted: ${allFieldsSubmitted}`);

              if (allFieldsSubmitted) {
                request.fulfilledAt = new Date().toISOString();
                console.log(`✅ Resubmission request ${request.id} fulfilled for ${isApplicationRequest ? 'application' : 'traveler 1'}`);
              }
            }
          }

          // Check if ALL requests are fulfilled
          const allRequestsFulfilled = application.resubmissionRequests.every(
            (req) => req.fulfilledAt
          );


          if (allRequestsFulfilled) {
            console.log('✅ All resubmission requests fulfilled, changing status to processing');
            application.status = 'processing';
            application.resubmissionRequests = null;
            // Clear backward compatibility fields
            application.resubmissionTarget = null;
            application.resubmissionTravelerId = null;
            application.requestedFieldIds = null;
          }

          // ✅ CRITICAL: Save application after fulfillment check to persist the fulfilledAt timestamps
          await this.applicationRepo.save(application);
          console.log(`💾 [FULFILLMENT] Application saved after fulfillment check`);

        } else if (application.status === 'resubmission' ||
          application.status === 'Additional Info required') {
          // ✅ BACKWARD COMPATIBILITY: Handle old single-request structure
          const previousStatus = application.status;
          application.status = 'processing';
          application.resubmissionTarget = null as any;
          application.resubmissionTravelerId = null as any;
          application.notes = null as any;
          application.requestedFieldIds = undefined;
          if (Array.isArray(application.adminRequestedFields) && application.adminRequestedFields.length > 0) {
            application.adminRequestedFields = application.adminRequestedFields.filter(
              (f: any) => !!f.travelerId,
            );
          }
          await this.applicationRepo.save(application);

          // Send email confirmation when customer submits additional info
          if (previousStatus === 'Additional Info required' && application.customer?.email) {
            // Re-fetch application with customer relation
            const applicationWithCustomer = await this.applicationRepo.findOne({
              where: { id: application.id },
              relations: ['customer'],
            });

            if (applicationWithCustomer?.customer?.email) {
              const frontendUrl = this.getFrontendUrl();
              const trackingUrl = `${frontendUrl}/track/${applicationWithCustomer.applicationNumber}`;
              this.emailService.sendDocumentSubmissionEmail(
                applicationWithCustomer.customer.email,
                applicationWithCustomer.customer.fullname,
                applicationWithCustomer.applicationNumber,
                trackingUrl,
              ).catch(error => {
                console.error('Failed to send document submission email:', error);
              });
            }
          }
        } else {
          await this.applicationRepo.save(application);
        }
      }


      // Build response with information about filtered fields
      const responseMessage = submitDto.travelerId
        ? 'Traveler field responses submitted successfully'
        : 'Application field responses submitted successfully';

      const responseData: any = {
        status: true,
        message: responseMessage,
        count: Object.keys(responses).length,
        data: responses,
      };

      // Include information about filtered fields if any were skipped
      // Note: fieldsToSkip and skippedFieldsInfo are declared in the validation block above
      // They will be in scope here if the validation code executed
      if (typeof fieldsToSkip !== 'undefined' && fieldsToSkip.length > 0) {
        responseData.filteredFields = skippedFieldsInfo || [];
        responseData.warning = `${fieldsToSkip.length} field(s) were filtered out because they don't match the submission context. These fields should be submitted with the correct traveler ID.`;
        console.log(`📤 Returning response with ${fieldsToSkip.length} filtered fields info:`, skippedFieldsInfo);
      }

      return responseData;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error submitting field responses',
      );
    }
  }

  /**
   * Get field responses for an application
   * Returns both application-level and traveler-specific responses
   * @param applicationId - Application ID
   * @param travelerId - Optional: if provided, returns only responses for this traveler
   */
  async getResponses(applicationId: number, travelerId?: number) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
        relations: ['visaProduct', 'travelers'],
      });

      if (!application) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      // If travelerId is provided, validate it belongs to this application
      if (travelerId) {
        const traveler = application.travelers?.find((t) => t.id === travelerId);
        if (!traveler) {
          throw new NotFoundException(
            `Traveler with ID ${travelerId} not found for this application`,
          );
        }
      }

      // Get active fields sorted by displayOrder
      const fields = (application.visaProduct.fields || [])
        .filter((f) => f.isActive !== false)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      let responses: Record<string | number, any> = {};

      if (travelerId) {
        // Get traveler-specific responses from Traveler entity
        const traveler = await this.travelerRepo.findOne({
          where: { id: travelerId, applicationId },
        });

        if (!traveler) {
          throw new NotFoundException(
            `Traveler with ID ${travelerId} not found for this application`,
          );
        }

        responses = traveler.fieldResponses || {};
      } else {
        // Get application-level responses from VisaApplication entity
        // Handle backward compatibility: migrate old structure if needed
        let fieldResponses = application.fieldResponses || {};


        if (
          fieldResponses &&
          typeof fieldResponses === 'object' &&
          ('application' in fieldResponses || 'travelers' in fieldResponses)
        ) {
          // Migrate from old nested structure to new flat structure
          fieldResponses = (fieldResponses as any).application || {};
        }

        responses = fieldResponses || {};
      }

      // Check if responses are using sequential indices (1, 2, 3, ...) instead of field IDs
      const responseKeys = Object.keys(responses);
      const areSequentialIndices = responseKeys.every((key, index) => {
        const numKey = parseInt(key, 10);
        return !isNaN(numKey) && numKey === index + 1;
      }) && responseKeys.length > 0;

      // Create response map for quick lookup
      const responseMap = new Map<string | number, any>();
      Object.entries(responses).forEach(([key, value]) => {
        responseMap.set(key, value);
        responseMap.set(parseInt(key, 10), value);
      });

      // Convert to array format by iterating over fields (sorted by displayOrder)
      // This ensures correct ordering and handles sequential indices
      const responseArray = fields.map((field, index) => {
        let response: any = null;


        if (areSequentialIndices) {
          // WORKAROUND: If responses are stored with sequential indices, match by position
          // Response "1" maps to fields[0], "2" to fields[1], etc.
          const sequentialKey = String(index + 1);
          response = responseMap.get(sequentialKey) || responseMap.get(index + 1);
        } else {
          // Normal case: Try to find response by field.id
          response = responseMap.get(field.id) || responseMap.get(String(field.id));
        }


        if (response) {
          return {
            fieldId: field.id, // Always return actual field.id
            field: field,
            ...response,
          };
        }
        return null;
      }).filter((r) => r !== null); // Remove fields without responses

      return {
        status: true,
        message: travelerId
          ? 'Traveler field responses retrieved successfully'
          : 'Application field responses retrieved successfully',
        count: responseArray.length,
        data: responseArray,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching field responses',
      );
    }
  }

  /**
   * Get fields for an application with their existing responses (if any)
   * This is useful for showing a form with pre-filled values
   * @param applicationId - Application ID
   * @param travelerId - Optional: if provided, returns fields with responses for this traveler
   */
  async getFieldsWithResponses(applicationId: number, travelerId?: number, isAdminView: boolean = false) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
        relations: ['visaProduct', 'travelers'],
      });


      if (!application) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }


      // If travelerId is provided, validate it belongs to this application
      if (travelerId) {
        const traveler = application.travelers?.find((t) => t.id === travelerId);
        if (!traveler) {
          throw new NotFoundException(
            `Traveler with ID ${travelerId} not found for this application`,
          );
        }
      }


      // Determine if there are admin-only fields for this context
      const adminFieldsAll = Array.isArray(application.adminRequestedFields)
        ? application.adminRequestedFields
        : [];

      console.log(`🔍 [ADMIN FIELDS] Total admin fields in application: ${adminFieldsAll.length}`);
      if (adminFieldsAll.length > 0) {
        console.log(`🔍 [ADMIN FIELDS] Admin field IDs:`, adminFieldsAll.map((f: any) => ({
          id: f.id,
          question: f.question,
          travelerId: f.travelerId,
        })));
      }

      const adminFieldsForContext = adminFieldsAll.filter((f: any) => {
        // For traveler context, include fields targeted to this traveler
        if (travelerId) {
          return f.travelerId === travelerId;
        }
        // For application-level context, include fields without travelerId
        return !f.travelerId;
      });

      console.log(`🔍 [ADMIN FIELDS] Context-filtered admin fields: ${adminFieldsForContext.length} (travelerId: ${travelerId || 'none'})`);


      // Get all active product fields for this visa product
      const productFields = (application.visaProduct.fields || []).filter(
        (f) => f.isActive !== false,
      );


      // Get existing responses
      let responses: Record<string | number, any> = {};
      let currentTraveler: Traveler | null = null;


      if (travelerId) {
        // ✅ CRITICAL: Check if this is traveler 1 (customer traveler)
        // Traveler 1's responses are stored in application.fieldResponses, not in traveler.fieldResponses
        // Other travelers' responses are stored in their respective Traveler records

        // Identify traveler 1 by:
        // 1. First, check if traveler 1 is missing from the DB (numberOfTravelers > travelers.length)
        // 2. If traveler 1 exists, find the earliest traveler (by createdAt) - this is always traveler 1
        // 3. Match with customer email as verification
        let isTraveler1 = false;
        const customerEmail = application.customer?.email;
        const travelersInDB = application.travelers?.length || 0;
        const isTraveler1Missing = application.numberOfTravelers > travelersInDB;

        console.log(`🔍 [TRAVELER IDENTIFICATION] Checking travelerId ${travelerId}: numberOfTravelers=${application.numberOfTravelers}, travelersInDB=${travelersInDB}, isTraveler1Missing=${isTraveler1Missing}`);

        if (isTraveler1Missing) {
          // Traveler 1 doesn't exist in the DB, so the requested travelerId CANNOT be traveler 1
          // (traveler 1 would have travelerId = null/undefined, not a numeric ID)
          console.log(`⚠️ [TRAVELER IDENTIFICATION] Traveler 1 is missing from DB. Requested travelerId ${travelerId} is NOT traveler 1.`);
          isTraveler1 = false;
        } else if (application.travelers && application.travelers.length > 0) {
          // Traveler 1 exists in the DB, so find it
          // Sort travelers by createdAt to find the earliest (traveler 1)
          const sortedTravelers = [...application.travelers].sort((a, b) => {
            const aDate = a.createdAt || new Date(0);
            const bDate = b.createdAt || new Date(0);
            return aDate.getTime() - bDate.getTime();
          });

          const earliestTraveler = sortedTravelers[0];

          // Check if the requested travelerId matches traveler 1
          if (earliestTraveler) {
            // If travelerId matches earliest traveler's ID, it's traveler 1
            if (earliestTraveler.id === travelerId) {
              isTraveler1 = true;
              currentTraveler = earliestTraveler; // For passport field display
              console.log(`✅ [TRAVELER 1] Identified traveler 1 by ID match (ID: ${travelerId})`);
            }
            // Or if earliest traveler matches customer email, it's definitely traveler 1
            else if (customerEmail && earliestTraveler.email === customerEmail) {
              isTraveler1 = true;
              currentTraveler = earliestTraveler; // Use this for passport field display
              console.log(`✅ [TRAVELER 1] Identified traveler 1 by email match (ID: ${earliestTraveler.id}, using application fieldResponses)`);
            }
            // If we haven't identified traveler 1 yet, check if the requested travelerId matches earliest traveler
            else if (!isTraveler1) {
              // Check if there's a Traveler record with this ID
              currentTraveler = await this.travelerRepo.findOne({
                where: { id: travelerId, applicationId },
              });

              // If no Traveler record found but earliest traveler exists, it might be traveler 1
              // However, we can't be sure, so don't mark as traveler 1 unless we're certain
            }
          }
        }

        // If this is NOT traveler 1, get responses from Traveler record
        if (!isTraveler1) {
          // Get traveler-specific responses from Traveler entity
          currentTraveler = await this.travelerRepo.findOne({
            where: { id: travelerId, applicationId },
          });

          if (!currentTraveler) {
            throw new NotFoundException(
              `Traveler with ID ${travelerId} not found for this application`,
            );
          }

          responses = currentTraveler.fieldResponses || {};
          console.log(`✅ [TRAVELER ${travelerId}] Using Traveler record fieldResponses (${Object.keys(responses).length} fields)`);
        } else {
          // ✅ Traveler 1: Use application-level fieldResponses
          let fieldResponses = application.fieldResponses || {};

          // Handle backward compatibility: migrate old structure if needed
          if (
            fieldResponses &&
            typeof fieldResponses === 'object' &&
            ('application' in fieldResponses || 'travelers' in fieldResponses)
          ) {
            // Migrate from old nested structure to new flat structure
            fieldResponses = (fieldResponses as any).application || {};
          }

          responses = fieldResponses || {};
          console.log(`✅ [TRAVELER 1] Using application fieldResponses (${Object.keys(responses).length} fields)`);
        }
      } else {
        // Get application-level responses from VisaApplication entity
        // Handle backward compatibility: migrate old structure if needed
        let fieldResponses = application.fieldResponses || {};


        if (
          fieldResponses &&
          typeof fieldResponses === 'object' &&
          ('application' in fieldResponses || 'travelers' in fieldResponses)
        ) {
          // Migrate from old nested structure to new flat structure
          fieldResponses = (fieldResponses as any).application || {};
        }


        responses = fieldResponses || {};

        // ✅ NEW: Also include traveler responses when querying application-level
        // BUT only include responses for fields that are relevant to application-level context
        // (i.e., product fields or admin fields with travelerId: undefined)
        // This prevents showing responses for traveler-specific admin fields that don't belong here
        if (application.travelers && application.travelers.length > 0) {
          console.log(`🔍 [RESPONSES] Querying application-level, merging responses from ${application.travelers.length} travelers`);

          // Get list of valid field IDs for application-level context
          const validFieldIds = new Set<number | string>();
          // Add all product field IDs
          productFields.forEach(field => {
            validFieldIds.add(field.id);
            validFieldIds.add(String(field.id));
          });
          // Add application-level admin field IDs (travelerId: undefined)
          adminFieldsForContext.forEach((field: any) => {
            validFieldIds.add(field.id);
            validFieldIds.add(String(field.id));
          });
          // Add passport field keys
          validFieldIds.add('_passport_number');
          validFieldIds.add('_passport_expiry_date');
          validFieldIds.add('_residence_country');
          validFieldIds.add('_has_schengen_visa');

          application.travelers.forEach((traveler) => {
            if (traveler.fieldResponses && typeof traveler.fieldResponses === 'object') {
              // Only merge responses for fields that are valid for application-level context
              Object.keys(traveler.fieldResponses).forEach((key) => {
                // Only add if:
                // 1. Not already present (application-level takes precedence)
                // 2. AND the field is valid for application-level context
                if (!responses[key] && validFieldIds.has(key)) {
                  responses[key] = traveler.fieldResponses![key];
                }
              });
            }
          });
          console.log(`✅ [RESPONSES] Merged responses. Total keys: ${Object.keys(responses).length}`);
        }
      }


      // Helper: determine resubmission state
      // Check for resubmission if status is 'resubmission' OR if there are unfulfilled resubmission requests
      const hasUnfulfilledRequests = application.resubmissionRequests &&
        application.resubmissionRequests.some((req) => !req.fulfilledAt);
      const isResubmissionState = application.status === 'resubmission' || hasUnfulfilledRequests;

      console.log('🔄 [RESUBMISSION CHECK]', {
        applicationId,
        travelerId,
        status: application.status,
        hasResubmissionRequests: !!application.resubmissionRequests,
        resubmissionRequestsCount: application.resubmissionRequests?.length || 0,
        hasUnfulfilledRequests,
        isResubmissionState,
      });

      // ✅ NEW: Get field IDs from resubmission requests (Option B - supports both product and admin fields)
      // Check for resubmission requests even if status is not 'resubmission' (handle edge cases)
      let requestedFieldIdsFromRequests: number[] = [];

      // Determine if traveler 1 is missing (for matching null travelerId requests)
      const travelersInDB = application.travelers?.length || 0;
      const isTraveler1Missing = application.numberOfTravelers > travelersInDB;

      if (application.resubmissionRequests && application.resubmissionRequests.length > 0) {
        const relevantRequests = application.resubmissionRequests.filter((req) => {
          if (req.fulfilledAt) {
            console.log(`⏭️ Skipping fulfilled request ${req.id}`);
            return false; // Skip fulfilled requests
          }

          if (travelerId) {
            // For traveler context - match specific traveler ID
            const matches = req.target === 'traveler' && req.travelerId === travelerId;
            if (matches) {
              console.log(`✅ Found relevant traveler request ${req.id} with ${req.fieldIds.length} field IDs`);
            }
            return matches;
          } else {
            // For application-level context - match both:
            // 1. Application-level requests (target === 'application')
            // 2. Traveler requests for traveler 1 (target === 'traveler' && travelerId === null) when traveler 1 is missing
            const isApplicationRequest = req.target === 'application';
            const isTraveler1Request = req.target === 'traveler' && (req.travelerId === null || req.travelerId === undefined) && isTraveler1Missing;
            const matches = isApplicationRequest || isTraveler1Request;
            if (matches) {
              console.log(`✅ Found relevant request ${req.id} (${isApplicationRequest ? 'application-level' : 'traveler 1 with null ID'}) with ${req.fieldIds.length} field IDs`);
            }
            return matches;
          }
        });

        // Collect all field IDs from relevant requests (includes both positive and negative IDs)
        relevantRequests.forEach((req) => {
          requestedFieldIdsFromRequests.push(...req.fieldIds);
        });

        console.log('🔄 [RESUBMISSION FIELDS]', {
          relevantRequestsCount: relevantRequests.length,
          totalFieldIds: requestedFieldIdsFromRequests.length,
          fieldIds: requestedFieldIdsFromRequests,
        });
      }

      // ✅ NEW LOGIC: Build combined fields from both product fields and admin fields
      // Only restrict to requested fields if:
      // 1. There are unfulfilled resubmission requests
      // 2. AND we have requested field IDs for this context
      // Otherwise, show all fields with responses (for admin viewing)
      let combinedFields: any[] = [];

      // Check if we should restrict fields (only when user is filling resubmission form)
      // Admin viewing should always see all fields
      // Only restrict when:
      // 1. NOT in admin view mode (explicitly set or inferred from undefined travelerId)
      // 2. There are unfulfilled requests
      // 3. We have requested field IDs for this specific context
      // 4. AND we're querying for a specific traveler context (travelerId was explicitly provided, even if null for traveler 1)
      // Application-level queries (travelerId is undefined) are typically for admin viewing, so always show all fields
      // Note: travelerId can be null for traveler 1, but undefined means no travelerId was provided (admin viewing)
      const isSpecificTravelerQuery = travelerId !== undefined; // null is a valid travelerId for traveler 1, undefined means no travelerId provided
      // If travelerId is undefined, treat as admin view (application-level query for viewing)
      const effectiveAdminView = isAdminView || !isSpecificTravelerQuery;
      const shouldRestrictFields = !effectiveAdminView && // Never restrict in admin view mode
        hasUnfulfilledRequests &&
        requestedFieldIdsFromRequests.length > 0 &&
        isSpecificTravelerQuery;

      console.log(`🔍 [FIELD RESTRICTION CHECK]`, {
        travelerId,
        isAdminView,
        isSpecificTravelerQuery,
        hasUnfulfilledRequests,
        requestedFieldIdsCount: requestedFieldIdsFromRequests.length,
        shouldRestrictFields,
      });

      if (shouldRestrictFields) {
        // RESUBMISSION MODE: Only show requested fields (user filling form)
        console.log(`🔄 [RESUBMISSION MODE] Showing only ${requestedFieldIdsFromRequests.length} requested fields for user to fill`);

        // 1. Add only requested product fields
        const requestedProductFields = productFields.filter((field) =>
          requestedFieldIdsFromRequests.includes(field.id)
        );
        combinedFields.push(...requestedProductFields.map((field) => {
          const response = responses[field.id] || responses[String(field.id)];
          return {
            ...field,
            response: response
              ? {
                value: response.value,
                filePath: response.filePath,
                fileName: response.fileName,
                fileSize: response.fileSize,
                submittedAt: response.submittedAt,
              }
              : null,
            editable: true,
            source: 'product',
            isResubmissionRequested: true,
          };
        }));

        // 2. Add only requested admin fields
        if (adminFieldsAll.length > 0) {
          const requestedAdminFields = adminFieldsAll.filter((field: any) =>
            requestedFieldIdsFromRequests.includes(field.id)
          );
          combinedFields.push(...requestedAdminFields.map((field: any) => {
            const response = responses[field.id] || responses[String(field.id)];
            return {
              ...field,
              response: response
                ? {
                  value: response.value,
                  filePath: response.filePath,
                  fileName: response.fileName,
                  fileSize: response.fileSize,
                  submittedAt: response.submittedAt,
                }
                : null,
              editable: true,
              source: 'admin',
              isResubmissionRequested: true,
            };
          }));
        }
      } else {
        // NOT RESTRICTING: Show all fields (admin viewing - including modal for selecting fields)
        console.log(`📋 [VIEW MODE] Showing all fields (admin view - includes fields with and without responses)`);

        // 1. Add ALL product fields (with or without responses - for admin viewing and modal selection)
        productFields.forEach((field) => {
          const response = responses[field.id] || responses[String(field.id)];

          combinedFields.push({
            ...field,
            response: response
              ? {
                value: response.value,
                filePath: response.filePath,
                fileName: response.fileName,
                fileSize: response.fileSize,
                submittedAt: response.submittedAt,
              }
              : null,
            editable: false, // Read-only in admin view
            source: 'product',
          });
        });

        // 2. Add admin fields
        // When querying application-level (no travelerId), return ALL admin fields so frontend can match responses
        // When querying for a specific traveler, only return fields for that traveler
        const adminFieldsToAdd = !travelerId && !shouldRestrictFields
          ? adminFieldsAll  // Return all admin fields for application-level queries
          : adminFieldsForContext;  // Return context-filtered fields for traveler-specific queries

        if (adminFieldsToAdd.length > 0) {
          const processedAdminFieldIds = new Set<number>();

          adminFieldsToAdd.forEach((field: any) => {
            if (!processedAdminFieldIds.has(field.id)) {
              processedAdminFieldIds.add(field.id);

              const response = responses[field.id] || responses[String(field.id)];

              // Ensure we have the question text for display
              // Admin fields should have a 'question' property
              const questionText = field.question || field.questionText || `Field ${field.id}`;

              // Log to debug missing question text
              if (!field.question && !field.questionText) {
                console.log(`⚠️ [ADMIN FIELD] Field ${field.id} missing question text. Field structure:`, Object.keys(field));
              }

              combinedFields.push({
                id: field.id,
                question: questionText,
                questionText: questionText, // Frontend may use this
                fieldType: field.fieldType || 'text',
                placeholder: field.placeholder,
                isRequired: field.isRequired ?? false,
                displayOrder: field.displayOrder ?? 0,
                options: field.options,
                allowedFileTypes: field.allowedFileTypes,
                maxFileSizeMB: field.maxFileSizeMB,
                minLength: field.minLength,
                maxLength: field.maxLength,
                isActive: field.isActive !== false,
                travelerId: field.travelerId,
                source: 'admin',
                response: response
                  ? {
                    value: response.value,
                    filePath: response.filePath,
                    fileName: response.fileName,
                    fileSize: response.fileSize,
                    submittedAt: response.submittedAt,
                  }
                  : null,
                editable: false, // Read-only in admin view
              });
            }
          });

          console.log(`🔍 [ADMIN FIELDS] Added ${processedAdminFieldIds.size} admin fields (with and without responses) for context: travelerId=${travelerId || 'application'} (${!travelerId && !shouldRestrictFields ? 'all fields' : 'context-filtered'})`);
        }
      }


      // ✅ BACKWARD COMPATIBILITY: Handle old resubmission system (Option A)
      if (isResubmissionState && requestedFieldIdsFromRequests.length === 0) {
        // Old system: use resubmissionTarget and requestedFieldIds
        let requestedFieldIds: number[] = [];

        if (!travelerId) {
          // We're getting application-level fields
          if (application.resubmissionTarget === 'application') {
            requestedFieldIds = Array.isArray(application.requestedFieldIds)
              ? application.requestedFieldIds
              : [];
          }
        } else {
          // We're getting traveler-level fields
          if (
            application.resubmissionTarget === 'traveler' &&
            Number(application.resubmissionTravelerId) === Number(travelerId)
          ) {
            requestedFieldIds = Array.isArray(application.requestedFieldIds)
              ? application.requestedFieldIds
              : [];
          }
        }

        if (requestedFieldIds.length > 0) {
          // Show only requested product fields (overwrite combinedFields for old resubmission system)
          const requestedProductFields = productFields.filter((field) =>
            requestedFieldIds.includes(field.id)
          );
          combinedFields = requestedProductFields.map((field) => {
            const response = responses[field.id] || responses[String(field.id)];
            return {
              ...field,
              response: response
                ? {
                  value: response.value,
                  filePath: response.filePath,
                  fileName: response.fileName,
                  fileSize: response.fileSize,
                  submittedAt: response.submittedAt,
                }
                : null,
              editable: true,
              source: 'product',
            };
          });
          // Note: Admin fields are not included in old resubmission system
        }
      }

      // ✅ NEW: Add passport fields if traveler has missing passport information
      // Check both fieldResponses and actual passport fields to determine what's missing
      // Also handle customer (first traveler) who might not have a Traveler record
      // Handle both traveler-specific queries (travelerId provided) and application-level queries (travelerId = null, but traveler 1 is missing)
      // Reuse travelersInDB and isTraveler1Missing already calculated above for resubmission matching (declared at line ~1739)

      // Determine which traveler/passport source to use:
      // 1. If travelerId provided and traveler exists: use that traveler
      // 2. If travelerId is null/undefined AND traveler 1 is missing: use customer data + application.fieldResponses
      let passportSource: { passportNumber?: string; passportExpiryDate?: Date; residenceCountry?: string; hasSchengenVisa?: boolean; fieldResponses?: any } | null = null;

      if (travelerId && currentTraveler) {
        // Case 1: Traveler-specific query with valid traveler
        passportSource = currentTraveler;
        console.log(`🔍 [PASSPORT SOURCE] Using traveler-specific source (travelerId: ${travelerId})`);
      } else if (!travelerId && isTraveler1Missing && application.customer) {
        // Case 2: Application-level query, but traveler 1 is missing - use customer data
        const appFieldResponses = application.fieldResponses || {};
        passportSource = {
          passportNumber: application.customer.passportNumber || undefined,
          passportExpiryDate: application.customer.passportExpiryDate || undefined,
          residenceCountry: application.customer.residenceCountry || undefined,
          hasSchengenVisa: application.customer.hasSchengenVisa !== null && application.customer.hasSchengenVisa !== undefined ? application.customer.hasSchengenVisa : undefined,
          fieldResponses: appFieldResponses, // Use application-level fieldResponses for traveler 1
        };
        console.log(`🔍 [PASSPORT SOURCE] Using application-level source for traveler 1 (missing from DB). FieldResponses keys: ${Object.keys(appFieldResponses).length}`, Object.keys(appFieldResponses));
      } else {
        console.log(`⚠️ [PASSPORT SOURCE] No passport source found. travelerId: ${travelerId}, isTraveler1Missing: ${isTraveler1Missing}, hasCustomer: ${!!application.customer}`);
      }

      if (passportSource) {
        const traveler = passportSource;

        // ✅ Removed: Countries fetching for residence country dropdown (now text field)
        // const countries = await this.countriesService.findAll();
        // const countryOptions = countries.map((c: any) => c.countryName);

        const passportFieldDefinitions = [
          {
            key: '_passport_number',
            question: '_passport_number', // Backend key for identification
            questionText: 'Passport Number', // Display text
            fieldType: 'text',
            displayOrder: -100, // Show at the top
            checkMissing: () => !traveler.passportNumber,
          },
          {
            key: '_passport_expiry_date',
            question: '_passport_expiry_date', // Backend key for identification
            questionText: 'Passport Expiration Date', // Display text
            fieldType: 'date',
            displayOrder: -99,
            checkMissing: () => !traveler.passportExpiryDate,
          },
          {
            key: '_residence_country',
            question: '_residence_country', // Backend key for identification
            questionText: 'Residence Country', // Display text
            fieldType: 'text', // Changed from dropdown to text
            options: null, // Explicitly null for text field (not undefined)
            displayOrder: -98,
            checkMissing: () => !traveler.residenceCountry,
          },
          {
            key: '_has_schengen_visa',
            question: '_has_schengen_visa', // Backend key for identification
            questionText: 'Do you have a valid visa or residence permit from the Schengen Area, USA, Australia, Canada, UK, Japan, Norway, New Zealand, Ireland, or Switzerland?', // Full display text
            fieldType: 'dropdown',
            options: ['yes', 'no'],
            displayOrder: -97,
            checkMissing: () => traveler.hasSchengenVisa === null || traveler.hasSchengenVisa === undefined,
          },
        ];

        passportFieldDefinitions.forEach((fieldDef) => {
          const fieldResponses = traveler.fieldResponses || {};
          const existsInFieldResponses = fieldResponses && fieldResponses[fieldDef.key];
          const isMissing = fieldDef.checkMissing();
          const isAppLevelForTraveler1 = !travelerId && isTraveler1Missing;

          // Check if this passport field is requested in resubmission
          // requestedFieldIdsFromRequests contains numbers, but passport field IDs are strings
          const isPassportFieldRequested = requestedFieldIdsFromRequests.some(
            (id) => String(id) === String(fieldDef.key)
          );

          // Show passport fields only if:
          // 1. We should restrict fields (user filling form) AND this field is requested, OR
          // 2. We should NOT restrict fields (admin viewing) AND (field has response OR is missing OR is app-level for traveler 1)
          let shouldShowPassportField = false;
          if (shouldRestrictFields) {
            // During resubmission (user filling form): only show if requested
            shouldShowPassportField = isPassportFieldRequested;
          } else {
            // Not restricting (admin viewing): show if has response, is missing, or is app-level for traveler 1
            shouldShowPassportField = existsInFieldResponses || isMissing || isAppLevelForTraveler1;
          }

          if (shouldShowPassportField) {
            console.log(`✅ [PASSPORT FIELD] Adding ${fieldDef.key} to response. existsInFieldResponses: ${!!existsInFieldResponses}, isMissing: ${isMissing}, isAppLevelForTraveler1: ${isAppLevelForTraveler1}`);
            const response = existsInFieldResponses && fieldResponses
              ? fieldResponses[fieldDef.key]
              : null;

            let fieldValue: string | null = null;
            let submittedAt: Date | null = null;

            // Priority 1: Use value from fieldResponses if it exists (user submitted via additional info form)
            if (response && response.value !== undefined && response.value !== '' && response.value !== null) {
              fieldValue = String(response.value); // Convert to string
              submittedAt = response.submittedAt || null;

              // For Schengen visa, convert "true"/"false" to "yes"/"no" if needed
              if (fieldDef.key === '_has_schengen_visa') {
                if (fieldValue === 'true' || fieldValue.toLowerCase() === 'true') {
                  fieldValue = 'yes';
                } else if (fieldValue === 'false' || fieldValue.toLowerCase() === 'false') {
                  fieldValue = 'no';
                }
              }
            }
            // Priority 2: Use actual passport field value if available (from initial submission)
            else if (!existsInFieldResponses || !response?.value) {
              if (fieldDef.key === '_passport_number' && traveler.passportNumber) {
                fieldValue = traveler.passportNumber;
              } else if (fieldDef.key === '_passport_expiry_date' && traveler.passportExpiryDate) {
                fieldValue = traveler.passportExpiryDate instanceof Date
                  ? traveler.passportExpiryDate.toISOString().split('T')[0]
                  : (traveler.passportExpiryDate as any)?.toString() || null;
              } else if (fieldDef.key === '_residence_country' && traveler.residenceCountry) {
                fieldValue = traveler.residenceCountry;
              } else if (fieldDef.key === '_has_schengen_visa') {
                // Convert boolean to "yes"/"no" for dropdown
                fieldValue = traveler.hasSchengenVisa !== null && traveler.hasSchengenVisa !== undefined
                  ? (traveler.hasSchengenVisa ? 'yes' : 'no')
                  : null;
              }
            }

            combinedFields.push({
              id: fieldDef.key, // Use the key as ID for passport fields
              question: fieldDef.question, // Backend key for identification
              questionText: fieldDef.questionText || fieldDef.question, // Display text
              fieldType: fieldDef.fieldType,
              displayOrder: fieldDef.displayOrder,
              // ✅ Explicitly set options to null for text fields, or use fieldDef.options for dropdown fields
              options: fieldDef.fieldType === 'dropdown' ? (fieldDef.options || null) : null,
              isActive: true,
              isRequired: true,
              response: fieldValue
                ? {
                  value: fieldValue,
                  filePath: response?.filePath || null,
                  fileName: response?.fileName || null,
                  fileSize: response?.fileSize || null,
                  submittedAt: submittedAt || response?.submittedAt || null,
                }
                : null,
              editable: true,
              source: 'passport', // Mark as passport field
              hasResponse: !!fieldValue, // Indicate if this field has a response
            });
          }
        });
      }

      // Remove duplicates based on field ID (for both numeric IDs and passport field keys)
      const seenFieldIds = new Set<string | number>();
      const uniqueFields = combinedFields.filter((field) => {
        const fieldId = field.id;
        if (seenFieldIds.has(fieldId)) {
          return false; // Duplicate, skip it
        }
        seenFieldIds.add(fieldId);
        return true; // First occurrence, keep it
      });

      // Sort by displayOrder
      uniqueFields.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      // ✅ Include traveler information when travelerId is provided
      let travelerInfo: {
        id: number | null;
        firstName: string;
        lastName: string;
        fullName: string;
        email?: string;
        dateOfBirth?: Date;
        passportNationality?: string;
        passportNumber?: string;
        passportExpiryDate?: Date;
        residenceCountry?: string;
      } | null = null;

      if (travelerId && currentTraveler) {
        travelerInfo = {
          id: currentTraveler.id,
          firstName: currentTraveler.firstName,
          lastName: currentTraveler.lastName,
          fullName: `${currentTraveler.firstName} ${currentTraveler.lastName}`,
          email: currentTraveler.email || undefined,
          dateOfBirth: currentTraveler.dateOfBirth,
          passportNationality: currentTraveler.passportNationality || undefined,
          passportNumber: currentTraveler.passportNumber || undefined,
          passportExpiryDate: currentTraveler.passportExpiryDate || undefined,
          residenceCountry: currentTraveler.residenceCountry || undefined,
        };
      } else if (!travelerId && application.customer) {
        // For application-level fields, try to find the first traveler (customer traveler) to get their actual name
        // ✅ Don't use customer.fullname (account username) - use traveler's actual name from Traveler record
        const firstTraveler = application.travelers?.find(
          (t) => {
            // Match by email (most reliable)
            if (t.email && application.customer?.email && t.email === application.customer.email) {
              return true;
            }
            // Or match by being the first traveler if numberOfTravelers = 1
            if (application.numberOfTravelers === 1) {
              return true;
            }
            // Or match by being the first traveler in the array
            if (application.travelers && application.travelers.indexOf(t) === 0) {
              return true;
            }
            return false;
          }
        );

        if (firstTraveler) {
          // ✅ Use traveler's actual name from Traveler record
          travelerInfo = {
            id: firstTraveler.id,
            firstName: firstTraveler.firstName,
            lastName: firstTraveler.lastName,
            fullName: `${firstTraveler.firstName} ${firstTraveler.lastName}`,
            email: firstTraveler.email || application.customer.email || undefined,
          };
        } else {
          // Fallback: if no traveler record found, use customer data but note this is a limitation
          travelerInfo = {
            id: null,
            firstName: '', // ✅ Don't use customer.fullname - we don't know the traveler's actual name
            lastName: '',
            fullName: '', // ✅ Empty - we can't determine traveler name without Traveler record
            email: application.customer.email || undefined,
          };
        }
      }

      // Log final result for debugging
      console.log('✅ [FIELDS RETURNED]', {
        applicationId,
        travelerId,
        travelerName: travelerInfo?.fullName || 'N/A',
        status: application.status,
        isResubmissionState,
        hasResubmissionRequests: !!application.resubmissionRequests,
        requestedFieldIdsCount: requestedFieldIdsFromRequests.length,
        combinedFieldsCount: combinedFields.length,
        uniqueFieldsCount: uniqueFields.length,
        resubmissionInfo: application.resubmissionRequests ? {
          totalRequests: application.resubmissionRequests.length,
          unfulfilledRequests: application.resubmissionRequests.filter(r => !r.fulfilledAt).length,
          relevantRequests: application.resubmissionRequests.filter((req) => {
            if (req.fulfilledAt) return false;
            if (travelerId) {
              return req.target === 'traveler' && req.travelerId === travelerId;
            } else {
              // For application-level context - match both application requests and traveler 1 requests (null travelerId)
              const isApplicationRequest = req.target === 'application';
              const isTraveler1Request = req.target === 'traveler' && (req.travelerId === null || req.travelerId === undefined) && isTraveler1Missing;
              return isApplicationRequest || isTraveler1Request;
            }
          }).map(r => ({
            id: r.id,
            target: r.target,
            travelerId: r.travelerId,
            fieldIdsCount: r.fieldIds.length,
            fieldIds: r.fieldIds,
          })),
        } : null,
      });

      return {
        status: true,
        message: travelerId
          ? 'Fields with traveler responses retrieved successfully'
          : 'Fields with application responses retrieved successfully',
        count: uniqueFields.length,
        data: uniqueFields,
        // ✅ Include traveler/customer information so frontend can display correct name
        traveler: travelerInfo,
        // Include resubmission info for frontend debugging
        resubmissionInfo: application.resubmissionRequests ? {
          isResubmissionState,
          hasUnfulfilledRequests: hasUnfulfilledRequests,
          relevantRequestsCount: application.resubmissionRequests.filter((req) => {
            if (req.fulfilledAt) return false;
            if (travelerId) {
              return req.target === 'traveler' && req.travelerId === travelerId;
            } else {
              // For application-level context - match both application requests and traveler 1 requests (null travelerId)
              const isApplicationRequest = req.target === 'application';
              const isTraveler1Request = req.target === 'traveler' && (req.travelerId === null || req.travelerId === undefined) && isTraveler1Missing;
              return isApplicationRequest || isTraveler1Request;
            }
          }).length,
          requestedFieldIds: requestedFieldIdsFromRequests,
        } : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error fetching fields with responses',
      );
    }
  }

  /**
   * Validate file upload against field constraints
   * Supports both product fields (positive IDs) and admin-requested fields (negative IDs)
   */
  async validateFileUpload(
    fieldId: number,
    file: Express.Multer.File,
    applicationId?: number,
  ): Promise<void> {
    // ✅ NEW: Check if this is an admin-requested field (negative ID)
    if (fieldId < 0 && applicationId) {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
      });

      if (!application) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      // Look for the field in adminRequestedFields
      const adminFields = application.adminRequestedFields || [];
      const field = adminFields.find((f: any) => f.id === fieldId);

      if (field) {
        if (field.fieldType !== 'upload') {
          throw new BadRequestException(
            `Field ${fieldId} is not an upload field`,
          );
        }

        if (field.isActive === false) {
          throw new BadRequestException(`Field ${fieldId} is not active`);
        }

        // Validate file type if specified
        if (field.allowedFileTypes && field.allowedFileTypes.length > 0) {
          const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
          const fileMimeType = file.mimetype.toLowerCase();

          // Normalize allowed types: handle both extensions ('pdf', 'jpg') and MIME types ('application/pdf', 'image/jpeg')
          const normalizedAllowedTypes = field.allowedFileTypes.map((type: string) => {
            const normalized = type.toLowerCase().trim();
            // If it's a MIME type, extract extension
            if (normalized.includes('/')) {
              // Map common MIME types to extensions
              const mimeToExt: Record<string, string> = {
                'application/pdf': 'pdf',
                'image/jpeg': 'jpg',
                'image/jpg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
              };
              return mimeToExt[normalized] || normalized.split('/')[1];
            }
            return normalized;
          });

          // Check if file extension or MIME type matches
          const extensionMatches = normalizedAllowedTypes.includes(fileExtension);
          const mimeMatches = field.allowedFileTypes.some((type: string) =>
            fileMimeType.includes(type.toLowerCase())
          );

          if (!extensionMatches && !mimeMatches) {
            throw new BadRequestException(
              `File type ${fileExtension || fileMimeType} is not allowed. Allowed types: ${field.allowedFileTypes.join(', ')}`,
            );
          }
        }

        // Validate file size if specified (convert MB to bytes)
        if (field.maxFileSizeMB) {
          const maxSizeBytes = field.maxFileSizeMB * 1024 * 1024;
          if (file.size > maxSizeBytes) {
            throw new BadRequestException(
              `File size exceeds maximum allowed size of ${field.maxFileSizeMB}MB`,
            );
          }
        }

        return; // Admin field found and validated
      }
    }

    // Check product fields (positive IDs or if no applicationId provided)
    // ✅ FIX: If applicationId is provided, validate against the specific application's visa product
    // This prevents finding the wrong field when the same field ID exists in multiple products
    if (applicationId && fieldId > 0) {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
        relations: ['visaProduct'],
      });

      if (!application) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      const fields = application.visaProduct.fields || [];
      const field = fields.find((f) => f.id === fieldId);

      if (field) {
        if (field.fieldType !== 'upload') {
          throw new BadRequestException(
            `Field ${fieldId} is not an upload field`,
          );
        }

        if (field.isActive === false) {
          throw new BadRequestException(`Field ${fieldId} is not active`);
        }

        // Validate file type if specified
        if (field.allowedFileTypes && field.allowedFileTypes.length > 0) {
          const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
          const fileMimeType = file.mimetype.toLowerCase();

          // Normalize allowed types: handle both extensions ('pdf', 'jpg') and MIME types ('application/pdf', 'image/jpeg')
          const normalizedAllowedTypes = field.allowedFileTypes.map((type: string) => {
            const normalized = type.toLowerCase().trim();
            // If it's a MIME type, extract extension
            if (normalized.includes('/')) {
              // Map common MIME types to extensions
              const mimeToExt: Record<string, string> = {
                'application/pdf': 'pdf',
                'image/jpeg': 'jpg',
                'image/jpg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
              };
              return mimeToExt[normalized] || normalized.split('/')[1];
            }
            return normalized;
          });

          // Check if file extension or MIME type matches
          const extensionMatches = normalizedAllowedTypes.includes(fileExtension);
          const mimeMatches = field.allowedFileTypes.some((type: string) =>
            fileMimeType.includes(type.toLowerCase())
          );

          if (!extensionMatches && !mimeMatches) {
            throw new BadRequestException(
              `File type ${fileExtension || fileMimeType} is not allowed. Allowed types: ${field.allowedFileTypes.join(', ')}`,
            );
          }
        }

        // Validate file size if specified (convert MB to bytes)
        if (field.maxFileSizeMB) {
          const maxSizeBytes = field.maxFileSizeMB * 1024 * 1024;
          if (file.size > maxSizeBytes) {
            throw new BadRequestException(
              `File size exceeds maximum allowed size of ${field.maxFileSizeMB}MB`,
            );
          }
        }

        return; // Product field found and validated
      }
    }

    // Fallback: Search all products (for backward compatibility when applicationId is not provided)
    const visaProducts = await this.visaProductRepo.find();

    for (const product of visaProducts) {
      const fields = product.fields || [];
      const field = fields.find((f) => f.id === fieldId);

      if (field) {
        if (field.fieldType !== 'upload') {
          throw new BadRequestException(
            `Field ${fieldId} is not an upload field`,
          );
        }

        if (field.isActive === false) {
          throw new BadRequestException(`Field ${fieldId} is not active`);
        }

        // Validate file type if specified
        if (field.allowedFileTypes && field.allowedFileTypes.length > 0) {
          const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
          const fileMimeType = file.mimetype.toLowerCase();

          // Normalize allowed types: handle both extensions ('pdf', 'jpg') and MIME types ('application/pdf', 'image/jpeg')
          const normalizedAllowedTypes = field.allowedFileTypes.map((type: string) => {
            const normalized = type.toLowerCase().trim();
            // If it's a MIME type, extract extension
            if (normalized.includes('/')) {
              // Map common MIME types to extensions
              const mimeToExt: Record<string, string> = {
                'application/pdf': 'pdf',
                'image/jpeg': 'jpg',
                'image/jpg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
              };
              return mimeToExt[normalized] || normalized.split('/')[1];
            }
            return normalized;
          });

          // Check if file extension or MIME type matches
          const extensionMatches = normalizedAllowedTypes.includes(fileExtension);
          const mimeMatches = field.allowedFileTypes.some((type: string) =>
            fileMimeType.includes(type.toLowerCase())
          );

          if (!extensionMatches && !mimeMatches) {
            throw new BadRequestException(
              `File type ${fileExtension || fileMimeType} is not allowed. Allowed types: ${field.allowedFileTypes.join(', ')}`,
            );
          }
        }

        // Validate file size if specified (convert MB to bytes)
        if (field.maxFileSizeMB) {
          const maxSizeBytes = field.maxFileSizeMB * 1024 * 1024;
          if (file.size > maxSizeBytes) {
            throw new BadRequestException(
              `File size exceeds maximum allowed size of ${field.maxFileSizeMB}MB`,
            );
          }
        }

        return; // Product field found and validated
      }
    }

    throw new NotFoundException(`Field with ID ${fieldId} not found`);
  }

  /**
   * Batch fetch fields for multiple visa products
   * Returns fields grouped by visaProductId
   */
  async batchGetFieldsByVisaProducts(
    batchDto: BatchGetFieldsDto,
  ): Promise<{
    status: boolean;
    message: string;
    data: Record<string, any[]>;
  }> {
    try {
      const fieldsByProduct: Record<string, any[]> = {};

      // Fetch all visa products in one query
      const visaProducts = await this.visaProductRepo.find({
        where: batchDto.visaProductIds.map((id) => ({ id })),
      });

      // Process each visa product
      for (const productId of batchDto.visaProductIds) {
        const product = visaProducts.find((p) => p.id === productId);

        if (!product) {
          // Product doesn't exist, return empty array
          fieldsByProduct[String(productId)] = [];
          continue;
        }

        // Initialize maxFieldId if not set
        await this.initializeMaxFieldId(product);

        let fields = product.fields || [];

        // Filter inactive fields
        fields = fields.filter((f: any) => f.isActive !== false);

        // Sort by displayOrder
        fields.sort((a: any, b: any) => {
          const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
          const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
          return orderA - orderB;
        });

        // Add visaProductId to each field for frontend convenience
        const fieldsWithProductId = fields.map((field: any) => ({
          ...field,
          visaProductId: productId,
        }));

        fieldsByProduct[String(productId)] = fieldsWithProductId;
      }

      return {
        status: true,
        message: 'Fields fetched successfully',
        data: fieldsByProduct,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error fetching fields in batch',
      );
    }
  }

  /**
   * Batch create/update fields for a visa product
   * If field has id, update it; if not, create new field
   */
  async batchSaveFields(
    batchDto: BatchSaveFieldsDto,
  ): Promise<{
    status: boolean;
    message: string;
    data: any[];
  }> {
    try {
      // Validate visa product exists
      const visaProduct = await this.visaProductRepo.findOne({
        where: { id: batchDto.visaProductId },
      });

      if (!visaProduct) {
        throw new NotFoundException(
          `Visa product with ID ${batchDto.visaProductId} not found`,
        );
      }

      // Initialize maxFieldId if not set
      await this.initializeMaxFieldId(visaProduct);

      let fields = visaProduct.fields || [];
      const savedFields: any[] = [];

      console.log('💾 Starting batch save for visaProductId:', batchDto.visaProductId);
      console.log('💾 Fields to save:', batchDto.fields.map((f: any) => ({
        id: f.id,
        question: f.question,
        displayOrder: f.displayOrder,
        fieldType: f.fieldType,
      })));

      // Use transaction for atomicity
      await this.dataSource.transaction(async (manager) => {
        const productRepo = manager.getRepository(VisaProduct);
        const product = await productRepo.findOne({
          where: { id: batchDto.visaProductId },
        });

        if (!product) {
          throw new NotFoundException(
            `Visa product with ID ${batchDto.visaProductId} not found`,
          );
        }

        console.log('💾 Current product fields before save:', product.fields?.length || 0);

        let currentFields = product.fields || [];
        let currentMaxFieldId = product.maxFieldId || 0;

        // Check if all fields are new (no IDs) - if so, replace all fields
        const allFieldsAreNew = batchDto.fields.every((f: any) => !f.id);
        if (allFieldsAreNew && batchDto.fields.length > 0) {
          console.log('💾 All fields are new, replacing all existing fields');
          currentFields = []; // Clear existing fields
        }

        // Process each field
        for (const fieldData of batchDto.fields) {
          if (fieldData.id) {
            // Update existing field
            const fieldIndex = currentFields.findIndex(
              (f: any) => f.id === fieldData.id,
            );

            if (fieldIndex === -1) {
              throw new NotFoundException(
                `Field with ID ${fieldData.id} not found`,
              );
            }

            // Update field
            const existingField = currentFields[fieldIndex];
            Object.assign(existingField, {
              ...fieldData,
              id: fieldData.id, // Preserve ID
              updatedAt: new Date(),
            });

            savedFields.push(existingField);
          } else {
            // Create new field
            const fieldsMaxId =
              currentFields.length > 0
                ? Math.max(...currentFields.map((f: any) => f.id || 0))
                : 0;
            const maxId = Math.max(currentMaxFieldId, fieldsMaxId);
            const newFieldId = maxId + 1;
            currentMaxFieldId = newFieldId;

            const newField = {
              id: newFieldId,
              fieldType: fieldData.fieldType,
              question: fieldData.question,
              placeholder: fieldData.placeholder,
              isRequired: fieldData.isRequired ?? false,
              displayOrder:
                fieldData.displayOrder !== undefined &&
                  fieldData.displayOrder !== null
                  ? Number(fieldData.displayOrder)
                  : currentFields.length,
              options: fieldData.options,
              allowedFileTypes: fieldData.allowedFileTypes,
              maxFileSizeMB: fieldData.maxFileSizeMB,
              minLength: fieldData.minLength,
              maxLength: fieldData.maxLength,
              isActive: fieldData.isActive ?? true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            currentFields.push(newField);
            savedFields.push(newField);
          }
        }

        // Sort by displayOrder
        currentFields.sort((a: any, b: any) => {
          const orderA =
            typeof a.displayOrder === 'number' ? a.displayOrder : 0;
          const orderB =
            typeof b.displayOrder === 'number' ? b.displayOrder : 0;
          return orderA - orderB;
        });

        // ⚠️ WORKAROUND: Detect if displayOrder values are backwards and fix them
        if (currentFields.length > 1) {
          const firstField = currentFields[0];
          const lastField = currentFields[currentFields.length - 1];
          const maxDisplayOrder = Math.max(
            ...currentFields.map((f: any) => f.displayOrder ?? 0),
          );

          if (
            firstField.displayOrder > lastField.displayOrder &&
            lastField.displayOrder === 0 &&
            firstField.displayOrder === maxDisplayOrder
          ) {
            console.log(
              '⚠️ Detected reversed displayOrder values in batch, fixing...',
            );
            currentFields.forEach((field: any) => {
              field.displayOrder = maxDisplayOrder - field.displayOrder;
            });
            currentFields.sort((a: any, b: any) => {
              const orderA =
                typeof a.displayOrder === 'number' ? a.displayOrder : 0;
              const orderB =
                typeof b.displayOrder === 'number' ? b.displayOrder : 0;
              return orderA - orderB;
            });
          }
        }

        // Update product
        product.fields = currentFields;
        product.maxFieldId = currentMaxFieldId;

        console.log('💾 Saving product with fields:', currentFields.map((f: any) => ({
          id: f.id,
          question: f.question,
          displayOrder: f.displayOrder,
        })));

        const savedProduct = await productRepo.save(product);
        console.log('✅ Product saved successfully, fields count:', savedProduct.fields?.length || 0);
      });

      // Fetch updated product to return fresh data
      const updatedProduct = await this.visaProductRepo.findOne({
        where: { id: batchDto.visaProductId },
      });

      console.log('💾 Fetched updated product, fields count:', updatedProduct?.fields?.length || 0);
      console.log('💾 Updated product fields:', updatedProduct?.fields?.map((f: any) => ({
        id: f.id,
        question: f.question,
        displayOrder: f.displayOrder,
      })));

      if (!updatedProduct) {
        throw new NotFoundException(
          `Visa product with ID ${batchDto.visaProductId} not found after save`,
        );
      }

      // Map saved fields with updated data
      const finalFields = savedFields.map((savedField) => {
        const updatedField = updatedProduct.fields?.find(
          (f: any) => f.id === savedField.id,
        );
        return updatedField || savedField;
      });

      // Add visaProductId to each field
      const fieldsWithProductId = finalFields.map((field: any) => ({
        ...field,
        visaProductId: batchDto.visaProductId,
      }));

      console.log('✅ Batch save completed, returning fields:', fieldsWithProductId.length);

      return {
        status: true,
        message: 'Fields saved successfully',
        data: fieldsWithProductId,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Error saving fields in batch',
      );
    }
  }
}