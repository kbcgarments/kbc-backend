import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}
  private async resolveCart(deviceId?: string, customerId?: string) {
    if (customerId) {
      let cart = await this.prisma.cart.findFirst({
        where: { customerId },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { customerId },
        });
      }

      return cart;
    }

    if (!deviceId) {
      throw new BadRequestException('deviceId is required');
    }

    let cart = await this.prisma.cart.findFirst({
      where: { deviceId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { deviceId },
      });
    }

    return cart;
  }
  private async resolveCartTx(
    tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
    >,
    deviceId?: string,
    customerId?: string,
  ) {
    if (customerId) {
      let cart = await tx.cart.findFirst({ where: { customerId } });

      if (!cart) {
        cart = await tx.cart.create({ data: { customerId } });
      }

      return cart;
    }

    if (!deviceId) {
      throw new BadRequestException('deviceId is required');
    }

    let cart = await tx.cart.findFirst({ where: { deviceId } });

    if (!cart) {
      cart = await tx.cart.create({ data: { deviceId } });
    }

    return cart;
  }
  /* ======================================================
     INIT CART (GUEST ONLY)
     - Ensures device cart exists
  ====================================================== */
  async initCart(deviceId: string) {
    if (!deviceId) {
      throw new BadRequestException('deviceId is required');
    }

    let cart = await this.prisma.cart.findUnique({
      where: { deviceId },
      include: {
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { deviceId },
        include: {
          items: {
            include: {
              product: { include: { images: true } },
              variant: true,
            },
          },
        },
      });
    }

    return cart;
  }

  /* ======================================================
     GET CART
     RULE:
     - customerId → customer cart ONLY
     - else deviceId → device cart ONLY
  ====================================================== */
  async getCart(deviceId?: string, customerId?: string) {
    const cart = await this.resolveCart(deviceId, customerId);

    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: { include: { images: true } },
            variant: { include: { color: true, size: true } },
          },
        },
      },
    });
  }

  /* ======================================================
   ADD TO CART + REMOVE FROM WISHLIST (ATOMIC)
====================================================== */
  async addItem(dto: AddItemDto, deviceId?: string, customerId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const cart = await this.resolveCartTx(tx, deviceId, customerId);

      const variant = await tx.productVariant.findUnique({
        where: { id: dto.variantId },
      });
      if (!variant) throw new NotFoundException('Variant not found');

      if (dto.quantity > variant.stock) {
        throw new BadRequestException(`Only ${variant.stock} left in stock`);
      }

      const existing = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId,
        },
      });
      const newQty = (existing?.quantity ?? 0) + dto.quantity;
      if (newQty > variant.stock) {
        throw new BadRequestException(`Only ${variant.stock} left in stock`);
      }
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            variantId: dto.variantId,
            quantity: dto.quantity,
          },
        });
      }

      const wishlist = await tx.wishlist.findFirst({
        where: customerId ? { customerId } : { deviceId },
      });

      if (wishlist) {
        await tx.wishlistItem.deleteMany({
          where: {
            wishlistId: wishlist.id,
            productId: dto.productId,
          },
        });
      }
    });

    return this.getCart(deviceId, customerId);
  }

  /* ======================================================
     UPDATE QUANTITY
  ====================================================== */
  async updateItem(itemId: string, dto: UpdateItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        variant: true,
      },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    if (dto.quantity > item.variant.stock) {
      throw new BadRequestException(`Only ${item.variant.stock} left in stock`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(
      item.cart.deviceId ?? undefined,
      item.cart.customerId ?? undefined,
    );
  }

  /* ======================================================
     REMOVE ITEM
  ====================================================== */
  async removeItem(itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item) throw new NotFoundException('Item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(
      item.cart.deviceId ?? undefined,
      item.cart.customerId ?? undefined,
    );
  }

  /* ======================================================
     MERGE CART (ON LOGIN)
     - guest → customer
     - device cart destroyed
  ====================================================== */
  async mergeCart(
    prisma: PrismaService,
    deviceId: string | undefined,
    customerId: string,
  ) {
    if (!deviceId) return;

    await prisma.$transaction(async (tx) => {
      const guestCart = await tx.cart.findUnique({
        where: { deviceId },
        include: { items: true },
      });

      if (!guestCart) return;

      let customerCart = await tx.cart.findFirst({
        where: { customerId },
      });

      if (!customerCart) {
        customerCart = await tx.cart.create({
          data: { customerId },
        });
      }

      for (const item of guestCart.items) {
        const existing = await tx.cartItem.findFirst({
          where: {
            cartId: customerCart.id,
            productId: item.productId,
            variantId: item.variantId,
          },
        });

        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + item.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: customerCart.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            },
          });
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } });
      await tx.cart.delete({ where: { id: guestCart.id } });
    });
  }
  /* ======================================================
   CLEAR CART
====================================================== */
  async clearCart(deviceId?: string, customerId?: string) {
    const cart = await this.resolveCart(deviceId, customerId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(deviceId, customerId);
  }
}
