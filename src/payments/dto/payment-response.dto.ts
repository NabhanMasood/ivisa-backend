export class PaymentResponseDto {
    id: number;
    applicationId: number;
    applicationNumber?: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    transactionId?: string;
    paymentGateway?: string;
    cardholderName?: string;
    cardLast4?: string;
    cardBrand?: string;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export class PaymentIntentResponseDto {
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: string;
    applicationId: number;
  }
  
  export class PaymentSummaryDto {
    totalPayments: number;
    completedPayments: number;
    pendingPayments: number;
    failedPayments: number;
    totalAmount: number;
    completedAmount: number;
  }