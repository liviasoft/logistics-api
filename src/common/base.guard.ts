import { PrismaService } from '../datasources/prisma/prisma.service';

export abstract class BaseGuard {
  async getFeatureFlags(names: string[], prisma: PrismaService) {
    const ffmap: {
      [key: string]: {
        enabled: boolean;
        id: string;
        name: string;
        errorMessage?: string;
      };
    } = {};
    const ffs = await prisma.featureFlag.findMany({
      where: { name: { in: names, mode: 'insensitive' } },
      select: { enabled: true, name: true, id: true, errorMessage: true },
    });
    ffs.forEach((ff) => {
      const { name, id, enabled, errorMessage } = ff;
      ffmap[name] = { id, name, enabled, errorMessage };
    });
    return ffmap;
  }
}
