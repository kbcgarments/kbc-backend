import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /* ======================================================
     RESOLVE WISHLIST
     - customerId → customer wishlist
     - else deviceId → device wishlist
  ====================================================== */
  private async resolveWishlist(deviceId?: string, customerId?: string) {
    if (customerId) {
      let wishlist = await this.prisma.wishlist.findFirst({
        where: { customerId },
      });

      if (!wishlist) {
        wishlist = await this.prisma.wishlist.create({
          data: { customerId },
        });
      }

      return wishlist;
    }

    if (!deviceId) {
      throw new BadRequestException('deviceId is required');
    }

    let wishlist = await this.prisma.wishlist.findFirst({
      where: { deviceId },
    });

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { deviceId },
      });
    }

    return wishlist;
  }

  /* ======================================================
     GET WISHLIST ITEMS
  ====================================================== */
  async getWishlist(deviceId?: string, customerId?: string) {
    const wishlist = await this.resolveWishlist(deviceId, customerId);

    const items = await this.prisma.wishlistItem.findMany({
      where: { wishlistId: wishlist.id },
      include: {
        product: {
          include: {
            images: true,
            variants: { include: { color: true, size: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ⬇️ IMPORTANT: flatten to Product[]
    return items.map((item) => item.product);
  }

  /* ======================================================
     TOGGLE ITEM
  ====================================================== */
  async toggle(productId: string, deviceId?: string, customerId?: string) {
    const wishlist = await this.resolveWishlist(deviceId, customerId);

    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });
    }

    // ⬇️ ALWAYS return Product[]
    return this.getWishlist(deviceId, customerId);
  }

  /* ======================================================
     REMOVE ITEM
  ====================================================== */
  async remove(productId: string, deviceId?: string, customerId?: string) {
    const wishlist = await this.resolveWishlist(deviceId, customerId);

    await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    return this.getWishlist(deviceId, customerId);
  }

  /* ======================================================
     MERGE WISHLIST (ON LOGIN)
  ====================================================== */
  async mergeWishlist(
    prisma: PrismaService,
    deviceId: string | undefined,
    customerId: string,
  ) {
    if (!deviceId) return;

    await prisma.$transaction(async (tx) => {
      const guestWishlist = await tx.wishlist.findFirst({
        where: { deviceId },
        include: { items: true },
      });

      if (!guestWishlist) return;

      let customerWishlist = await tx.wishlist.findFirst({
        where: { customerId },
      });

      if (!customerWishlist) {
        customerWishlist = await tx.wishlist.create({
          data: { customerId },
        });
      }

      for (const item of guestWishlist.items) {
        await tx.wishlistItem.upsert({
          where: {
            wishlistId_productId: {
              wishlistId: customerWishlist.id,
              productId: item.productId,
            },
          },
          update: {},
          create: {
            wishlistId: customerWishlist.id,
            productId: item.productId,
          },
        });
      }

      await tx.wishlistItem.deleteMany({
        where: { wishlistId: guestWishlist.id },
      });

      await tx.wishlist.delete({
        where: { id: guestWishlist.id },
      });
    });
  }

  /* ======================================================
   CLEAR WISHLIST
====================================================== */
  async clearWishlist(deviceId?: string, customerId?: string) {
    const wishlist = await this.resolveWishlist(deviceId, customerId);

    await this.prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id },
    });

    return [];
  }
}
