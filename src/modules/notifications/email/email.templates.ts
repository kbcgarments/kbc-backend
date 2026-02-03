import { EmailEvent } from './email.types';

export const EMAIL_TEMPLATE_MAP: Record<EmailEvent, number> = {
  [EmailEvent.ACCOUNT_CREATED_VERIFY_EMAIL]: 1,
  [EmailEvent.PASSWORD_RESET_REQUESTED]: 2,
  [EmailEvent.PASSWORD_CHANGED_CONFIRMATION]: 3,

  [EmailEvent.ORDER_CONFIRMED_CUSTOMER]: 4,
  [EmailEvent.ORDER_CONFIRMED_ADMIN]: 5,
  [EmailEvent.PAYMENT_FAILED]: 6,

  [EmailEvent.ORDER_DELIVERED]: 10,
  [EmailEvent.ORDER_CANCELLED_CUSTOMER]: 13,
  [EmailEvent.ORDER_CANCELLED_ADMIN]: 14,
  [EmailEvent.REFUND_COMPLETED]: 15,

  [EmailEvent.LOW_STOCK_ALERT]: 16,
  [EmailEvent.OUT_OF_STOCK_ALERT]: 17,
};
