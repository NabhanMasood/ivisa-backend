import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { VisaProduct } from './entities/visa-product.entity';
import { VisaApplication } from '../visa-applications/entities/visa-application.entity';
import { Traveler } from '../travelers/entities/traveler.entity';
import { CreateVisaProductFieldDto } from './dto/create-visa-product-field.dto';
import { UpdateVisaProductFieldDto } from './dto/update-visa-product-field.dto';
import { SubmitFieldResponseDto } from './dto/submit-field-response.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class VisaProductFieldsService {
  constructor(
    @InjectRepository(VisaProduct)
    private visaProductRepo: Repository<VisaProduct>,
    @InjectRepository(VisaApplication)
    private applicationRepo: Repository<VisaApplication>,
    @InjectRepository(Traveler)
    private travelerRepo: Repository<Traveler>,
    private emailService: EmailService,
    private configService: ConfigService,
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
      const newField = {
        id: newFieldId,
        fieldType: createDto.fieldType,
        question: createDto.question,
        placeholder: createDto.placeholder,
        isRequired: createDto.isRequired ?? false,
        displayOrder: createDto.displayOrder ?? fields.length,
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

      // Update visa product
      visaProduct.fields = fields;
      await this.visaProductRepo.save(visaProduct);

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
      fields.sort((a, b) => a.displayOrder - b.displayOrder);

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


      // Create field map for quick lookup (support both number and string keys)
      const fieldMap = new Map<number | string, any>();
      // Map product fields
      activeProductFields.forEach((f) => {
        fieldMap.set(f.id, f);
        fieldMap.set(String(f.id), f); // Also support string keys
      });
      // Map admin fields (negative IDs)
      adminFieldsForContext.forEach((f: any) => {
        fieldMap.set(f.id, f);
        fieldMap.set(String(f.id), f);
      });


      // ✅ NEW: Determine allowed field IDs from resubmissionRequests (Option B)
      let allowedIdsFromRequests: number[] = [];
      if (application.status === 'resubmission' && application.resubmissionRequests) {
        const relevantRequests = application.resubmissionRequests.filter((req) => {
          if (req.fulfilledAt) return false; // Skip fulfilled requests


          if (submittedTravelerId) {
            // For traveler submissions
            return req.target === 'traveler' && req.travelerId === submittedTravelerId;
          } else {
            // For application submissions
            return req.target === 'application';
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


      // Validate all provided field IDs exist
      const invalidFieldIds: number[] = [];
      for (const response of submitDto.responses) {
        const field = fieldMap.get(response.fieldId) || fieldMap.get(String(response.fieldId));
        if (!field) {
          invalidFieldIds.push(response.fieldId);
        }
      }


      if (invalidFieldIds.length > 0) {
        throw new BadRequestException(
          `Invalid field IDs provided: ${invalidFieldIds.join(', ')}. ` +
          `These fields do not exist or are not active for this visa product/application. ` +
          `Please use the actual field.id values from the API (positive for product fields, negative for admin-requested fields), not array indices.`,
        );
      }


      // Filter out non-requested fields (when a restriction exists)
      if (allowedIds.length > 0) {
        submitDto.responses = submitDto.responses.filter((r) =>
          allowedIds.includes(r.fieldId),
        );
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
        const field = fieldMap.get(response.fieldId) || fieldMap.get(String(response.fieldId));


        if (field.fieldType === 'upload') {
          if (!response.filePath) {
            throw new BadRequestException(
              `File path is required for upload field: ${field.question}`,
            );
          }
        } else {
          if (!response.value) {
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
      const responses: Record<string, any> = {};
      for (const response of submitDto.responses) {
        const fieldIdKey = String(response.fieldId);
        responses[fieldIdKey] = {
          value: response.value,
          filePath: response.filePath,
          fileName: response.fileName,
          fileSize: response.fileSize,
          submittedAt: new Date(),
        };
      }


      // Store responses in the appropriate location
      if (submittedTravelerId) {
        // TRAVELER SUBMISSION
        const traveler = await this.travelerRepo.findOne({
          where: { id: submittedTravelerId, applicationId: submitDto.applicationId },
        });


        if (!traveler) {
          throw new NotFoundException(
            `Traveler with ID ${submittedTravelerId} not found for this application`,
          );
        }


        // Validate resubmission target (backward compatibility)
        if (
          (application.status === 'resubmission' ||
            application.status === 'Additional Info required') &&
          application.resubmissionTarget === 'traveler' &&
          application.resubmissionTravelerId &&
          application.resubmissionTravelerId !== submittedTravelerId
        ) {
          throw new BadRequestException(
            `Resubmission is requested for traveler ID ${application.resubmissionTravelerId}. Please submit responses for that traveler.`,
          );
        }


        // Initialize and merge responses
        if (!traveler.fieldResponses) {
          traveler.fieldResponses = {};
        }
        traveler.fieldResponses = { ...traveler.fieldResponses, ...responses };
        traveler.notes = null as any;
        await this.travelerRepo.save(traveler);


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
          const submittedFieldIds = Object.keys(responses).map(id => Number(id));
          let anyRequestFulfilled = false;


          // Find and mark fulfilled requests for this traveler
          for (const request of updatedApplication.resubmissionRequests) {
            if (request.fulfilledAt) continue; // Skip already fulfilled


            if (request.target === 'traveler' && request.travelerId === submittedTravelerId) {
              // Check if all requested fields were submitted
              const allFieldsSubmitted = request.fieldIds.every(fieldId =>
                submittedFieldIds.includes(fieldId)
              );


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


        // Validate resubmission target (backward compatibility)
        if (
          (application.status === 'resubmission' ||
            application.status === 'Additional Info required') &&
          application.resubmissionTarget === 'traveler' &&
          application.resubmissionTravelerId
        ) {
          throw new BadRequestException(
            `Resubmission is requested for traveler ID ${application.resubmissionTravelerId}. Please submit traveler-specific responses.`,
          );
        }


        // Initialize and merge responses
        if (!application.fieldResponses) {
          application.fieldResponses = {};
        }
        application.fieldResponses = { ...application.fieldResponses, ...responses };


        // ✅ NEW: Check and fulfill resubmission requests (Option B)
        if (application.status === 'resubmission' && application.resubmissionRequests) {
          const submittedFieldIds = Object.keys(responses).map(id => Number(id));


          // Find and mark fulfilled requests for application
          for (const request of application.resubmissionRequests) {
            if (request.fulfilledAt) continue;


            if (request.target === 'application') {
              const allFieldsSubmitted = request.fieldIds.every(fieldId =>
                submittedFieldIds.includes(fieldId)
              );


              if (allFieldsSubmitted) {
                request.fulfilledAt = new Date().toISOString();
                console.log(`✅ Resubmission request ${request.id} fulfilled for application`);
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


      return {
        status: true,
        message: submitDto.travelerId
          ? 'Traveler field responses submitted successfully'
          : 'Application field responses submitted successfully',
        count: Object.keys(responses).length,
        data: responses,
      };
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
  async getFieldsWithResponses(applicationId: number, travelerId?: number) {
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
      const adminFieldsForContext = adminFieldsAll.filter((f: any) => {
        // For traveler context, include fields targeted to this traveler
        if (travelerId) {
          return f.travelerId === travelerId;
        }
        // For application-level context, include fields without travelerId
        return !f.travelerId;
      });


      // Get all active product fields for this visa product
      const productFields = (application.visaProduct.fields || []).filter(
        (f) => f.isActive !== false,
      );


      // Get existing responses
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


      // Helper: determine resubmission state
      const isResubmissionState = application.status === 'resubmission';


      // ✅ NEW: Get field IDs from resubmission requests (Option B - supports both product and admin fields)
      let requestedFieldIdsFromRequests: number[] = [];
      if (isResubmissionState && application.resubmissionRequests) {
        const relevantRequests = application.resubmissionRequests.filter((req) => {
          if (req.fulfilledAt) return false; // Skip fulfilled requests

          if (travelerId) {
            // For traveler context
            return req.target === 'traveler' && req.travelerId === travelerId;
          } else {
            // For application context
            return req.target === 'application';
          }
        });

        // Collect all field IDs from relevant requests (includes both positive and negative IDs)
        relevantRequests.forEach((req) => {
          requestedFieldIdsFromRequests.push(...req.fieldIds);
        });
      }

      // ✅ NEW LOGIC: Build combined fields from both product fields and admin fields
      // During resubmission, only show fields that are in the resubmission request
      let combinedFields: any[] = [];

      // 1. Add product fields (positive IDs)
      if (requestedFieldIdsFromRequests.length > 0) {
        // During resubmission: only show requested product fields
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
            editable: true, // Requested fields are always editable
            source: 'product',
          };
        }));
      } else if (!isResubmissionState) {
        // Not in resubmission: show all product fields
        combinedFields.push(...productFields.map((field) => {
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
        }));
      }

      // 2. Add admin fields (negative IDs)
      if (requestedFieldIdsFromRequests.length > 0) {
        // During resubmission: only show requested admin fields
        const requestedAdminFields = adminFieldsForContext.filter((field: any) =>
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
            editable: true, // Requested fields are always editable
            source: 'admin',
          };
        }));
      } else if (!isResubmissionState) {
        // Not in resubmission: show all product fields
        combinedFields.push(...productFields.map((field) => {
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
        }));
      }

      // 2. Add admin fields (negative IDs)
      if (requestedFieldIdsFromRequests.length > 0) {
        // During resubmission: only show requested admin fields
        const requestedAdminFields = adminFieldsForContext.filter((field: any) =>
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
            editable: true, // Requested fields are always editable
            source: 'admin',
          };
        }));
      } else if (adminFieldsForContext.length > 0 && !isResubmissionState) {
        // Not in resubmission but admin fields exist: show all admin fields
        combinedFields.push(...adminFieldsForContext.map((field: any) => {
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
          };
        }));
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
          // Show only requested product fields
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
        }
      }

      // Sort by displayOrder
      combinedFields.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      return {
        status: true,
        message: travelerId
          ? 'Fields with traveler responses retrieved successfully'
          : 'Fields with application responses retrieved successfully',
        count: combinedFields.length,
        data: combinedFields,
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
}