import { UserRole, PaymentMethod, PaymentStatus, SalePaymentStatus } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ProductFilters extends PaginationParams {
  search?: string;
  company?: string;
  size?: string;
  finish_type?: string;
  color?: string;
  thickness?: number;
  grade?: string;
  category?: string;
  stock_status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  min_price?: number;
  max_price?: number;
  sort_by?: 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc' | 'recent';
}

export interface CreateSaleItemInput {
  product_id: string;
  quantity: number;
  unit_type: 'boxes' | 'pieces';
  selling_price_per_box?: number;
  selling_price_per_piece?: number;
}

export interface CreateSaleInput {
  customer: {
    id?: string;
    name?: string;
    phone?: string;
  };
  sale_date: string;
  discount_amount?: number;
  discount_percentage?: number;
  payment_method: PaymentMethod;
  payment_status: SalePaymentStatus;
  payment_amount?: number;
  notes?: string;
  items: CreateSaleItemInput[];
}

export interface CreatePurchaseItemInput {
  product_id: string;
  quantity: number;
  unit_type: 'boxes' | 'pieces';
  purchase_price_per_box: number;
}

export interface CreatePurchaseInput {
  supplier_id: string;
  invoice_number: string;
  invoice_date: string;
  purchase_date: string;
  payment_status: PaymentStatus;
  payment_amount?: number;
  notes?: string;
  items: CreatePurchaseItemInput[];
}
