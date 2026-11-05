import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CashLedgerEntryType, CashSession, Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';

export async function openSessionForCash(
  tx: Prisma.TransactionClient,
  user: AuthUser,
  requestedSessionId?: string,
  requireExplicit = false,
): Promise<Pick<CashSession, 'id' | 'userId'>> {
  if (requireExplicit && !requestedSessionId) {
    throw new BadRequestException('Select an open cashier session for this cash payment');
  }
  const session = await tx.cashSession.findFirst({
    where: requestedSessionId
      ? { id: requestedSessionId, closedAt: null }
      : { userId: user.sub, closedAt: null },
    select: { id: true, userId: true },
  });
  if (!session) throw new ConflictException('Open a cash session before recording this cash transaction');

  await tx.$queryRaw`SELECT "id" FROM "CashSession" WHERE "id" = ${session.id} FOR UPDATE`;
  const lockedSession = await tx.cashSession.findUnique({
    where: { id: session.id },
    select: { id: true, userId: true, closedAt: true },
  });
  if (!lockedSession || lockedSession.closedAt) {
    throw new ConflictException('The selected cash session is closed');
  }
  if (user.role === UserRole.SELLER && lockedSession.userId !== user.sub) {
    throw new ForbiddenException('You can only use your own cash session');
  }
  return { id: lockedSession.id, userId: lockedSession.userId };
}

export function expectedCashForSession(session: {
  openingFloat: Prisma.Decimal;
  entries: { type: CashLedgerEntryType; amount: Prisma.Decimal }[];
}) {
  return session.entries.reduce((expected, entry) => {
    const amount = new Prisma.Decimal(entry.amount);
    return expected.plus(
      entry.type === CashLedgerEntryType.REFUND
        || entry.type === CashLedgerEntryType.SUPPLIER_PAYMENT
        || entry.type === CashLedgerEntryType.EXPENSE_PAYMENT
        ? amount.negated()
        : amount,
    );
  }, new Prisma.Decimal(session.openingFloat));
}

export async function assertCashPaymentAvailable(
  tx: Prisma.TransactionClient,
  sessionId: string,
  amount: Prisma.Decimal,
) {
  const session = await tx.cashSession.findUnique({
    where: { id: sessionId },
    include: { entries: { select: { type: true, amount: true } } },
  });
  if (!session || session.closedAt) throw new ConflictException('The selected cash session is closed');
  const expected = expectedCashForSession(session);
  if (amount.greaterThan(expected)) {
    throw new BadRequestException(`Cash payment exceeds the available drawer balance of ${expected.toFixed(3)}`);
  }
}
