import { AppError } from "@/middlewares/errorHandler.js";
import type { CreateProductDto, Product, UpdateProductDto } from "./product.model.js";

// ─── In-Memory Store (Replace with your Database) ────────────────────────────
//
// 🔌 Prisma examples:
//   await prisma.product.findMany()
//   await prisma.product.findUniqueOrThrow({ where: { id } })
//   await prisma.product.create({ data })
//   await prisma.product.update({ where: { id }, data })
//   await prisma.product.delete({ where: { id } })
//
const products: Product[] = [
  {
    id: "1",
    name: "TypeScript Handbook",
    description: "The official TypeScript handbook — a great starting point.",
    price: 29.99,
    stock: 100,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    name: "Node.js Masterclass",
    description: "A comprehensive guide to Node.js for backend developers.",
    price: 49.99,
    stock: 50,
    createdAt: new Date("2024-03-15"),
    updatedAt: new Date("2024-03-15"),
  },
];

// ─── Service Functions ────────────────────────────────────────────────────────

export const getAllProducts = async (): Promise<Product[]> => {
  // 🔌 Replace with: return await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return products;
};

export const getProductById = async (id: string): Promise<Product> => {
  // 🔌 Replace with: return await prisma.product.findUniqueOrThrow({ where: { id } });
  const product = products.find((p) => p.id === id);
  if (!product) throw new AppError("Product not found", 404);
  return product;
};

export const createProduct = async (dto: CreateProductDto): Promise<Product> => {
  const newProduct: Product = {
    id: crypto.randomUUID(),
    ...dto,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  // 🔌 Replace with: return await prisma.product.create({ data: dto });
  products.push(newProduct);
  return newProduct;
};

export const updateProduct = async (id: string, dto: UpdateProductDto): Promise<Product> => {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new AppError("Product not found", 404);
  // 🔌 Replace with: return await prisma.product.update({ where: { id }, data: dto });
  products[index] = { ...products[index], ...dto, updatedAt: new Date() };
  return products[index];
};

export const deleteProduct = async (id: string): Promise<void> => {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new AppError("Product not found", 404);
  // 🔌 Replace with: await prisma.product.delete({ where: { id } });
  products.splice(index, 1);
};
