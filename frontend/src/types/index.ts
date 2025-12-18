export type UserRole = 'admin' | 'owner' | 'staff';
export type FinishType = 'Glossy' | 'Matt' | 'Semi-gloss' | 'Rustic' | 'Polished';
export type Grade = 'Premium' | 'Standard' | 'Economy';
export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Credit';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';
export type SalePaymentStatus = 'Paid' | 'Pending';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  size: string;
  company: string;
  finishType: FinishType;
  color?: string;
  thickness?: number;
  grade?: Grade;
  category?: string;
  application?: string;
  unitsPerBox: number;
  currentStockBoxes: number;
  minimumStockBoxes: number;
  purchasePricePerBox?: number;
  sellingPricePerBox?: number;
  sellingPricePerPiece?: number;
  imageUrl?: string;
  total_pieces?: number;
  is_low_stock?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  saleDate: string;
  subtotal: number;
  discountAmount: number;
  discountPercentage?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: SalePaymentStatus;
  paymentAmount: number;
  notes?: string;
  createdAt: string;
  createdById: string;
  items_count?: number;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productSku: string;
  productName: string;
  quantityBoxes: number;
  quantityPieces: number;
  unitsPerBox: number;
  sellingPricePerBox?: number;
  sellingPricePerPiece?: number;
  totalPrice: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  purchaseDate: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  notes?: string;
  createdAt: string;
  createdById: string;
  items_count?: number;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productSku: string;
  productName: string;
  quantityBoxes: number;
  quantityPieces: number;
  unitsPerBox: number;
  purchasePricePerBox: number;
  totalPrice: number;
}

export interface DashboardStats {
  today_sales: {
    total_revenue: number;
    transaction_count: number;
    pending_payments: number;
  };
  stock_overview: {
    total_products: number;
    in_stock_count: number;
    low_stock_count: number;
  };
  low_stock_alerts: Array<{
    product_id: string;
    name: string;
    sku: string;
    current_stock_boxes: number;
    total_pieces: number;
    minimum_stock_boxes: number;
  }>;
}

export interface FilterOptions {
  companies: string[];
  sizes: string[];
  finish_types: FinishType[];
  colors: string[];
  thicknesses: number[];
  grades: Grade[];
  categories: string[];
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
