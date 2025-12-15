export class ApplicationResponseDto {
    id: number;
    applicationNumber: string;
    customerId: number;
    customerName?: string;
    nationality: string;
    destinationCountry: string;
    visaType: string;
    visaProductName?: string;
    numberOfTravelers: number;
    processingType?: string;
    processingFee: number;
    governmentFee: number;
    serviceFee: number;
    totalAmount: number;
    status: string;
    submittedAt?: Date;
    approvedAt?: Date;
    rejectionReason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export class ApplicationListResponseDto {
    id: number;
    applicationNumber: string;
    customerName: string;
    destinationCountry: string;
    visaType: string;
    numberOfTravelers: number;
    totalAmount: number;
    status: string;
    createdAt: string;
  }
  
  export class ApplicationSummaryDto {
    totalApplications: number;
    draftApplications: number;
    submittedApplications: number;
    processingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
  }