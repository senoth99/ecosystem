export type EcoApp = {
  slug: string;
  title: string;
  path: string;
  enabled: boolean;
  canView: boolean;
  canManage: boolean;
  extras: Record<string, boolean>;
};

export type MeResponse = {
  user: {
    userId: string;
    telegramId: string;
    telegramUsername: string;
    displayName: string;
    isSuperAdmin: boolean;
  };
  apps: EcoApp[];
};

export type AdminUser = {
  id: string;
  telegramId: string;
  telegramUsername: string | null;
  displayName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  permissions: {
    appSlug: string;
    enabled: boolean;
    canView: boolean;
    canManage: boolean;
    extras: unknown;
  }[];
};

export type EcosystemAppDef = {
  slug: string;
  title: string;
  description: string | null;
  path: string;
  sortOrder: number;
  hasManage: boolean;
  extraPerms: { key: string; label: string }[] | null;
};
