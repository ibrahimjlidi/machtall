import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({ orderBy: { nameAr: 'asc' } });
  }

  async create(input: SaveCategoryDto) {
    const names = this.normalizedNames(input);
    await this.ensureNamesAvailable(names.nameAr, names.nameFr);
    const slugBase = names.nameFr.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'category';
    try {
      return await this.prisma.category.create({
        data: {
          ...names,
          slug: `${slugBase}-${Date.now().toString(36)}`,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A category with these names already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: SaveCategoryDto) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Category not found');
    const names = this.normalizedNames(input);
    await this.ensureNamesAvailable(names.nameAr, names.nameFr, id);
    return this.prisma.category.update({ where: { id }, data: names });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category._count.products > 0) {
      throw new ConflictException('Reassign all products in this category before deleting it');
    }
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  private normalizedNames(input: SaveCategoryDto) {
    return { nameAr: input.nameAr.trim(), nameFr: input.nameFr.trim() };
  }

  private async ensureNamesAvailable(nameAr: string, nameFr: string, exceptId?: string) {
    const existing = await this.prisma.category.findFirst({
      where: {
        ...(exceptId && { id: { not: exceptId } }),
        OR: [{ nameAr: { equals: nameAr, mode: 'insensitive' } }, { nameFr: { equals: nameFr, mode: 'insensitive' } }],
      },
    });
    if (existing) throw new ConflictException('A category with these names already exists');
  }
}
