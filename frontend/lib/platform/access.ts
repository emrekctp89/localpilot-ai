import type { Business } from "@/lib/domain-types";

export type ProfileRole = "owner" | "agency" | "staff";
export type BusinessMemberRole = "owner" | "staff" | "read_only";

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string | null;
  role: BusinessMemberRole;
  invited_email: string | null;
  created_at?: string;
}

export interface BusinessAccess {
  role: BusinessMemberRole;
  profileRole: ProfileRole;
  canWrite: boolean;
  canManageTeam: boolean;
  canManageIntegrations: boolean;
  isAgencyAccount: boolean;
}

export function resolveBusinessAccess(
  userId: string,
  business: Business | null,
  memberRecord: BusinessMember | null | undefined,
  profileRole: ProfileRole = "owner",
): BusinessAccess {
  const isOwner = Boolean(business?.owner_id && business.owner_id === userId);
  const memberRole = memberRecord?.role;

  if (isOwner) {
    return {
      role: "owner",
      profileRole,
      canWrite: true,
      canManageTeam: true,
      canManageIntegrations: true,
      isAgencyAccount: profileRole === "agency",
    };
  }

  if (memberRole === "staff") {
    return {
      role: "staff",
      profileRole,
      canWrite: true,
      canManageTeam: false,
      canManageIntegrations: false,
      isAgencyAccount: false,
    };
  }

  if (memberRole === "read_only") {
    return {
      role: "read_only",
      profileRole,
      canWrite: false,
      canManageTeam: false,
      canManageIntegrations: false,
      isAgencyAccount: false,
    };
  }

  return {
    role: "read_only",
    profileRole,
    canWrite: false,
    canManageTeam: false,
    canManageIntegrations: false,
    isAgencyAccount: false,
  };
}

export function roleLabel(role: BusinessMemberRole, locale: "tr" | "en" = "tr"): string {
  const labels = {
    tr: {
      owner: "Sahip",
      staff: "Personel",
      read_only: "Salt okunur",
    },
    en: {
      owner: "Owner",
      staff: "Staff",
      read_only: "Read-only",
    },
  };
  return labels[locale][role];
}